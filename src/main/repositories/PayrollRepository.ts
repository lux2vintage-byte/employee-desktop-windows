import { PrismaClient, Payroll } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Payroll with relations type
 */
export interface PayrollWithRelations extends Payroll {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
  items?: {
    id: number
    type: string
    category: string
    description: string | null
    amount: number
  }[]
}

/**
 * Payroll filter options
 */
export interface PayrollFilterOptions extends FindAllOptions {
  employeeId?: number
  periodMonth?: number
  periodYear?: number
  isFinalized?: boolean
}

/**
 * PayrollRepository - Bordro veritabanı işlemleri
 * BaseRepository'den türetilmiş, dönem bazlı sorgular içerir
 * Requirements: 13.1, 13.2
 */
export class PayrollRepository extends BaseRepository<Payroll> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'payroll', true) // Supports soft delete
  }

  /**
   * Tüm bordroları ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: PayrollFilterOptions = {}): Promise<PaginatedResult<PayrollWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      periodMonth,
      periodYear,
      isFinalized
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (periodMonth) whereClause.periodMonth = periodMonth
    if (periodYear) whereClause.periodYear = periodYear
    if (isFinalized !== undefined) whereClause.isFinalized = isFinalized

    const [data, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true
            }
          },
          items: true
        }
      }),
      this.prisma.payroll.count({ where: whereClause })
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
   * ID ile bordroyu ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<PayrollWithRelations | null> {
    const whereClause: any = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.payroll.findFirst({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        items: true
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel ve dönem ile bordro bul
   * Requirements: 13.2 - Unique constraint on employee_id, period_month, period_year
   */
  async findByEmployeeAndPeriod(employeeId: number, periodMonth: number, periodYear: number, includeDeleted: boolean = false): Promise<PayrollWithRelations | null> {
    const whereClause: any = {
      employeeId,
      periodMonth,
      periodYear,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.payroll.findFirst({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        items: true
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı bordroları getir
   */
  async findByEmployee(employeeId: number, year?: number, includeDeleted: boolean = false): Promise<PayrollWithRelations[]> {
    const whereClause: any = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (year) {
      whereClause.periodYear = year
    }

    const result = await this.prisma.payroll.findMany({
      where: whereClause,
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' }
      ],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        items: true
      }
    })

    return this.toPlain(result)
  }

  /**
   * Dönem bazlı bordroları getir (tüm personeller)
   */
  async findByPeriod(periodMonth: number, periodYear: number, includeDeleted: boolean = false): Promise<PayrollWithRelations[]> {
    const whereClause: any = {
      periodMonth,
      periodYear,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.payroll.findMany({
      where: whereClause,
      orderBy: { employeeId: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        items: true
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel ve dönem kombinasyonunun benzersiz olup olmadığını kontrol et
   * Requirements: 13.2
   */
  async isUniquePeriod(employeeId: number, periodMonth: number, periodYear: number, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      employeeId,
      periodMonth,
      periodYear,
      deletedAt: null
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.payroll.count({ where: whereClause })
    return count === 0
  }

  /**
   * Personelin var olup olmadığını kontrol et
   */
  async employeeExists(employeeId: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: {
        id: employeeId,
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Bordroyu kesinleştir
   * Requirements: 13.4 - is_finalized = true olduğunda değişiklik yapılamaz
   */
  async finalize(id: number, userId?: number): Promise<Payroll> {
    const payroll = await this.findById(id)
    if (!payroll) {
      throw new Error(`Bordro bulunamadı: ${id}`)
    }

    if (payroll.isFinalized) {
      throw new Error('Bordro zaten kesinleştirilmiş')
    }

    return await this.update(id, { isFinalized: true } as any, userId)
  }

  /**
   * Bordro toplamlarını güncelle
   * Requirements: 14.5 - Kalem eklendiğinde/silindiğinde toplamlar güncellenmeli
   */
  async updateTotals(id: number, totalAdditions: number, totalDeductions: number, userId?: number): Promise<Payroll> {
    const payroll = await this.findById(id)
    if (!payroll) {
      throw new Error(`Bordro bulunamadı: ${id}`)
    }

    if (payroll.isFinalized) {
      throw new Error('Kesinleşmiş bordro güncellenemez')
    }

    // Net maaş hesapla
    const netSalary = payroll.baseSalary + totalAdditions - totalDeductions

    return await this.update(id, {
      totalAdditions,
      totalDeductions,
      netSalary
    } as any, userId)
  }

  /**
   * Kesinleşmemiş bordroları getir
   */
  async findPendingPayrolls(periodMonth?: number, periodYear?: number): Promise<PayrollWithRelations[]> {
    const whereClause: any = {
      isFinalized: false,
      deletedAt: null
    }

    if (periodMonth) whereClause.periodMonth = periodMonth
    if (periodYear) whereClause.periodYear = periodYear

    const result = await this.prisma.payroll.findMany({
      where: whereClause,
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' }
      ],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        items: true
      }
    })

    return this.toPlain(result)
  }

  /**
   * Aktif personellerin ID'lerini getir
   */
  async getActiveEmployeeIds(): Promise<number[]> {
    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'Active',
        deletedAt: null
      },
      select: { id: true }
    })
    return employees.map(e => e.id)
  }

  /**
   * Belirli bir dönem için bordrosu olmayan aktif personelleri getir
   */
  async getEmployeesWithoutPayroll(periodMonth: number, periodYear: number): Promise<number[]> {
    const activeEmployeeIds = await this.getActiveEmployeeIds()
    
    const existingPayrolls = await this.prisma.payroll.findMany({
      where: {
        periodMonth,
        periodYear,
        deletedAt: null
      },
      select: { employeeId: true }
    })
    
    const employeesWithPayroll = new Set(existingPayrolls.map(p => p.employeeId))
    
    return activeEmployeeIds.filter(id => !employeesWithPayroll.has(id))
  }

  /**
   * Dönem bazlı toplam bordro istatistikleri
   */
  async getPeriodStatistics(periodMonth: number, periodYear: number): Promise<{
    totalPayrolls: number
    totalBaseSalary: number
    totalAdditions: number
    totalDeductions: number
    totalNetSalary: number
    finalizedCount: number
    pendingCount: number
  }> {
    const payrolls = await this.prisma.payroll.findMany({
      where: {
        periodMonth,
        periodYear,
        deletedAt: null
      }
    })

    return {
      totalPayrolls: payrolls.length,
      totalBaseSalary: payrolls.reduce((sum, p) => sum + p.baseSalary, 0),
      totalAdditions: payrolls.reduce((sum, p) => sum + p.totalAdditions, 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
      totalNetSalary: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
      finalizedCount: payrolls.filter(p => p.isFinalized).length,
      pendingCount: payrolls.filter(p => !p.isFinalized).length
    }
  }
}

export default PayrollRepository
