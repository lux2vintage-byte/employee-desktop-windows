import { PrismaClient, Resignation } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Valid resignation reason categories
 * Requirements: 19.2
 */
export const VALID_REASON_CATEGORIES = ['İstifa', 'Emeklilik', 'Çıkarılma', 'Sözleşme Bitimi'] as const
export type ReasonCategory = typeof VALID_REASON_CATEGORIES[number]

/**
 * Valid resignation statuses
 * Requirements: 19.3
 */
export const VALID_RESIGNATION_STATUSES = ['Pending', 'Approved', 'Completed'] as const
export type ResignationStatus = typeof VALID_RESIGNATION_STATUSES[number]

/**
 * Resignation with relations type
 */
export interface ResignationWithRelations extends Resignation {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
    status: string
    hireDate: Date
  } | null
  exitInterview?: {
    id: number
    comments: string | null
    wouldRehire: boolean | null
  } | null
}

/**
 * Resignation filter options
 */
export interface ResignationFilterOptions extends FindAllOptions {
  employeeId?: number
  reasonCategory?: ReasonCategory
  status?: ResignationStatus
}

/**
 * ResignationRepository - İstifa/Ayrılma veritabanı işlemleri
 * Bekleyen ayrılma sorguları
 * Requirements: 19.1
 */
export class ResignationRepository extends BaseRepository<Resignation> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'resignation', true)
  }

  /**
   * Tüm ayrılma kayıtlarını ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: ResignationFilterOptions = {}): Promise<PaginatedResult<ResignationWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      reasonCategory,
      status
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (reasonCategory) whereClause.reasonCategory = reasonCategory
    if (status) whereClause.status = status

    const [data, total] = await Promise.all([
      this.prisma.resignation.findMany({
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
              employeeCode: true,
              status: true,
              hireDate: true
            }
          },
          exitInterview: {
            select: {
              id: true,
              comments: true,
              wouldRehire: true
            }
          }
        }
      }),
      this.prisma.resignation.count({ where: whereClause })
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
   * ID ile ayrılma kaydını ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<ResignationWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.resignation.findFirst({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            status: true,
            hireDate: true
          }
        },
        exitInterview: {
          select: {
            id: true,
            comments: true,
            wouldRehire: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı ayrılma kaydını getir
   */
  async findByEmployee(employeeId: number, includeDeleted: boolean = false): Promise<ResignationWithRelations | null> {
    const whereClause = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.resignation.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            status: true,
            hireDate: true
          }
        },
        exitInterview: {
          select: {
            id: true,
            comments: true,
            wouldRehire: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Bekleyen ayrılma taleplerini getir
   * Requirements: 19.1
   */
  async findPending(includeDeleted: boolean = false): Promise<ResignationWithRelations[]> {
    const whereClause = {
      status: 'Pending',
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.resignation.findMany({
      where: whereClause,
      orderBy: { requestDate: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            status: true,
            hireDate: true
          }
        },
        exitInterview: {
          select: {
            id: true,
            comments: true,
            wouldRehire: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Onaylanmış ayrılma taleplerini getir
   */
  async findApproved(includeDeleted: boolean = false): Promise<ResignationWithRelations[]> {
    const whereClause = {
      status: 'Approved',
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.resignation.findMany({
      where: whereClause,
      orderBy: { lastWorkingDay: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            status: true,
            hireDate: true
          }
        },
        exitInterview: {
          select: {
            id: true,
            comments: true,
            wouldRehire: true
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
   * Personelin aktif ayrılma talebi var mı kontrol et
   */
  async hasActiveResignation(employeeId: number): Promise<boolean> {
    const count = await this.prisma.resignation.count({
      where: {
        employeeId,
        status: { in: ['Pending', 'Approved'] },
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Durumu güncelle
   */
  async updateStatus(id: number, status: ResignationStatus, userId?: number): Promise<Resignation> {
    return await this.update(id, { status }, userId)
  }

  /**
   * Son çalışma gününü güncelle
   */
  async updateLastWorkingDay(id: number, lastWorkingDay: Date, userId?: number): Promise<Resignation> {
    return await this.update(id, { lastWorkingDay }, userId)
  }
}

export default ResignationRepository
