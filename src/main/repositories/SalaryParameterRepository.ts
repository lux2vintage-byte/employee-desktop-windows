import { PrismaClient, SalaryParameter } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

export interface SalaryParameterFilterOptions extends FindAllOptions {
  year?: number
  month?: number
  parameterType?: string
  isActive?: boolean
}

export class SalaryParameterRepository extends BaseRepository<SalaryParameter> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'salaryParameter', false)
  }

  async findAllWithFilters(options: SalaryParameterFilterOptions = {}): Promise<PaginatedResult<SalaryParameter>> {
    const { page = 1, limit = 100, orderBy = 'year', order = 'desc', year, month, parameterType, isActive } = options
    const skip = (page - 1) * limit

    const whereClause: any = {}
    if (year) whereClause.year = year
    if (month !== undefined) whereClause.month = month
    if (parameterType) whereClause.parameterType = parameterType
    if (isActive !== undefined) whereClause.isActive = isActive

    const [data, total] = await Promise.all([
      this.prisma.salaryParameter.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ year: order as any }, { month: 'asc' }, { parameterType: 'asc' }]
      }),
      this.prisma.salaryParameter.count({ where: whereClause })
    ])

    return { data: this.toPlain(data), total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findByYearAndType(year: number, parameterType: string, month?: number): Promise<SalaryParameter[]> {
    const whereClause: any = { year, parameterType, isActive: true }
    if (month !== undefined) whereClause.month = month

    const result = await this.prisma.salaryParameter.findMany({ where: whereClause, orderBy: { parameterKey: 'asc' } })
    return this.toPlain(result)
  }

  async getMinimumWage(year: number, month?: number): Promise<number> {
    const param = await this.prisma.salaryParameter.findFirst({
      where: { year, parameterType: 'MinimumWage', isActive: true, month: month || null }
    })
    return param?.parameterValue || 0
  }

  async getTaxBrackets(year: number): Promise<{ rate: number; limit: number }[]> {
    const params = await this.prisma.salaryParameter.findMany({
      where: { year, parameterType: 'IncomeTaxBracket', isActive: true },
      orderBy: { parameterKey: 'asc' }
    })

    const brackets: { rate: number; limit: number }[] = []
    const rateParams = params.filter(p => p.parameterKey.includes('_rate'))
    
    for (const rateParam of rateParams) {
      const bracketNum = rateParam.parameterKey.split('_')[0]
      const limitParam = params.find(p => p.parameterKey === `${bracketNum}_limit`)
      brackets.push({
        rate: rateParam.parameterValue,
        limit: limitParam?.parameterValue || Infinity
      })
    }
    return brackets
  }

  async getSGKRates(year: number): Promise<{ employeeRate: number; employerRate: number }> {
    const params = await this.prisma.salaryParameter.findMany({
      where: { year, parameterType: { in: ['SGKEmployeeRate', 'SGKEmployerRate'] }, isActive: true }
    })
    return {
      employeeRate: params.find(p => p.parameterType === 'SGKEmployeeRate')?.parameterValue || 14,
      employerRate: params.find(p => p.parameterType === 'SGKEmployerRate')?.parameterValue || 20.5
    }
  }

  /**
   * Yıl için varsayılan bordro parametrelerini oluştur
   * 2025 yılı Türkiye bordro parametreleri
   */
  async seedDefaultParameters(year: number, userId?: number): Promise<SalaryParameter[]> {
    const defaults = [
      // ==================== ÜCRET PARAMETRELERİ ====================
      { parameterType: 'MinimumWage', parameterKey: 'gross', valueType: 'amount', parameterValue: 26005.50, percentageValue: null, description: 'Brüt Asgari Ücret (2025 Ocak)' },
      { parameterType: 'MinimumWageNet', parameterKey: 'net', valueType: 'amount', parameterValue: 22104.67, percentageValue: null, description: 'Net Asgari Ücret (2025 Ocak)' },
      { parameterType: 'SGKCeiling', parameterKey: 'ceiling', valueType: 'amount', parameterValue: 195041.25, percentageValue: null, description: 'SGK Tavan Ücreti (7.5 x asgari ücret)' },
      { parameterType: 'SGKFloor', parameterKey: 'floor', valueType: 'amount', parameterValue: 26005.50, percentageValue: null, description: 'SGK Taban Ücreti (asgari ücret)' },

      // ==================== AYLIK SÜRE PARAMETRELERİ ====================
      { parameterType: 'MonthlyWorkDays', parameterKey: 'days', valueType: 'integer', parameterValue: 30, percentageValue: null, description: 'Aylık çalışma günü' },
      { parameterType: 'MonthlyWorkHours', parameterKey: 'hours', valueType: 'integer', parameterValue: 225, percentageValue: null, description: 'Aylık çalışma saati' },
      { parameterType: 'DailyWorkHours', parameterKey: 'hours', valueType: 'integer', parameterValue: 7.5, percentageValue: null, description: 'Günlük çalışma saati' },
      { parameterType: 'WeeklyWorkHours', parameterKey: 'hours', valueType: 'integer', parameterValue: 45, percentageValue: null, description: 'Haftalık çalışma saati' },

      // ==================== FAZLA MESAİ PARAMETRELERİ ====================
      { parameterType: 'OvertimeWeekday', parameterKey: 'multiplier', valueType: 'multiplier', parameterValue: 1.5, percentageValue: null, description: 'Hafta içi fazla mesai çarpanı' },
      { parameterType: 'OvertimeWeekend', parameterKey: 'multiplier', valueType: 'multiplier', parameterValue: 2.0, percentageValue: null, description: 'Hafta sonu fazla mesai çarpanı' },
      { parameterType: 'OvertimeHoliday', parameterKey: 'multiplier', valueType: 'multiplier', parameterValue: 2.5, percentageValue: null, description: 'Resmi tatil fazla mesai çarpanı' },
      { parameterType: 'OvertimeNight', parameterKey: 'multiplier', valueType: 'multiplier', parameterValue: 1.5, percentageValue: null, description: 'Gece fazla mesai çarpanı' },
      { parameterType: 'OvertimeNightWeekend', parameterKey: 'multiplier', valueType: 'multiplier', parameterValue: 2.5, percentageValue: null, description: 'Gece hafta sonu mesai çarpanı' },

      // ==================== SGK PARAMETRELERİ ====================
      { parameterType: 'SGKEmployeeRate', parameterKey: 'total', valueType: 'percentage', parameterValue: 0, percentageValue: 14, description: 'SGK İşçi Payı Oranı (%)' },
      { parameterType: 'SGKEmployerRate', parameterKey: 'total', valueType: 'percentage', parameterValue: 0, percentageValue: 20.5, description: 'SGK İşveren Payı Oranı (%)' },
      { parameterType: 'UnemploymentEmployeeRate', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 1, description: 'İşsizlik Sigortası İşçi Oranı (%)' },
      { parameterType: 'UnemploymentEmployerRate', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 2, description: 'İşsizlik Sigortası İşveren Oranı (%)' },
      { parameterType: 'SGKExemptionRate', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 5, description: 'SGK 5 Puanlık Teşvik Oranı (%)' },

      // ==================== GELİR VERGİSİ DİLİMLERİ (2025) ====================
      // Dilim 1: 0 - 158.000 TL → %15
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket1_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 15, description: '1. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket1_lower', valueType: 'amount', parameterValue: 0, percentageValue: null, description: '1. Dilim Alt Limit', lowerLimit: 0, upperLimit: 158000, bracketOrder: 1 },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket1_upper', valueType: 'amount', parameterValue: 158000, percentageValue: null, description: '1. Dilim Üst Limit' },

      // Dilim 2: 158.000 - 330.000 TL → %20
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket2_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 20, description: '2. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket2_lower', valueType: 'amount', parameterValue: 158000, percentageValue: null, description: '2. Dilim Alt Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket2_upper', valueType: 'amount', parameterValue: 330000, percentageValue: null, description: '2. Dilim Üst Limit' },

      // Dilim 3: 330.000 - 1.250.000 TL → %27
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket3_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 27, description: '3. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket3_lower', valueType: 'amount', parameterValue: 330000, percentageValue: null, description: '3. Dilim Alt Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket3_upper', valueType: 'amount', parameterValue: 1250000, percentageValue: null, description: '3. Dilim Üst Limit' },

      // Dilim 4: 1.250.000 - 4.300.000 TL → %35
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket4_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 35, description: '4. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket4_lower', valueType: 'amount', parameterValue: 1250000, percentageValue: null, description: '4. Dilim Alt Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket4_upper', valueType: 'amount', parameterValue: 4300000, percentageValue: null, description: '4. Dilim Üst Limit' },

      // Dilim 5: 4.300.000 TL üzeri → %40
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket5_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 40, description: '5. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket5_lower', valueType: 'amount', parameterValue: 4300000, percentageValue: null, description: '5. Dilim Alt Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket5_upper', valueType: 'amount', parameterValue: 999999999, percentageValue: null, description: '5. Dilim Üst Limit (Sınırsız)' },

      // ==================== DAMGA VERGİSİ ====================
      { parameterType: 'StampTaxRate', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 0.759, description: 'Damga Vergisi Oranı (%)' },
      { parameterType: 'StampTaxExemption', parameterKey: 'exemption', valueType: 'amount', parameterValue: 26005.50, percentageValue: null, description: 'Damga Vergisi Asgari Ücret İstisnası' },

      // ==================== BES PARAMETRELERİ ====================
      { parameterType: 'BESEmployeeRate', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 3, description: 'BES İşçi Katkı Oranı (%)' },
      { parameterType: 'BESEmployerRate', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 0, description: 'BES İşveren Katkı Oranı (%)' },
    ]

    const created: SalaryParameter[] = []
    for (const def of defaults) {
      const existing = await this.prisma.salaryParameter.findFirst({
        where: { year, parameterType: def.parameterType, parameterKey: def.parameterKey }
      })
      if (!existing) {
        const param = await this.prisma.salaryParameter.create({
          data: { 
            year, 
            month: null, 
            parameterType: def.parameterType,
            parameterKey: def.parameterKey,
            valueType: def.valueType,
            parameterValue: def.parameterValue,
            percentageValue: def.percentageValue,
            description: def.description,
            isActive: true 
          }
        })
        created.push(param)
      }
    }
    return this.toPlain(created)
  }
}

export default SalaryParameterRepository
