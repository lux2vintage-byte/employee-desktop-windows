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

  async seedDefaultParameters(year: number, userId?: number): Promise<SalaryParameter[]> {
    const defaults = [
      { parameterType: 'MinimumWage', parameterKey: 'gross', valueType: 'amount', parameterValue: 20002.50, percentageValue: null, description: 'Brüt Asgari Ücret' },
      { parameterType: 'MinimumWage', parameterKey: 'net', valueType: 'amount', parameterValue: 17002.12, percentageValue: null, description: 'Net Asgari Ücret' },
      { parameterType: 'SGKEmployeeRate', parameterKey: 'total', valueType: 'percentage', parameterValue: 0, percentageValue: 14, description: 'SGK İşçi Payı (%)' },
      { parameterType: 'SGKEmployerRate', parameterKey: 'total', valueType: 'percentage', parameterValue: 0, percentageValue: 20.5, description: 'SGK İşveren Payı (%)' },
      { parameterType: 'UnemploymentEmployee', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 1, description: 'İşsizlik Sigortası İşçi (%)' },
      { parameterType: 'UnemploymentEmployer', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 2, description: 'İşsizlik Sigortası İşveren (%)' },
      { parameterType: 'StampTax', parameterKey: 'rate', valueType: 'percentage', parameterValue: 0, percentageValue: 0.759, description: 'Damga Vergisi (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket1_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 15, description: '1. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket1_limit', valueType: 'amount', parameterValue: 110000, percentageValue: null, description: '1. Dilim Üst Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket2_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 20, description: '2. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket2_limit', valueType: 'amount', parameterValue: 230000, percentageValue: null, description: '2. Dilim Üst Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket3_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 27, description: '3. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket3_limit', valueType: 'amount', parameterValue: 870000, percentageValue: null, description: '3. Dilim Üst Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket4_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 35, description: '4. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket4_limit', valueType: 'amount', parameterValue: 3000000, percentageValue: null, description: '4. Dilim Üst Limit' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket5_rate', valueType: 'percentage', parameterValue: 0, percentageValue: 40, description: '5. Dilim Oranı (%)' },
      { parameterType: 'IncomeTaxBracket', parameterKey: 'bracket5_limit', valueType: 'amount', parameterValue: 999999999, percentageValue: null, description: '5. Dilim Üst Limit' },
    ]

    const created: SalaryParameter[] = []
    for (const def of defaults) {
      const existing = await this.prisma.salaryParameter.findFirst({
        where: { year, parameterType: def.parameterType, parameterKey: def.parameterKey }
      })
      if (!existing) {
        const param = await this.prisma.salaryParameter.create({
          data: { year, month: null, ...def, isActive: true }
        })
        created.push(param)
      }
    }
    return this.toPlain(created)
  }
}

export default SalaryParameterRepository
