import { PrismaClient, SalaryHistory } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * SalaryHistory with relations type
 */
export interface SalaryHistoryWithRelations extends SalaryHistory {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
}

/**
 * SalaryHistory filter options
 */
export interface SalaryHistoryFilterOptions extends FindAllOptions {
  employeeId?: number
  currency?: string
  periodType?: string
  isActive?: boolean // end_date = null
}

/**
 * SalaryHistoryRepository - Maaş geçmişi veritabanı işlemleri
 * BaseRepository'den türetilmiş, aktif maaş sorgusu ve tarihçe sorguları içerir
 * Requirements: 12.1
 */
export class SalaryHistoryRepository extends BaseRepository<SalaryHistory> {
  constructor(prisma: PrismaClient) {
    // SalaryHistory doesn't have soft delete
    super(prisma, 'salaryHistory', false)
  }

  /**
   * Tüm maaş geçmişlerini ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: SalaryHistoryFilterOptions = {}): Promise<PaginatedResult<SalaryHistoryWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'startDate',
      order = 'desc',
      employeeId,
      currency,
      periodType,
      isActive
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {}

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (currency) whereClause.currency = currency
    if (periodType) whereClause.periodType = periodType
    if (isActive === true) whereClause.endDate = null
    if (isActive === false) whereClause.endDate = { not: null }

    const [data, total] = await Promise.all([
      this.prisma.salaryHistory.findMany({
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
          }
        }
      }),
      this.prisma.salaryHistory.count({ where: whereClause })
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
   * ID ile maaş geçmişini ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number): Promise<SalaryHistoryWithRelations | null> {
    const result = await this.prisma.salaryHistory.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personelin güncel (aktif) maaşını getir
   * Requirements: 12.5, 12.7 - end_date = null olan kayıt güncel maaştır
   */
  async findCurrentSalary(employeeId: number): Promise<SalaryHistory | null> {
    const result = await this.prisma.salaryHistory.findFirst({
      where: {
        employeeId,
        endDate: null
      },
      orderBy: { startDate: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Personelin tüm maaş geçmişini getir
   * Requirements: 12.8 - Maaş geçmişi korunmalı
   */
  async findByEmployee(employeeId: number): Promise<SalaryHistory[]> {
    const result = await this.prisma.salaryHistory.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Personelin belirli bir tarihteki maaşını getir
   */
  async findSalaryAtDate(employeeId: number, date: Date): Promise<SalaryHistory | null> {
    const result = await this.prisma.salaryHistory.findFirst({
      where: {
        employeeId,
        startDate: { lte: date },
        OR: [
          { endDate: null },
          { endDate: { gte: date } }
        ]
      },
      orderBy: { startDate: 'desc' }
    })

    return this.toPlain(result)
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
   * Önceki aktif maaş kaydını kapat (end_date set et)
   * Requirements: 12.4 - Yeni maaş kaydı oluşturulduğunda önceki kaydın end_date'i set edilmeli
   */
  async closeCurrentSalary(employeeId: number, endDate: Date): Promise<SalaryHistory | null> {
    const currentSalary = await this.findCurrentSalary(employeeId)
    if (!currentSalary) {
      return null
    }

    const result = await this.prisma.salaryHistory.update({
      where: { id: currentSalary.id },
      data: { endDate }
    })

    return this.toPlain(result)
  }

  /**
   * Belirli bir tarih aralığındaki maaş kayıtlarını getir
   */
  async findByDateRange(employeeId: number, startDate: Date, endDate: Date): Promise<SalaryHistory[]> {
    const result = await this.prisma.salaryHistory.findMany({
      where: {
        employeeId,
        OR: [
          // Kayıt başlangıcı aralık içinde
          {
            startDate: {
              gte: startDate,
              lte: endDate
            }
          },
          // Kayıt bitişi aralık içinde
          {
            endDate: {
              gte: startDate,
              lte: endDate
            }
          },
          // Kayıt aralığı tamamen kapsar
          {
            startDate: { lte: startDate },
            OR: [
              { endDate: null },
              { endDate: { gte: endDate } }
            ]
          }
        ]
      },
      orderBy: { startDate: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Aktif maaşı olan personel sayısını getir
   */
  async countEmployeesWithActiveSalary(): Promise<number> {
    const result = await this.prisma.salaryHistory.groupBy({
      by: ['employeeId'],
      where: { endDate: null }
    })
    return result.length
  }

  /**
   * Belirli bir para birimi ile maaş kayıtlarını getir
   */
  async findByCurrency(currency: string): Promise<SalaryHistory[]> {
    const result = await this.prisma.salaryHistory.findMany({
      where: { currency },
      orderBy: { startDate: 'desc' }
    })

    return this.toPlain(result)
  }
}

export default SalaryHistoryRepository
