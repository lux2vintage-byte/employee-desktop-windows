import { PrismaClient, AttendanceLog } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Attendance with relations type
 */
export interface AttendanceWithRelations extends AttendanceLog {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
}

/**
 * Attendance filter options
 */
export interface AttendanceFilterOptions extends FindAllOptions {
  employeeId?: number
  startDate?: Date
  endDate?: Date
  status?: string
}

/**
 * Bulk attendance create DTO
 */
export interface BulkAttendanceDto {
  employeeId: number
  date: Date
  checkInTime?: Date | null
  checkOutTime?: Date | null
  breakDuration?: number
  status?: string
  dailyNote?: string | null
}

/**
 * Date range interface
 */
export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * Monthly attendance report
 */
export interface MonthlyAttendanceReport {
  employeeId: number
  month: number
  year: number
  totalDays: number
  presentDays: number
  absentDays: number
  leaveDays: number
  holidayDays: number
  totalWorkingHours: number
  totalBreakMinutes: number
  records: AttendanceLog[]
}

/**
 * AttendanceRepository - Puantaj veritabanı işlemleri
 * BaseRepository'den türetilmiş, tarih bazlı sorgular ve toplu kayıt desteği içerir
 * Requirements: 7.1, 7.2, 7.7
 */
export class AttendanceRepository extends BaseRepository<AttendanceLog> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'attendanceLog', true)
  }

  /**
   * Tüm puantaj kayıtlarını ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: AttendanceFilterOptions = {}): Promise<PaginatedResult<AttendanceWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'date',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      startDate,
      endDate,
      status
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (status) whereClause.status = status
    
    // Tarih aralığı filtresi
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = startDate
      if (endDate) whereClause.date.lte = endDate
    }

    const [data, total] = await Promise.all([
      this.prisma.attendanceLog.findMany({
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
      this.prisma.attendanceLog.count({ where: whereClause })
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
   * ID ile puantaj kaydını ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<AttendanceWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.attendanceLog.findFirst({
      where: whereClause,
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
   * Personel ve tarih ile puantaj kaydı bul
   * Requirements: 7.2 - Unique constraint on employee_id and date
   */
  async findByEmployeeAndDate(employeeId: number, date: Date, includeDeleted: boolean = false): Promise<AttendanceLog | null> {
    // Tarihi normalize et (saat bilgisini sıfırla)
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    const whereClause: any = {
      employeeId,
      date: normalizedDate,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.attendanceLog.findFirst({
      where: whereClause
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı puantaj kayıtlarını getir
   */
  async findByEmployee(employeeId: number, dateRange?: DateRange, includeDeleted: boolean = false): Promise<AttendanceLog[]> {
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

    const result = await this.prisma.attendanceLog.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Tarih bazlı puantaj kayıtlarını getir
   */
  async findByDate(date: Date, includeDeleted: boolean = false): Promise<AttendanceWithRelations[]> {
    // Tarihi normalize et
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    const whereClause: any = {
      date: normalizedDate,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.attendanceLog.findMany({
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
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Tarih aralığında puantaj kayıtlarını getir
   */
  async findByDateRange(dateRange: DateRange, includeDeleted: boolean = false): Promise<AttendanceWithRelations[]> {
    const whereClause: any = {
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      },
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.attendanceLog.findMany({
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
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel ve tarih kombinasyonunun benzersiz olup olmadığını kontrol et
   * Requirements: 7.2
   */
  async isUniqueEmployeeDate(employeeId: number, date: Date, excludeId?: number): Promise<boolean> {
    // Tarihi normalize et
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    const whereClause: any = {
      employeeId,
      date: normalizedDate,
      deletedAt: null
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.attendanceLog.count({ where: whereClause })
    return count === 0
  }

  /**
   * Toplu puantaj kaydı oluştur
   * Requirements: 7.7
   */
  async bulkCreate(records: BulkAttendanceDto[], userId?: number): Promise<AttendanceLog[]> {
    const createdRecords: AttendanceLog[] = []

    // Transaction içinde toplu oluşturma
    await this.prisma.$transaction(async (tx) => {
      for (const record of records) {
        // Tarihi normalize et
        const normalizedDate = new Date(record.date)
        normalizedDate.setHours(0, 0, 0, 0)

        const data = {
          employeeId: record.employeeId,
          date: normalizedDate,
          checkInTime: record.checkInTime || null,
          checkOutTime: record.checkOutTime || null,
          breakDuration: record.breakDuration || 0,
          status: record.status || 'Geldi',
          dailyNote: record.dailyNote || null
        }

        const created = await tx.attendanceLog.create({ data })
        createdRecords.push(created)

        // Audit log
        await this.logAudit('INSERT', created.id, undefined, this.toPlain(created), userId)
      }
    })

    return this.toPlain(createdRecords)
  }

  /**
   * Aylık puantaj kayıtlarını getir
   */
  async findByMonth(employeeId: number, month: number, year: number, includeDeleted: boolean = false): Promise<AttendanceLog[]> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Ayın son günü

    return await this.findByEmployee(employeeId, { startDate, endDate }, includeDeleted)
  }

  /**
   * Duruma göre puantaj kayıtlarını getir
   */
  async findByStatus(status: string, dateRange?: DateRange, includeDeleted: boolean = false): Promise<AttendanceLog[]> {
    const whereClause: any = {
      status,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (dateRange) {
      whereClause.date = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    }

    const result = await this.prisma.attendanceLog.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
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
   * Belirli bir tarihte kaç personelin kaydı olduğunu getir
   */
  async getCountByDate(date: Date, includeDeleted: boolean = false): Promise<number> {
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    const whereClause: any = {
      date: normalizedDate,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    return await this.prisma.attendanceLog.count({ where: whereClause })
  }

  /**
   * Personelin belirli bir aydaki toplam çalışma günü sayısını getir
   */
  async getPresentDaysCount(employeeId: number, month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    return await this.prisma.attendanceLog.count({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'Geldi',
        deletedAt: null
      }
    })
  }
}

export default AttendanceRepository
