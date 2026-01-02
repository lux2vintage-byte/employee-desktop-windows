import { PrismaClient, Overtime } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Overtime with relations type
 */
export interface OvertimeWithRelations extends Overtime {
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
    employeeCode: string
  } | null
}

/**
 * Overtime filter options
 */
export interface OvertimeFilterOptions extends FindAllOptions {
  employeeId?: number
  startDate?: Date
  endDate?: Date
  approvalStatus?: string
  approvedBy?: number
}

/**
 * Date range interface
 */
export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * OvertimeRepository - Fazla mesai veritabanı işlemleri
 * BaseRepository'den türetilmiş, onay durumu sorguları içerir
 * Requirements: 8.1
 */
export class OvertimeRepository extends BaseRepository<Overtime> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'overtime', true)
  }

  /**
   * Tüm fazla mesai kayıtlarını ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: OvertimeFilterOptions = {}): Promise<PaginatedResult<OvertimeWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'date',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      startDate,
      endDate,
      approvalStatus,
      approvedBy
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (approvalStatus) whereClause.approvalStatus = approvalStatus
    if (approvedBy) whereClause.approvedBy = approvedBy
    
    // Tarih aralığı filtresi
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = startDate
      if (endDate) whereClause.date.lte = endDate
    }

    const [data, total] = await Promise.all([
      this.prisma.overtime.findMany({
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
              lastName: true,
              employeeCode: true
            }
          }
        }
      }),
      this.prisma.overtime.count({ where: whereClause })
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
   * ID ile fazla mesai kaydını ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<OvertimeWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.overtime.findFirst({
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
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı fazla mesai kayıtlarını getir
   */
  async findByEmployee(employeeId: number, dateRange?: DateRange, includeDeleted: boolean = false): Promise<Overtime[]> {
    const whereClause: any = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (dateRange) {
      whereClause.date = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    }

    const result = await this.prisma.overtime.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Onay durumuna göre fazla mesai kayıtlarını getir
   * Requirements: 8.1
   */
  async findByApprovalStatus(approvalStatus: string, includeDeleted: boolean = false): Promise<OvertimeWithRelations[]> {
    const whereClause: any = {
      approvalStatus,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.overtime.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
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
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Bekleyen (Pending) fazla mesai kayıtlarını getir
   * Requirements: 8.1
   */
  async findPending(includeDeleted: boolean = false): Promise<OvertimeWithRelations[]> {
    return await this.findByApprovalStatus('Pending', includeDeleted)
  }

  /**
   * Onaylanmış (Approved) fazla mesai kayıtlarını getir
   */
  async findApproved(dateRange?: DateRange, includeDeleted: boolean = false): Promise<OvertimeWithRelations[]> {
    const whereClause: any = {
      approvalStatus: 'Approved',
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (dateRange) {
      whereClause.date = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    }

    const result = await this.prisma.overtime.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
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
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Tarih bazlı fazla mesai kayıtlarını getir
   */
  async findByDate(date: Date, includeDeleted: boolean = false): Promise<OvertimeWithRelations[]> {
    // Tarihi normalize et
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    const whereClause: any = {
      date: normalizedDate,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.overtime.findMany({
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
        approver: {
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
   * Tarih aralığında fazla mesai kayıtlarını getir
   */
  async findByDateRange(dateRange: DateRange, includeDeleted: boolean = false): Promise<OvertimeWithRelations[]> {
    const whereClause: any = {
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      },
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.overtime.findMany({
      where: whereClause,
      orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
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
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personelin belirli bir aydaki onaylanmış fazla mesai kayıtlarını getir
   */
  async findApprovedByMonth(employeeId: number, month: number, year: number): Promise<Overtime[]> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Ayın son günü

    const whereClause = {
      employeeId,
      approvalStatus: 'Approved',
      date: {
        gte: startDate,
        lte: endDate
      },
      deletedAt: null
    }

    const result = await this.prisma.overtime.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
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
   * Personelin aktif ve yönetici olup olmadığını kontrol et
   */
  async isActiveManager(employeeId: number): Promise<boolean> {
    // Basit kontrol: Aktif personel mi?
    // Gerçek uygulamada rol kontrolü de yapılabilir
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: null,
        status: 'Active'
      }
    })
    return employee !== null
  }

  /**
   * Personelin belirli bir aydaki toplam onaylanmış mesai saatini getir
   */
  async getTotalApprovedHours(employeeId: number, month: number, year: number): Promise<number> {
    const records = await this.findApprovedByMonth(employeeId, month, year)
    return records.reduce((total, record) => total + record.hours, 0)
  }

  /**
   * Onay durumuna göre kayıt sayısını getir
   */
  async getCountByApprovalStatus(approvalStatus: string): Promise<number> {
    return await this.prisma.overtime.count({
      where: {
        approvalStatus,
        deletedAt: null
      }
    })
  }
}

export default OvertimeRepository
