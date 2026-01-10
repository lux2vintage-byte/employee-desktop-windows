import { PrismaClient, PayrollColumnMapping, SalaryParameter } from '@prisma/client'
import { SalaryParameterRepository } from '../repositories/SalaryParameterRepository'
import { PayrollColumnMappingRepository } from '../repositories/PayrollColumnMappingRepository'
import { PayrollRepository } from '../repositories/PayrollRepository'

/**
 * Vergi dilimi yapısı
 */
export interface TaxBracket {
  order: number
  lowerLimit: number
  upperLimit: number
  rate: number
}

/**
 * Hesaplama konteksti - formüllerde kullanılacak tüm değişkenler
 */
export interface CalculationContext {
  // Temel değerler
  base: number              // Brüt maaş
  gross: number             // Brüt toplam (maaş + eklemeler)
  net: number               // Net maaş (hesaplama sonunda güncellenir)
  
  // Süre değerleri
  monthDays: number         // Aylık gün sayısı
  monthHours: number        // Aylık saat sayısı
  dailyWage: number         // Günlük ücret
  hourlyWage: number        // Saatlik ücret
  
  // Vergi matrahları
  taxBase: number           // Bu dönemin vergi matrahı
  cumulativeBase: number    // Kümülatif vergi matrahı (yıl başından)
  
  // Fazla mesai
  normalOvertimeHours: number
  weekendOvertimeHours: number
  holidayOvertimeHours: number
  
  // Özel kesintiler
  advanceAmount: number     // Avans tutarı
  damageAmount: number      // Hasar tespit tutarı
  penaltyDays: number       // Yevmiye ceza günleri
  
  // Parametre değerleri (dinamik olarak doldurulur)
  parameters: Record<string, number>
  
  // Vergi dilimleri
  brackets: TaxBracket[]
  
  // Hesaplama sonuçları
  calculatedDeductions: Record<string, number>
  calculatedIncomes: Record<string, number>
}

/**
 * Hesaplama sonucu
 */
export interface CalculationResult {
  success: boolean
  columnCode: string
  columnName: string
  type: 'income' | 'deduction'
  amount: number
  calculationBase?: number
  rate?: number
  error?: string
}

/**
 * Bordro hesaplama sonucu
 */
export interface PayrollCalculationResult {
  baseSalary: number
  totalAdditions: number
  totalDeductions: number
  netSalary: number
  taxBase: number
  cumulativeTaxBase: number
  items: CalculationResult[]
  errors: string[]
  calculationDetails: Record<string, any>
}

/**
 * PayrollCalculationService - Bordro hesaplama motoru
 * Dinamik formüller ve parametreler kullanarak bordro hesaplaması yapar
 */
export class PayrollCalculationService {
  constructor(
    private salaryParameterRepository: SalaryParameterRepository,
    private columnMappingRepository: PayrollColumnMappingRepository,
    private payrollRepository: PayrollRepository
  ) {}

  /**
   * Bordro hesapla
   */
  async calculate(
    employeeId: number,
    periodMonth: number,
    periodYear: number,
    baseSalary: number,
    additions: { code: string; amount: number }[] = [],
    customDeductions: { code: string; amount: number }[] = []
  ): Promise<PayrollCalculationResult> {
    const errors: string[] = []
    const items: CalculationResult[] = []

    // 1. Parametreleri yükle
    const parameters = await this.loadParameters(periodYear, periodMonth)
    
    // 2. Sütun eşleştirmelerini yükle
    const mappings = await this.columnMappingRepository.findActive()
    
    // 3. Kümülatif matrahı hesapla (önceki aylardan)
    const cumulativeBase = await this.getCumulativeTaxBase(employeeId, periodMonth, periodYear)
    
    // 4. Hesaplama kontekstini oluştur
    const context = this.createContext(baseSalary, parameters, cumulativeBase, additions)
    
    // 5. Önce SGK kesintilerini hesapla (vergi matrahı için gerekli)
    const sgkDeductions = mappings.filter(m => 
      m.columnType === 'deduction' && 
      m.category === 'Insurance' &&
      m.isActive
    )
    
    for (const mapping of sgkDeductions) {
      const result = await this.calculateColumn(mapping, context, parameters)
      items.push(result)
      if (result.success) {
        context.calculatedDeductions[mapping.columnCode] = result.amount
        // SGK kesintilerini vergi matrahından düş
        if (mapping.columnCode === 'sgk_employee') {
          context.taxBase -= result.amount
        }
        if (mapping.columnCode === 'unemployment_employee') {
          context.taxBase -= result.amount
        }
      } else if (result.error) {
        errors.push(result.error)
      }
    }
    
    // 6. Kümülatif matrahı güncelle
    context.cumulativeBase = cumulativeBase + context.taxBase
    
    // 7. Vergi kesintilerini hesapla
    const taxDeductions = mappings.filter(m => 
      m.columnType === 'deduction' && 
      m.category === 'Tax' &&
      m.isActive
    )
    
    for (const mapping of taxDeductions) {
      const result = await this.calculateColumn(mapping, context, parameters)
      items.push(result)
      if (result.success) {
        context.calculatedDeductions[mapping.columnCode] = result.amount
      } else if (result.error) {
        errors.push(result.error)
      }
    }
    
    // 8. Diğer kesintileri hesapla
    const otherDeductions = mappings.filter(m => 
      m.columnType === 'deduction' && 
      !['Insurance', 'Tax'].includes(m.category || '') &&
      m.isActive
    )
    
    for (const mapping of otherDeductions) {
      // Özel kesinti tutarları varsa kontekste ekle
      const customDed = customDeductions.find(d => d.code === mapping.columnCode)
      if (customDed) {
        if (mapping.columnCode === 'advance_deduction') {
          context.advanceAmount = customDed.amount
        } else if (mapping.columnCode === 'damage_deduction') {
          context.damageAmount = customDed.amount
        }
      }
      
      const result = await this.calculateColumn(mapping, context, parameters)
      items.push(result)
      if (result.success) {
        context.calculatedDeductions[mapping.columnCode] = result.amount
      } else if (result.error) {
        errors.push(result.error)
      }
    }
    
    // 9. Gelirleri hesapla (fazla mesai vb.)
    const incomes = mappings.filter(m => m.columnType === 'income' && m.isActive)
    
    for (const mapping of incomes) {
      const result = await this.calculateColumn(mapping, context, parameters)
      items.push(result)
      if (result.success) {
        context.calculatedIncomes[mapping.columnCode] = result.amount
      } else if (result.error) {
        errors.push(result.error)
      }
    }
    
    // 10. Toplamları hesapla
    const totalDeductions = Object.values(context.calculatedDeductions).reduce((a, b) => a + b, 0)
    const totalAdditions = Object.values(context.calculatedIncomes).reduce((a, b) => a + b, 0)
    const netSalary = baseSalary + totalAdditions - totalDeductions

    return {
      baseSalary,
      totalAdditions,
      totalDeductions,
      netSalary,
      taxBase: context.taxBase,
      cumulativeTaxBase: context.cumulativeBase,
      items,
      errors,
      calculationDetails: {
        parameters: context.parameters,
        brackets: context.brackets,
        monthDays: context.monthDays,
        monthHours: context.monthHours
      }
    }
  }

  /**
   * Tek bir sütun için hesaplama yap
   */
  private async calculateColumn(
    mapping: PayrollColumnMapping,
    context: CalculationContext,
    parameters: Map<string, SalaryParameter[]>
  ): Promise<CalculationResult> {
    try {
      let amount = 0
      let calculationBase: number | undefined
      let rate: number | undefined

      const paramTypes = this.parseParameterTypes(mapping.parameterTypes)
      
      switch (mapping.formulaType) {
        case 'simple':
          // Basit formül: base * (rate / 100)
          const param = this.getParameterValue(paramTypes[0], parameters)
          if (param) {
            rate = param.percentageValue || param.parameterValue
            calculationBase = context.base
            amount = this.evaluateSimpleFormula(mapping.formula, context, rate)
          }
          break
          
        case 'bracket':
          // Dilimli hesaplama (gelir vergisi)
          const result = this.calculateBracketTax(context.taxBase, context.brackets, context.cumulativeBase)
          amount = result.tax
          calculationBase = context.taxBase
          break
          
        case 'custom':
          // Özel formüller
          amount = this.evaluateCustomFormula(mapping.formula, context)
          break
      }

      return {
        success: true,
        columnCode: mapping.columnCode,
        columnName: mapping.columnName,
        type: mapping.columnType as 'income' | 'deduction',
        amount: Math.round(amount * 100) / 100,
        calculationBase,
        rate
      }
    } catch (error) {
      return {
        success: false,
        columnCode: mapping.columnCode,
        columnName: mapping.columnName,
        type: mapping.columnType as 'income' | 'deduction',
        amount: 0,
        error: `${mapping.columnName} hesaplanırken hata: ${error}`
      }
    }
  }

  /**
   * Basit formül değerlendir
   */
  private evaluateSimpleFormula(formula: string, context: CalculationContext, rate: number): number {
    // Güvenli formül değerlendirmesi
    const variables: Record<string, number> = {
      base: context.base,
      gross: context.gross,
      net: context.net,
      rate: rate,
      dailyWage: context.dailyWage,
      hourlyWage: context.hourlyWage,
      taxBase: context.taxBase,
      netSalary: context.net,
      ...context.parameters
    }

    // Basit matematiksel ifadeleri değerlendir
    let result = formula
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key, 'g'), value.toString())
    }

    try {
      // Güvenli eval - sadece matematiksel işlemler
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${result})`)()
    } catch {
      return 0
    }
  }

  /**
   * Özel formül değerlendir
   */
  private evaluateCustomFormula(formula: string, context: CalculationContext): number {
    if (formula === 'advanceAmount') {
      return context.advanceAmount
    }
    if (formula === 'damageAmount') {
      return context.damageAmount
    }
    if (formula.includes('dailyWage') && formula.includes('penaltyDays')) {
      // Yevmiye cezası
      const multiplier = context.parameters['DailyPenaltyMultiplier'] || 1
      return context.dailyWage * multiplier * context.penaltyDays
    }
    if (formula.includes('hourlyWage') && formula.includes('hours')) {
      // Fazla mesai
      const multiplier = context.parameters['multiplier'] || 1.5
      const hours = context.normalOvertimeHours || 0
      return context.hourlyWage * hours * multiplier
    }
    
    return 0
  }

  /**
   * Kümülatif gelir vergisi hesapla (dilimli)
   */
  private calculateBracketTax(
    currentTaxBase: number,
    brackets: TaxBracket[],
    previousCumulativeBase: number
  ): { tax: number; effectiveBracket: number } {
    if (brackets.length === 0 || currentTaxBase <= 0) {
      return { tax: 0, effectiveBracket: 0 }
    }

    // Sıralı dilimleri al
    const sortedBrackets = [...brackets].sort((a, b) => a.order - b.order)
    
    // Kümülatif vergi hesaplama
    const newCumulativeBase = previousCumulativeBase + currentTaxBase
    
    let totalTax = 0
    let remainingBase = currentTaxBase
    let currentPosition = previousCumulativeBase
    let effectiveBracket = 1

    for (const bracket of sortedBrackets) {
      if (remainingBase <= 0) break
      
      const bracketStart = bracket.lowerLimit
      const bracketEnd = bracket.upperLimit
      
      // Bu dilimde ne kadar matrah var?
      if (currentPosition >= bracketEnd) {
        // Bu dilimi tamamen geçtik
        continue
      }
      
      const startInBracket = Math.max(currentPosition, bracketStart)
      const endInBracket = Math.min(newCumulativeBase, bracketEnd)
      
      if (startInBracket >= endInBracket) continue
      
      const taxableInBracket = endInBracket - startInBracket
      const taxInBracket = taxableInBracket * (bracket.rate / 100)
      
      totalTax += taxInBracket
      remainingBase -= taxableInBracket
      currentPosition = endInBracket
      effectiveBracket = bracket.order
    }

    return { 
      tax: Math.round(totalTax * 100) / 100, 
      effectiveBracket 
    }
  }

  /**
   * Parametreleri yükle
   */
  private async loadParameters(year: number, month?: number): Promise<Map<string, SalaryParameter[]>> {
    const params = await this.salaryParameterRepository.findAllWithFilters({ 
      year, 
      isActive: true,
      limit: 1000 
    })
    
    const paramMap = new Map<string, SalaryParameter[]>()
    
    for (const param of params.data) {
      const key = param.parameterType
      if (!paramMap.has(key)) {
        paramMap.set(key, [])
      }
      paramMap.get(key)!.push(param)
    }
    
    return paramMap
  }

  /**
   * Parametre değeri getir
   */
  private getParameterValue(
    parameterType: string, 
    parameters: Map<string, SalaryParameter[]>
  ): SalaryParameter | null {
    const params = parameters.get(parameterType)
    if (!params || params.length === 0) return null
    
    // rate veya total key'li olanı tercih et
    return params.find(p => 
      p.parameterKey === 'rate' || 
      p.parameterKey === 'total'
    ) || params[0]
  }

  /**
   * Kümülatif vergi matrahını hesapla
   */
  private async getCumulativeTaxBase(
    employeeId: number, 
    currentMonth: number, 
    year: number
  ): Promise<number> {
    // Önceki ayların bordrolarından kümülatif matrahı al
    const previousPayrolls = await this.payrollRepository.findByEmployee(employeeId, year)
    
    let cumulative = 0
    for (const payroll of previousPayrolls) {
      if (payroll.periodMonth < currentMonth && payroll.isFinalized) {
        cumulative += payroll.currentTaxBase || 0
      }
    }
    
    return cumulative
  }

  /**
   * Hesaplama kontekstini oluştur
   */
  private createContext(
    baseSalary: number,
    parameters: Map<string, SalaryParameter[]>,
    cumulativeBase: number,
    additions: { code: string; amount: number }[]
  ): CalculationContext {
    // Aylık gün ve saat parametrelerini al
    const monthDaysParam = parameters.get('MonthlyDays')
    const monthHoursParam = parameters.get('MonthlyHours')
    
    const monthDays = monthDaysParam?.[0]?.parameterValue || 30
    const monthHours = monthHoursParam?.[0]?.parameterValue || 225
    
    // Vergi dilimlerini oluştur
    const brackets = this.buildTaxBrackets(parameters)
    
    // Eklemelerin toplamı
    const totalAdditions = additions.reduce((sum, a) => sum + a.amount, 0)
    const gross = baseSalary + totalAdditions
    
    // Parametre değerlerini düz objeye çevir
    const paramValues: Record<string, number> = {}
    for (const [key, params] of parameters) {
      const mainParam = params.find(p => 
        p.parameterKey === 'rate' || 
        p.parameterKey === 'total' ||
        p.parameterKey === 'gross'
      ) || params[0]
      if (mainParam) {
        paramValues[key] = mainParam.percentageValue || mainParam.parameterValue
      }
    }

    return {
      base: baseSalary,
      gross,
      net: gross, // Başlangıçta gross'a eşit
      monthDays,
      monthHours,
      dailyWage: baseSalary / monthDays,
      hourlyWage: baseSalary / monthHours,
      taxBase: gross, // SGK kesintileri çıkarıldıktan sonra güncellenecek
      cumulativeBase,
      normalOvertimeHours: 0,
      weekendOvertimeHours: 0,
      holidayOvertimeHours: 0,
      advanceAmount: 0,
      damageAmount: 0,
      penaltyDays: 0,
      parameters: paramValues,
      brackets,
      calculatedDeductions: {},
      calculatedIncomes: {}
    }
  }

  /**
   * Vergi dilimlerini oluştur
   */
  private buildTaxBrackets(parameters: Map<string, SalaryParameter[]>): TaxBracket[] {
    const bracketParams = parameters.get('IncomeTaxBracket') || []
    const brackets: TaxBracket[] = []
    
    // 5 sabit dilim için
    for (let i = 1; i <= 5; i++) {
      const rateParam = bracketParams.find(p => p.parameterKey === `bracket${i}_rate`)
      const lowerParam = bracketParams.find(p => p.parameterKey === `bracket${i}_lower`)
      const upperParam = bracketParams.find(p => p.parameterKey === `bracket${i}_upper` || p.parameterKey === `bracket${i}_limit`)
      
      if (rateParam) {
        brackets.push({
          order: i,
          lowerLimit: lowerParam?.parameterValue || (i === 1 ? 0 : brackets[i-2]?.upperLimit || 0),
          upperLimit: upperParam?.parameterValue || Number.MAX_SAFE_INTEGER,
          rate: rateParam.percentageValue || rateParam.parameterValue
        })
      }
    }
    
    return brackets
  }

  /**
   * Parametre tiplerini parse et
   */
  private parseParameterTypes(json: string): string[] {
    try {
      return JSON.parse(json)
    } catch {
      return []
    }
  }
}

export default PayrollCalculationService
