import { PrismaClient, SalaryAdvance } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * SalaryAdvance with relations type
 */
export interface AdvanceWithRelations extends SalaryAdvance {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
  approver?: {
    id: number
    firstName: string
    lastName: string
  } | null
}

/**
 * Advance filter options
 */
export interface AdvanceFilterOptions extends FindAllOptions {
  employeeId?: number
  status?: string
  deductionPeriod?: string
}

/**
 * Valid advance status values
 * Requirements: 15.2
 */
export const VALID_ADVANCE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Paid', 'Deducted'] as const
export type AdvanceStatus = typeof VALID_ADVANCE_STATUSES[number]

/**
 * AdvanceRepository - Avans veritabanı işlemleri
 * BaseRepository'den türetilmiş, bekleyen avans ve kesinti dönemi sorguları içerir
 * Requirements: 15.1
 */
export class AdvanceRepository extends BaseRepository<SalaryAdvance> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'salaryAdvance', true) // Supports soft delete
  }

  /**
   * Tüm avansları ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: AdvanceFilterOptions = {}): Promise<PaginatedResult<AdvanceWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'requestDate',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      status,
      deductionPeriod
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (status) whereClause.status = status
    if (deductionPeriod) whereClause.deductionPeriod = deductionPeriod

    const [data, total] = await Promise.all([
      this.prisma.salaryAdvance.findMany({
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
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      this.prisma.salaryAdvance.count({ where: whereClause })
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
   * ID ile avansı ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<AdvanceWithRelations | null> {
    const whereClause: any = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.salaryAdvance.findFirst({
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
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı avansları getir
   */
  async findByEmployee(employeeId: number, includeDeleted: boolean = false): Promise<AdvanceWithRelations[]> {
    const whereClause: any = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.salaryAdvance.findMany({
      where: whereClause,
      orderBy: { requestDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Bekleyen avansları getir
   * Requirements: 15.7 - Aynı anda en fazla bir bekleyen avans
   */
  async findPending(employeeId?: number): Promise<AdvanceWithRelations[]> {
    const whereClause: any = {
      status: 'Pending',
      deletedAt: null
    }

    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    const result = await this.prisma.salaryAdvance.findMany({
      where: whereClause,
      orderBy: { requestDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personelin bekleyen avansı var mı kontrol et
   * Requirements: 15.7
   */
  async hasPendingAdvance(employeeId: number): Promise<boolean> {
    const count = await this.prisma.salaryAdvance.count({
      where: {
        employeeId,
        status: 'Pending',
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Kesinti dönemi bazlı avansları getir
   * Requirements: 15.6 - Kesinti dönemi bordrosu oluşturulduğunda avanslar dahil edilmeli
   */
  async findByDeductionPeriod(deductionPeriod: string): Promise<AdvanceWithRelations[]> {
    const result = await this.prisma.salaryAdvance.findMany({
      where: {
        deductionPeriod,
        status: { in: ['Approved', 'Paid'] }, // Onaylanmış veya ödenmiş avanslar
        deletedAt: null
      },
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
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
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
   * Personelin güncel maaşını getir (limit kontrolü için)
   * Requirements: 15.5
   */
  async getEmployeeCurrentSalary(employeeId: number): Promise<number | null> {
    const salary = await this.prisma.salaryHistory.findFirst({
      where: {
        employeeId,
        endDate: null
      },
      select: { amount: true }
    })
    return salary?.amount || null
  }

  /**
   * Avans durumunu güncelle
   */
  async updateStatus(id: number, status: AdvanceStatus, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.findById(id)
    if (!advance) {
      throw new Error(`Avans bulunamadı: ${id}`)
    }

    return await this.update(id, { status } as any, userId)
  }

  /**
   * Avansı onayla
   * Requirements: 15.3
   */
  async approve(id: number, approverId: number, deductionPeriod: string, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.findById(id)
    if (!advance) {
      throw new Error(`Avans bulunamadı: ${id}`)
    }

    if (advance.status !== 'Pending') {
      throw new Error('Sadece bekleyen avanslar onaylanabilir')
    }

    return await this.update(id, {
      status: 'Approved',
      approvedBy: approverId,
      deductionPeriod
    } as any, userId)
  }

  /**
   * Avansı reddet
   */
  async reject(id: number, approverId: number, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.findById(id)
    if (!advance) {
      throw new Error(`Avans bulunamadı: ${id}`)
    }

    if (advance.status !== 'Pending') {
      throw new Error('Sadece bekleyen avanslar reddedilebilir')
    }

    return await this.update(id, {
      status: 'Rejected',
      approvedBy: approverId
    } as any, userId)
  }

  /**
   * Avansı ödenmiş olarak işaretle
   * Requirements: 15.4
   */
  async markAsPaid(id: number, paymentDate: Date, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.findById(id)
    if (!advance) {
      throw new Error(`Avans bulunamadı: ${id}`)
    }

    if (advance.status !== 'Approved') {
      throw new Error('Sadece onaylanmış avanslar ödenmiş olarak işaretlenebilir')
    }

    return await this.update(id, {
      status: 'Paid',
      paymentDate
    } as any, userId)
  }

  /**
   * Avansı kesilmiş olarak işaretle
   * Requirements: 15.6
   */
  async markAsDeducted(id: number, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.findById(id)
    if (!advance) {
      throw new Error(`Avans bulunamadı: ${id}`)
    }

    if (advance.status !== 'Paid') {
      throw new Error('Sadece ödenmiş avanslar kesilmiş olarak işaretlenebilir')
    }

    return await this.update(id, {
      status: 'Deducted'
    } as any, userId)
  }

  /**
   * Durum bazlı avans sayısı
   */
  async countByStatus(status: AdvanceStatus): Promise<number> {
    return await this.prisma.salaryAdvance.count({
      where: {
        status,
        deletedAt: null
      }
    })
  }

  /**
   * Personelin toplam bekleyen/onaylı avans tutarı
   */
  async getTotalPendingAmount(employeeId: number): Promise<number> {
    const result = await this.prisma.salaryAdvance.aggregate({
      where: {
        employeeId,
        status: { in: ['Pending', 'Approved', 'Paid'] },
        deletedAt: null
      },
      _sum: {
        amount: true
      }
    })

    return result._sum.amount || 0
  }
}

export default AdvanceRepository
