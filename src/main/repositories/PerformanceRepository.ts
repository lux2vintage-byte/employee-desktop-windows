import { PrismaClient, PerformanceReview } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Valid performance review statuses
 * Requirements: 16.2
 */
export const VALID_PERFORMANCE_STATUSES = ['Draft', 'Submitted', 'Acknowledged'] as const
export type PerformanceStatus = typeof VALID_PERFORMANCE_STATUSES[number]

/**
 * Performance review with relations type
 */
export interface PerformanceReviewWithRelations extends PerformanceReview {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
  reviewer?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
}

/**
 * Performance filter options
 */
export interface PerformanceFilterOptions extends FindAllOptions {
  employeeId?: number
  reviewerId?: number
  reviewPeriod?: string
  status?: PerformanceStatus
}

/**
 * PerformanceRepository - Performans değerlendirme veritabanı işlemleri
 * Dönem ve personel bazlı sorgular
 * Requirements: 16.1
 */
export class PerformanceRepository extends BaseRepository<PerformanceReview> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'performanceReview', true)
  }

  /**
   * Tüm performans değerlendirmelerini ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: PerformanceFilterOptions = {}): Promise<PaginatedResult<PerformanceReviewWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      reviewerId,
      reviewPeriod,
      status
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (reviewerId) whereClause.reviewerId = reviewerId
    if (reviewPeriod) whereClause.reviewPeriod = reviewPeriod
    if (status) whereClause.status = status

    const [data, total] = await Promise.all([
      this.prisma.performanceReview.findMany({
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
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true
            }
          }
        }
      }),
      this.prisma.performanceReview.count({ where: whereClause })
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
   * ID ile performans değerlendirmesini ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<PerformanceReviewWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.performanceReview.findFirst({
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
        reviewer: {
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
   * Personel bazlı performans değerlendirmelerini getir
   * Requirements: 16.7
   */
  async findByEmployee(employeeId: number, includeDeleted: boolean = false): Promise<PerformanceReviewWithRelations[]> {
    const whereClause = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.performanceReview.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        reviewer: {
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
   * Değerlendirici bazlı performans değerlendirmelerini getir
   */
  async findByReviewer(reviewerId: number, includeDeleted: boolean = false): Promise<PerformanceReviewWithRelations[]> {
    const whereClause = {
      reviewerId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.performanceReview.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        reviewer: {
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
   * Dönem bazlı performans değerlendirmelerini getir
   * Requirements: 16.6
   */
  async findByPeriod(reviewPeriod: string, includeDeleted: boolean = false): Promise<PerformanceReviewWithRelations[]> {
    const whereClause = {
      reviewPeriod,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.performanceReview.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        reviewer: {
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
   * Personel var mı kontrol et
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
   * Durumu güncelle
   */
  async updateStatus(id: number, status: PerformanceStatus, userId?: number): Promise<PerformanceReview> {
    return await this.update(id, { status }, userId)
  }
}

export default PerformanceRepository
