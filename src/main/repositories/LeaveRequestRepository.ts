import { PrismaClient, LeaveRequest } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * LeaveRequest with relations type
 */
export interface LeaveRequestWithRelations extends LeaveRequest {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
  leaveType?: {
    id: number
    name: string
    isPaid: boolean
    deductsFromAnnual: boolean
    limitDays: number | null
  } | null
  approver?: {
    id: number
    firstName: string
    lastName: string
  } | null
}

/**
 * LeaveRequest filter options
 */
export interface LeaveRequestFilterOptions extends FindAllOptions {
  employeeId?: number
  leaveTypeId?: number
  status?: string
  startDate?: Date | string
  endDate?: Date | string
}

/**
 * Date range interface
 */
export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * LeaveRequestRepository - İzin talepleri veritabanı işlemleri
 * BaseRepository'den türetilmiş, tarih aralığı sorguları ve çakışma kontrolü içerir
 * Requirements: 10.1
 */
export class LeaveRequestRepository extends BaseRepository<LeaveRequest> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'leaveRequest', true)
  }

  /**
   * Tüm izin taleplerini ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: LeaveRequestFilterOptions = {}): Promise<PaginatedResult<LeaveRequestWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      leaveTypeId,
      status,
      startDate,
      endDate
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (leaveTypeId) whereClause.leaveTypeId = leaveTypeId
    if (status) whereClause.status = status
    
    // Tarih aralığı filtresi - string'i Date'e dönüştür
    if (startDate || endDate) {
      whereClause.startDate = {}
      if (startDate) {
        const start = typeof startDate === 'string' ? new Date(startDate + 'T00:00:00.000Z') : startDate
        whereClause.startDate.gte = start
      }
      if (endDate) {
        const end = typeof endDate === 'string' ? new Date(endDate + 'T23:59:59.999Z') : endDate
        whereClause.startDate.lte = end
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
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
          leaveType: {
            select: {
              id: true,
              name: true,
              isPaid: true,
              deductsFromAnnual: true,
              limitDays: true
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
      this.prisma.leaveRequest.count({ where: whereClause })
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
   * ID ile izin talebini ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<LeaveRequestWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveRequest.findFirst({
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
        leaveType: {
          select: {
            id: true,
            name: true,
            isPaid: true,
            deductsFromAnnual: true,
            limitDays: true
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
   * Personel bazlı izin taleplerini getir
   */
  async findByEmployee(employeeId: number, includeDeleted: boolean = false): Promise<LeaveRequestWithRelations[]> {
    const whereClause: any = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { startDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            isPaid: true,
            deductsFromAnnual: true,
            limitDays: true
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
   * Bekleyen izin taleplerini getir
   */
  async findPending(includeDeleted: boolean = false): Promise<LeaveRequestWithRelations[]> {
    const whereClause: any = {
      status: 'Pending',
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            isPaid: true,
            deductsFromAnnual: true,
            limitDays: true
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
   * Tarih aralığında izin taleplerini getir
   */
  async findByDateRange(dateRange: DateRange, includeDeleted: boolean = false): Promise<LeaveRequestWithRelations[]> {
    const whereClause: any = {
      OR: [
        // Başlangıç tarihi aralıkta
        {
          startDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        // Bitiş tarihi aralıkta
        {
          endDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        // Aralığı kapsıyor
        {
          AND: [
            { startDate: { lte: dateRange.startDate } },
            { endDate: { gte: dateRange.endDate } }
          ]
        }
      ],
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { startDate: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            isPaid: true,
            deductsFromAnnual: true,
            limitDays: true
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
   * Çakışan izin taleplerini kontrol et
   * Requirements: 10.9 - Leave Overlap Prevention
   */
  async findOverlapping(
    employeeId: number,
    startDate: Date,
    endDate: Date,
    excludeId?: number,
    includeDeleted: boolean = false
  ): Promise<LeaveRequest[]> {
    const whereClause: any = {
      employeeId,
      status: 'Approved', // Sadece onaylanmış izinlerle çakışma kontrolü
      OR: [
        // Yeni izin mevcut izinin içinde başlıyor
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: startDate } }
          ]
        },
        // Yeni izin mevcut izinin içinde bitiyor
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: endDate } }
          ]
        },
        // Yeni izin mevcut izini kapsıyor
        {
          AND: [
            { startDate: { gte: startDate } },
            { endDate: { lte: endDate } }
          ]
        }
      ],
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const result = await this.prisma.leaveRequest.findMany({
      where: whereClause
    })

    return this.toPlain(result)
  }

  /**
   * Çakışma var mı kontrol et
   * Requirements: 10.9
   */
  async hasOverlap(
    employeeId: number,
    startDate: Date,
    endDate: Date,
    excludeId?: number
  ): Promise<boolean> {
    const overlapping = await this.findOverlapping(employeeId, startDate, endDate, excludeId)
    return overlapping.length > 0
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
   * İzin türünün var olup olmadığını kontrol et
   */
  async leaveTypeExists(leaveTypeId: number): Promise<boolean> {
    const count = await this.prisma.leaveType.count({
      where: {
        id: leaveTypeId,
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Personelin belirli bir yıldaki onaylanmış izin günlerini hesapla
   */
  async getApprovedDaysInYear(employeeId: number, year: number, leaveTypeId?: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)

    const whereClause: any = {
      employeeId,
      status: 'Approved',
      startDate: {
        gte: startOfYear,
        lte: endOfYear
      },
      deletedAt: null
    }

    if (leaveTypeId) {
      whereClause.leaveTypeId = leaveTypeId
    }

    const result = await this.prisma.leaveRequest.aggregate({
      where: whereClause,
      _sum: {
        dayCount: true
      }
    })

    return result._sum.dayCount || 0
  }

  /**
   * Personelin belirli bir izin türündeki toplam kullanılan günleri getir
   */
  async getUsedDaysByType(employeeId: number, leaveTypeId: number, year?: number): Promise<number> {
    const whereClause: any = {
      employeeId,
      leaveTypeId,
      status: 'Approved',
      deletedAt: null
    }

    if (year) {
      const startOfYear = new Date(year, 0, 1)
      const endOfYear = new Date(year, 11, 31)
      whereClause.startDate = {
        gte: startOfYear,
        lte: endOfYear
      }
    }

    const result = await this.prisma.leaveRequest.aggregate({
      where: whereClause,
      _sum: {
        dayCount: true
      }
    })

    return result._sum.dayCount || 0
  }
}

export default LeaveRequestRepository
