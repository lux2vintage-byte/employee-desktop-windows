import { PrismaClient, PayrollColumnMapping } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

export interface PayrollColumnMappingFilterOptions extends FindAllOptions {
  columnType?: 'income' | 'deduction' | 'info'
  category?: string
  isActive?: boolean
  isSystem?: boolean
}

/**
 * PayrollColumnMappingRepository - Bordro sütun eşleştirme repository
 * Hangi bordro sütununda hangi parametrelerin kullanılacağını yönetir
 */
export class PayrollColumnMappingRepository extends BaseRepository<PayrollColumnMapping> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'payrollColumnMapping', true)
  }

  /**
   * Filtreleme seçenekleri ile tüm eşleştirmeleri getir
   */
  async findAllWithFilters(options: PayrollColumnMappingFilterOptions = {}): Promise<PaginatedResult<PayrollColumnMapping>> {
    const {
      page = 1,
      limit = 100,
      orderBy = 'sortOrder',
      order = 'asc',
      columnType,
      category,
      isActive,
      isSystem,
      includeDeleted = false
    } = options

    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (columnType) whereClause.columnType = columnType
    if (category) whereClause.category = category
    if (isActive !== undefined) whereClause.isActive = isActive
    if (isSystem !== undefined) whereClause.isSystem = isSystem

    const [data, total] = await Promise.all([
      this.prisma.payrollColumnMapping.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order }
      }),
      this.prisma.payrollColumnMapping.count({ where: whereClause })
    ])

    return {
      data: this.toPlain(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Aktif eşleştirmeleri getir
   */
  async findActive(): Promise<PayrollColumnMapping[]> {
    const result = await this.prisma.payrollColumnMapping.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })
    return this.toPlain(result)
  }

  /**
   * Sütun koduna göre eşleştirme getir
   */
  async findByColumnCode(columnCode: string): Promise<PayrollColumnMapping | null> {
    const result = await this.prisma.payrollColumnMapping.findUnique({
      where: { columnCode }
    })
    return this.toPlain(result)
  }

  /**
   * Tipe göre eşleştirmeleri getir (income veya deduction veya info)
   */
  async findByType(columnType: 'income' | 'deduction' | 'info'): Promise<PayrollColumnMapping[]> {
    const result = await this.prisma.payrollColumnMapping.findMany({
      where: {
        columnType,
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })
    return this.toPlain(result)
  }

  /**
   * Kategoriye göre eşleştirmeleri getir
   */
  async findByCategory(category: string): Promise<PayrollColumnMapping[]> {
    const result = await this.prisma.payrollColumnMapping.findMany({
      where: {
        category,
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })
    return this.toPlain(result)
  }

  /**
   * Varsayılan bordro sütun eşleştirmelerini oluştur
   */
  async seedDefaultMappings(userId?: number): Promise<PayrollColumnMapping[]> {
    const defaults: Omit<PayrollColumnMapping, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = [
      // === KESİNTİLER (Deductions) ===
      {
        columnCode: 'sgk_employee',
        columnName: 'SGK İşçi Payı',
        columnType: 'deduction',
        category: 'Insurance',
        parameterTypes: JSON.stringify(['SGKEmployeeRate']),
        formula: 'base * (rate / 100)',
        formulaType: 'simple',
        sortOrder: 1,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'SGK işçi payı kesintisi (brüt maaş * SGK oranı)'
      },
      {
        columnCode: 'unemployment_employee',
        columnName: 'İşsizlik Sigortası İşçi',
        columnType: 'deduction',
        category: 'Insurance',
        parameterTypes: JSON.stringify(['UnemploymentEmployee']),
        formula: 'base * (rate / 100)',
        formulaType: 'simple',
        sortOrder: 2,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'İşsizlik sigortası işçi payı kesintisi'
      },
      {
        columnCode: 'income_tax',
        columnName: 'Gelir Vergisi',
        columnType: 'deduction',
        category: 'Tax',
        parameterTypes: JSON.stringify(['IncomeTaxBracket']),
        formula: 'calculateIncomeTax(taxBase, brackets, cumulativeBase)',
        formulaType: 'bracket',
        sortOrder: 3,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Gelir vergisi (kümülatif matrah üzerinden dilimli hesaplama)'
      },
      {
        columnCode: 'stamp_tax',
        columnName: 'Damga Vergisi',
        columnType: 'deduction',
        category: 'Tax',
        parameterTypes: JSON.stringify(['StampTax']),
        formula: 'base * (rate / 100)',
        formulaType: 'simple',
        sortOrder: 4,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Damga vergisi kesintisi (brüt maaş * damga vergisi oranı)'
      },
      {
        columnCode: 'bes_deduction',
        columnName: 'BES Kesintisi',
        columnType: 'deduction',
        category: 'Other',
        parameterTypes: JSON.stringify(['BESRate']),
        formula: 'base * (rate / 100)',
        formulaType: 'simple',
        sortOrder: 5,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: false,
        description: 'Bireysel Emeklilik Sistemi kesintisi (isteğe bağlı)'
      },
      {
        columnCode: 'advance_deduction',
        columnName: 'Avans Kesintisi',
        columnType: 'deduction',
        category: 'Advance',
        parameterTypes: JSON.stringify([]),
        formula: 'advanceAmount',
        formulaType: 'custom',
        sortOrder: 6,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Avans kesintisi (personelin avans borcu)'
      },
      {
        columnCode: 'enforcement_deduction',
        columnName: 'İcra Kesintisi',
        columnType: 'deduction',
        category: 'Other',
        parameterTypes: JSON.stringify(['EnforcementRate']),
        formula: 'netSalary * (rate / 100)',
        formulaType: 'simple',
        sortOrder: 7,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: false,
        description: 'İcra kesintisi (net maaş üzerinden)'
      },
      {
        columnCode: 'alimony_deduction',
        columnName: 'Nafaka Kesintisi',
        columnType: 'deduction',
        category: 'Other',
        parameterTypes: JSON.stringify(['AlimonyRate']),
        formula: 'netSalary * (rate / 100)',
        formulaType: 'simple',
        sortOrder: 8,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: false,
        description: 'Nafaka kesintisi (net maaş üzerinden)'
      },
      {
        columnCode: 'union_deduction',
        columnName: 'Sendika Kesintisi',
        columnType: 'deduction',
        category: 'Other',
        parameterTypes: JSON.stringify(['UnionRate']),
        formula: 'base * (rate / 100)',
        formulaType: 'simple',
        sortOrder: 9,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: false,
        description: 'Sendika kesintisi'
      },
      {
        columnCode: 'damage_deduction',
        columnName: 'Hasar Tespit Kesintisi',
        columnType: 'deduction',
        category: 'Other',
        parameterTypes: JSON.stringify([]),
        formula: 'damageAmount',
        formulaType: 'custom',
        sortOrder: 10,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: false,
        description: 'Hasar tespit kesintisi (sabit tutar)'
      },
      {
        columnCode: 'daily_penalty',
        columnName: 'Yevmiye Cezası',
        columnType: 'deduction',
        category: 'Other',
        parameterTypes: JSON.stringify(['DailyPenaltyMultiplier']),
        formula: 'dailyWage * multiplier * penaltyDays',
        formulaType: 'custom',
        sortOrder: 11,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: false,
        description: 'Yevmiye cezası (günlük ücret * çarpan * gün)'
      },
      // === GELİRLER (Incomes) ===
      {
        columnCode: 'normal_overtime',
        columnName: 'Normal Fazla Mesai',
        columnType: 'income',
        category: 'Overtime',
        parameterTypes: JSON.stringify(['NormalOvertimeMultiplier']),
        formula: 'hourlyWage * hours * multiplier',
        formulaType: 'simple',
        sortOrder: 1,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Normal fazla mesai ücreti (saatlik ücret * saat * çarpan)'
      },
      {
        columnCode: 'weekend_overtime',
        columnName: 'Hafta Tatili Mesaisi',
        columnType: 'income',
        category: 'Overtime',
        parameterTypes: JSON.stringify(['WeekendOvertimeMultiplier']),
        formula: 'hourlyWage * hours * multiplier',
        formulaType: 'simple',
        sortOrder: 2,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Hafta tatili mesai ücreti'
      },
      {
        columnCode: 'religious_holiday_overtime',
        columnName: 'Dini Bayram Mesaisi',
        columnType: 'income',
        category: 'Overtime',
        parameterTypes: JSON.stringify(['ReligiousHolidayOvertimeMultiplier']),
        formula: 'hourlyWage * hours * multiplier',
        formulaType: 'simple',
        sortOrder: 3,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Dini bayram mesai ücreti'
      },
      {
        columnCode: 'national_holiday_overtime',
        columnName: 'Resmi Bayram Mesaisi',
        columnType: 'income',
        category: 'Overtime',
        parameterTypes: JSON.stringify(['NationalHolidayOvertimeMultiplier']),
        formula: 'hourlyWage * hours * multiplier',
        formulaType: 'simple',
        sortOrder: 4,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Resmi bayram mesai ücreti'
      },
      {
        columnCode: 'eve_overtime',
        columnName: 'Arefe Günü Mesaisi',
        columnType: 'income',
        category: 'Overtime',
        parameterTypes: JSON.stringify(['EveOvertimeMultiplier']),
        formula: 'hourlyWage * hours * multiplier',
        formulaType: 'simple',
        sortOrder: 5,
        dataType: 'currency',
        columnWidth: '120px',
        isActive: true,
        isSystem: true,
        description: 'Arefe günü mesai ücreti'
      }
    ]

    const created: PayrollColumnMapping[] = []

    for (const def of defaults) {
      const existing = await this.prisma.payrollColumnMapping.findUnique({
        where: { columnCode: def.columnCode }
      })

      if (!existing) {
        const mapping = await this.prisma.payrollColumnMapping.create({
          data: def
        })
        created.push(mapping)

        await this.logAudit('INSERT', mapping.id, undefined, def as any, userId)
      }
    }

    return this.toPlain(created)
  }
}

export default PayrollColumnMappingRepository
