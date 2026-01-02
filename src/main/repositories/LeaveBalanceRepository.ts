import { PrismaClient, LeaveBalance } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * LeaveBalance with relations type
 */
export interface LeaveBalanceWithRelations extends LeaveBalance {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
    hireDate: Date
  } | null
}

/**
 * LeaveBalance filter options
 */
export interface LeaveBalanceFilterOptions extends FindAllOptions {
  employeeId?: number
  year?: number
}

/**
 * LeaveBalanceRepository - İzin bakiyeleri veritabanı işlemleri
 * BaseRepository'den türetilmiş, yıl bazlı sorgular içerir
 * Requirements: 11.1, 11.2
 */
export class LeaveBalanceRepository extends BaseRepository<LeaveBalance> {
  constructor(prisma: PrismaClient) {
    // LeaveBalance doesn't have soft delete
    super(prisma, 'leaveBalance', false)
  }

  /**
   * Tüm izin bakiyelerini ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: LeaveBalanceFilterOptions = {}): Promise<PaginatedResult<LeaveBalanceWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'year',
      order = 'desc',
      employeeId,
      year
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {}

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (year) whereClause.year = year

    const [data, total] = await Promise.all([
      this.prisma.leaveBalance.findMany({
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
              hireDate: true
            }
          }
        }
      }),
      this.prisma.leaveBalance.count({ where: whereClause })
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
   * ID ile izin bakiyesini ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number): Promise<LeaveBalanceWithRelations | null> {
    const result = await this.prisma.leaveBalance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            hireDate: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel ve yıl ile izin bakiyesi bul
   * Requirements: 11.2 - Unique constraint on employee_id and year
   */
  async findByEmployeeAndYear(employeeId: number, year: number): Promise<LeaveBalance | null> {
    const result = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId,
          year
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı izin bakiyelerini getir (tüm yıllar)
   */
  async findByEmployee(employeeId: number): Promise<LeaveBalance[]> {
    const result = await this.prisma.leaveBalance.findMany({
      where: { employeeId },
      orderBy: { year: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Yıl bazlı izin bakiyelerini getir (tüm personeller)
   */
  async findByYear(year: number): Promise<LeaveBalanceWithRelations[]> {
    const result = await this.prisma.leaveBalance.findMany({
      where: { year },
      orderBy: { employeeId: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            hireDate: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel ve yıl kombinasyonunun benzersiz olup olmadığını kontrol et
   * Requirements: 11.2
   */
  async isUniqueEmployeeYear(employeeId: number, year: number, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      employeeId,
      year
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.leaveBalance.count({ where: whereClause })
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
   * Personelin işe giriş tarihini getir
   */
  async getEmployeeHireDate(employeeId: number): Promise<Date | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { hireDate: true }
    })
    return employee?.hireDate || null
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
   * Kullanılan günleri güncelle
   * Requirements: 11.7
   */
  async updateUsedDays(employeeId: number, year: number, usedDays: number): Promise<LeaveBalance | null> {
    const existing = await this.findByEmployeeAndYear(employeeId, year)
    if (!existing) {
      return null
    }

    // Kalan günleri hesapla
    const remainingDays = existing.annualLeaveEntitlement + existing.transferredDays - usedDays

    const result = await this.prisma.leaveBalance.update({
      where: { id: existing.id },
      data: {
        usedDays,
        remainingDays
      }
    })

    return this.toPlain(result)
  }

  /**
   * Kullanılan günleri artır
   * Requirements: 11.7
   */
  async incrementUsedDays(employeeId: number, year: number, days: number): Promise<LeaveBalance | null> {
    const existing = await this.findByEmployeeAndYear(employeeId, year)
    if (!existing) {
      return null
    }

    const newUsedDays = existing.usedDays + days
    return await this.updateUsedDays(employeeId, year, newUsedDays)
  }

  /**
   * Devredilen günleri güncelle
   */
  async updateTransferredDays(employeeId: number, year: number, transferredDays: number): Promise<LeaveBalance | null> {
    const existing = await this.findByEmployeeAndYear(employeeId, year)
    if (!existing) {
      return null
    }

    // Kalan günleri yeniden hesapla
    const remainingDays = existing.annualLeaveEntitlement + transferredDays - existing.usedDays

    const result = await this.prisma.leaveBalance.update({
      where: { id: existing.id },
      data: {
        transferredDays,
        remainingDays
      }
    })

    return this.toPlain(result)
  }

  /**
   * Belirli bir yıl için bakiyesi olmayan aktif personelleri getir
   */
  async getEmployeesWithoutBalance(year: number): Promise<number[]> {
    const activeEmployeeIds = await this.getActiveEmployeeIds()
    
    const existingBalances = await this.prisma.leaveBalance.findMany({
      where: { year },
      select: { employeeId: true }
    })
    
    const employeesWithBalance = new Set(existingBalances.map(b => b.employeeId))
    
    return activeEmployeeIds.filter(id => !employeesWithBalance.has(id))
  }

  /**
   * Önceki yılın bakiyesini getir (devir için)
   */
  async getPreviousYearBalance(employeeId: number, currentYear: number): Promise<LeaveBalance | null> {
    return await this.findByEmployeeAndYear(employeeId, currentYear - 1)
  }
}

export default LeaveBalanceRepository
