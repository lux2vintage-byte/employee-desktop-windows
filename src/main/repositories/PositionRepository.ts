import { PrismaClient, Position } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Position with relations type
 */
export interface PositionWithRelations extends Position {
  department?: {
    id: number
    name: string
  } | null
  _count?: {
    employees: number
  }
}

/**
 * PositionRepository - Pozisyon veritabanı işlemleri
 * BaseRepository'den türetilmiş, departman bazlı sorgular için özel metodlar içerir
 * Requirements: 3.1
 */
export class PositionRepository extends BaseRepository<Position> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'position', true)
  }

  /**
   * Tüm pozisyonları ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: FindAllOptions = {}): Promise<PaginatedResult<PositionWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'title',
      order = 'asc',
      includeDeleted = false
    } = options
    const skip = (page - 1) * limit

    const whereClause = this.getSoftDeleteFilter(includeDeleted)

    const [data, total] = await Promise.all([
      this.prisma.position.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          department: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              employees: true
            }
          }
        }
      }),
      this.prisma.position.count({ where: whereClause })
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
   * ID ile pozisyonu ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<PositionWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.position.findFirst({
      where: whereClause,
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            employees: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Departman bazlı pozisyonları getir
   * Requirements: 3.1
   */
  async findByDepartment(departmentId: number, includeDeleted: boolean = false): Promise<Position[]> {
    const whereClause = {
      departmentId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.position.findMany({
      where: whereClause,
      orderBy: { title: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Departman bazlı pozisyonları ilişkileriyle birlikte getir
   */
  async findByDepartmentWithRelations(departmentId: number, includeDeleted: boolean = false): Promise<PositionWithRelations[]> {
    const whereClause = {
      departmentId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.position.findMany({
      where: whereClause,
      orderBy: { title: 'asc' },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            employees: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Pozisyona atanmış çalışan var mı kontrol et
   */
  async hasEmployees(positionId: number, includeDeleted: boolean = false): Promise<boolean> {
    const whereClause: any = {
      positionId,
      deletedAt: null
    }

    if (includeDeleted) {
      delete whereClause.deletedAt
    }

    const count = await this.prisma.employee.count({ where: whereClause })
    return count > 0
  }

  /**
   * Unvan ve departman kombinasyonunun benzersiz olup olmadığını kontrol et
   * Requirements: 3.2
   */
  async isTitleUniqueWithinDepartment(
    title: string,
    departmentId: number,
    excludeId?: number,
    includeDeleted: boolean = false
  ): Promise<boolean> {
    const whereClause: any = {
      title,
      departmentId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.position.count({ where: whereClause })
    return count === 0
  }

  /**
   * Unvana göre pozisyon ara
   */
  async findByTitle(title: string, includeDeleted: boolean = false): Promise<Position[]> {
    const whereClause = {
      title: {
        contains: title
      },
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.position.findMany({
      where: whereClause,
      orderBy: { title: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Maaş aralığına göre pozisyonları getir
   */
  async findBySalaryRange(
    minSalary?: number,
    maxSalary?: number,
    includeDeleted: boolean = false
  ): Promise<Position[]> {
    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (minSalary !== undefined) {
      whereClause.baseSalaryMin = { gte: minSalary }
    }

    if (maxSalary !== undefined) {
      whereClause.baseSalaryMax = { lte: maxSalary }
    }

    const result = await this.prisma.position.findMany({
      where: whereClause,
      orderBy: { title: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Belirli bir maaşın pozisyon aralığında olup olmadığını kontrol et
   * Requirements: 3.3
   */
  async isSalaryInRange(positionId: number, salary: number): Promise<boolean> {
    const position = await this.findById(positionId)
    if (!position) {
      return false
    }

    // Eğer min ve max tanımlı değilse, her maaş geçerli
    if (position.baseSalaryMin === null && position.baseSalaryMax === null) {
      return true
    }

    // Min tanımlı ve maaş min'den küçükse geçersiz
    if (position.baseSalaryMin !== null && salary < position.baseSalaryMin) {
      return false
    }

    // Max tanımlı ve maaş max'tan büyükse geçersiz
    if (position.baseSalaryMax !== null && salary > position.baseSalaryMax) {
      return false
    }

    return true
  }

  /**
   * Departman var mı kontrol et
   */
  async departmentExists(departmentId: number): Promise<boolean> {
    const count = await this.prisma.department.count({
      where: {
        id: departmentId,
        deletedAt: null
      }
    })
    return count > 0
  }
}

export default PositionRepository
