import { PrismaClient, EmployeeSalary } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * EmployeeSalary with relations type
 */
export interface EmployeeSalaryWithRelations extends EmployeeSalary {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
    department?: {
      id: number
      name: string
    }
    position?: {
      id: number
      title: string
    }
    hireDate: Date
  } | null
}

/**
 * EmployeeSalary filter options
 */
export interface EmployeeSalaryFilterOptions extends FindAllOptions {
  employeeId?: number
  year?: number
  currency?: string
}

/**
 * EmployeeSalaryRepository - Personel ücret kayıtları veritabanı işlemleri
 * BaseRepository'den türetilmiş, yıl bazlı ücret sorguları içerir
 */
export class EmployeeSalaryRepository extends BaseRepository<EmployeeSalary> {
  constructor(prisma: PrismaClient) {
    // EmployeeSalary has soft delete
    super(prisma, 'employeeSalary', true)
  }

  /**
   * Tüm ücret kayıtlarını ilişkileriyle birlikte getir
   */
  async findAllWithRelations(
    options: EmployeeSalaryFilterOptions = {}
  ): Promise<PaginatedResult<EmployeeSalaryWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'year',
      order = 'desc',
      employeeId,
      year,
      currency
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      deletedAt: null
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (year) whereClause.year = year
    if (currency) whereClause.currency = currency

    const [data, total] = await Promise.all([
      this.prisma.employeeSalary.findMany({
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
              hireDate: true,
              department: {
                select: {
                  id: true,
                  name: true
                }
              },
              position: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      }),
      this.prisma.employeeSalary.count({ where: whereClause })
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
   * ID ile ücret kaydını ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number): Promise<EmployeeSalaryWithRelations | null> {
    const result = await this.prisma.employeeSalary.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            hireDate: true,
            department: {
              select: {
                id: true,
                name: true
              }
            },
            position: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    })

    if (!result || result.deletedAt) return null
    return this.toPlain(result)
  }

  /**
   * Personelin tüm ücret geçmişini getir
   */
  async findByEmployee(employeeId: number): Promise<EmployeeSalary[]> {
    const result = await this.prisma.employeeSalary.findMany({
      where: {
        employeeId,
        deletedAt: null
      },
      orderBy: { year: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Belirli bir yıla ait tüm ücret kayıtlarını getir
   */
  async findByYear(year: number): Promise<EmployeeSalary[]> {
    const result = await this.prisma.employeeSalary.findMany({
      where: {
        year,
        deletedAt: null
      },
      orderBy: { employeeId: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Personel ve yıla göre ücret kaydını getir
   */
  async findByEmployeeAndYear(employeeId: number, year: number): Promise<EmployeeSalary | null> {
    const result = await this.prisma.employeeSalary.findFirst({
      where: {
        employeeId,
        year,
        deletedAt: null
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
   * Personel + Yıl kombinasyonunun benzersiz olup olmadığını kontrol et
   */
  async isUniqueEmployeeYear(employeeId: number, year: number, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      employeeId,
      year,
      deletedAt: null
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.employeeSalary.count({
      where: whereClause
    })

    return count === 0
  }

  /**
   * Belirli bir yıl aralığındaki ücret kayıtlarını getir
   */
  async findByYearRange(startYear: number, endYear: number): Promise<EmployeeSalary[]> {
    const result = await this.prisma.employeeSalary.findMany({
      where: {
        year: {
          gte: startYear,
          lte: endYear
        },
        deletedAt: null
      },
      orderBy: [{ year: 'desc' }, { employeeId: 'asc' }]
    })

    return this.toPlain(result)
  }

  /**
   * Tüm yılların listesini getir (unique)
   */
  async getDistinctYears(): Promise<number[]> {
    const result = await this.prisma.employeeSalary.findMany({
      where: { deletedAt: null },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' }
    })

    return result.map(r => r.year)
  }
}

export default EmployeeSalaryRepository
