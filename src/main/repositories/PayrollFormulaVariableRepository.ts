import { PrismaClient, PayrollFormulaVariable } from '@prisma/client'
import { BaseRepository, PaginatedResult } from './BaseRepository'

/**
 * PayrollFormulaVariableRepository - Bordro formül değişkenleri repository
 * Formüllerde kullanılan değişkenleri yönetir
 */
export class PayrollFormulaVariableRepository extends BaseRepository<PayrollFormulaVariable> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'payrollFormulaVariable', false)
  }

  /**
   * Tüm değişkenleri getir
   */
  async findAllVariables(): Promise<PayrollFormulaVariable[]> {
    const result = await this.prisma.payrollFormulaVariable.findMany({
      orderBy: { variableCode: 'asc' }
    })
    return this.toPlain(result)
  }

  /**
   * Değişken koduna göre getir
   */
  async findByCode(variableCode: string): Promise<PayrollFormulaVariable | null> {
    const result = await this.prisma.payrollFormulaVariable.findUnique({
      where: { variableCode }
    })
    return this.toPlain(result)
  }

  /**
   * Kaynağa göre değişkenleri getir
   */
  async findBySource(source: string): Promise<PayrollFormulaVariable[]> {
    const result = await this.prisma.payrollFormulaVariable.findMany({
      where: { source },
      orderBy: { variableCode: 'asc' }
    })
    return this.toPlain(result)
  }

  /**
   * Varsayılan formül değişkenlerini oluştur
   */
  async seedDefaultVariables(userId?: number): Promise<PayrollFormulaVariable[]> {
    const defaults: Omit<PayrollFormulaVariable, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // Temel ücret değişkenleri
      {
        variableCode: 'base',
        variableName: 'Brüt Maaş',
        source: 'payroll_field',
        sourceField: 'baseSalary',
        description: 'Personelin brüt maaşı',
        isSystem: true
      },
      {
        variableCode: 'gross',
        variableName: 'Brüt Toplam',
        source: 'calculation',
        sourceField: 'baseSalary + totalAdditions',
        description: 'Brüt maaş + ek ödemeler toplamı',
        isSystem: true
      },
      {
        variableCode: 'net',
        variableName: 'Net Maaş',
        source: 'calculation',
        sourceField: 'gross - totalDeductions',
        description: 'Brüt toplam - kesintiler',
        isSystem: true
      },
      {
        variableCode: 'dailyWage',
        variableName: 'Günlük Ücret',
        source: 'calculation',
        sourceField: 'baseSalary / monthDays',
        description: 'Brüt maaş / aydaki gün sayısı',
        isSystem: true
      },
      {
        variableCode: 'hourlyWage',
        variableName: 'Saatlik Ücret',
        source: 'calculation',
        sourceField: 'baseSalary / monthHours',
        description: 'Brüt maaş / aydaki saat sayısı',
        isSystem: true
      },
      // Vergi matrahı değişkenleri
      {
        variableCode: 'taxBase',
        variableName: 'Vergi Matrahı',
        source: 'calculation',
        sourceField: 'gross - sgkEmployee - unemploymentEmployee',
        description: 'Gelir vergisi matrahı (brüt - SGK kesintileri)',
        isSystem: true
      },
      {
        variableCode: 'cumulativeBase',
        variableName: 'Kümülatif Matrah',
        source: 'payroll_field',
        sourceField: 'cumulativeTaxBase',
        description: 'Yıl başından bu aya kadar toplam vergi matrahı',
        isSystem: true
      },
      {
        variableCode: 'currentTaxBase',
        variableName: 'Cari Dönem Matrahı',
        source: 'payroll_field',
        sourceField: 'currentTaxBase',
        description: 'Bu ayın vergi matrahı',
        isSystem: true
      },
      // Süre değişkenleri
      {
        variableCode: 'monthDays',
        variableName: 'Aylık Gün',
        source: 'parameter',
        sourceField: 'MonthlyDays',
        description: 'Ay içindeki çalışma günü sayısı',
        isSystem: true
      },
      {
        variableCode: 'monthHours',
        variableName: 'Aylık Saat',
        source: 'parameter',
        sourceField: 'MonthlyHours',
        description: 'Ay içindeki çalışma saati sayısı',
        isSystem: true
      },
      // Kesinti tutarları
      {
        variableCode: 'sgkEmployee',
        variableName: 'SGK İşçi Kesintisi',
        source: 'calculation',
        sourceField: 'base * SGKEmployeeRate',
        description: 'SGK işçi payı kesinti tutarı',
        isSystem: true
      },
      {
        variableCode: 'unemploymentEmployee',
        variableName: 'İşsizlik Kesintisi',
        source: 'calculation',
        sourceField: 'base * UnemploymentEmployee',
        description: 'İşsizlik sigortası işçi payı kesinti tutarı',
        isSystem: true
      },
      // Parametre referansları
      {
        variableCode: 'rate',
        variableName: 'Oran',
        source: 'parameter',
        sourceField: 'percentageValue',
        description: 'İlgili parametrenin yüzde değeri',
        isSystem: true
      },
      {
        variableCode: 'amount',
        variableName: 'Tutar',
        source: 'parameter',
        sourceField: 'parameterValue',
        description: 'İlgili parametrenin tutar değeri',
        isSystem: true
      },
      {
        variableCode: 'multiplier',
        variableName: 'Çarpan',
        source: 'parameter',
        sourceField: 'parameterValue',
        description: 'Fazla mesai çarpanı',
        isSystem: true
      },
      // Bordro özel değişkenleri
      {
        variableCode: 'advanceAmount',
        variableName: 'Avans Tutarı',
        source: 'employee_data',
        sourceField: 'pendingAdvances',
        description: 'Personelin bekleyen avans borcu',
        isSystem: true
      },
      {
        variableCode: 'hours',
        variableName: 'Fazla Mesai Saati',
        source: 'employee_data',
        sourceField: 'overtimeHours',
        description: 'Bu dönemki fazla mesai saati',
        isSystem: true
      },
      {
        variableCode: 'brackets',
        variableName: 'Vergi Dilimleri',
        source: 'parameter',
        sourceField: 'IncomeTaxBracket',
        description: 'Gelir vergisi dilimleri dizisi',
        isSystem: true
      },
      // Asgari ücret referansları
      {
        variableCode: 'minimumWageGross',
        variableName: 'Asgari Ücret Brüt',
        source: 'parameter',
        sourceField: 'MinimumWage.gross',
        description: 'Brüt asgari ücret tutarı',
        isSystem: true
      },
      {
        variableCode: 'minimumWageNet',
        variableName: 'Asgari Ücret Net',
        source: 'parameter',
        sourceField: 'MinimumWage.net',
        description: 'Net asgari ücret tutarı',
        isSystem: true
      }
    ]

    const created: PayrollFormulaVariable[] = []
    
    for (const def of defaults) {
      const existing = await this.prisma.payrollFormulaVariable.findUnique({
        where: { variableCode: def.variableCode }
      })
      
      if (!existing) {
        const variable = await this.prisma.payrollFormulaVariable.create({
          data: def
        })
        created.push(variable)
        
        await this.logAudit('INSERT', variable.id, undefined, def as any, userId)
      }
    }
    
    return this.toPlain(created)
  }
}

export default PayrollFormulaVariableRepository
