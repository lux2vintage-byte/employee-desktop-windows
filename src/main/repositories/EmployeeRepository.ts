import { PrismaClient, Employee, EmployeeDetails } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Employee with relations type
 */
export interface EmployeeWithRelations extends Employee {
  department?: {
    id: number
    name: string
  } | null
  position?: {
    id: number
    title: string
  } | null
  manager?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
  details?: EmployeeDetails | null
  _count?: {
    subordinates: number
    documents: number
  }
}

/**
 * Employee filter options
 */
export interface EmployeeFilterOptions extends FindAllOptions {
  departmentId?: number
  positionId?: number
  managerId?: number
  status?: string
  contractType?: string
  searchTerm?: string
}

/**
 * EmployeeRepository - Personel veritabanı işlemleri
 * BaseRepository'den türetilmiş, sicil no üretimi ve ilişkili veri sorguları için özel metodlar içerir
 * Requirements: 4.1, 4.2
 */
export class EmployeeRepository extends BaseRepository<Employee> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'employee', true)
  }

  /**
   * Tüm personelleri ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: EmployeeFilterOptions = {}): Promise<PaginatedResult<EmployeeWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      includeDeleted = false,
      departmentId,
      positionId,
      managerId,
      status,
      contractType,
      searchTerm
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (departmentId) whereClause.departmentId = departmentId
    if (positionId) whereClause.positionId = positionId
    if (managerId) whereClause.managerId = managerId
    if (status) whereClause.status = status
    if (contractType) whereClause.contractType = contractType

    // Arama terimi
    if (searchTerm) {
      whereClause.OR = [
        { firstName: { contains: searchTerm } },
        { lastName: { contains: searchTerm } },
        { employeeCode: { contains: searchTerm } },
        { emailWork: { contains: searchTerm } }
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          details: true,
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
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true
            }
          },
          _count: {
            select: {
              subordinates: true,
              documents: true
            }
          }
        }
      }),
      this.prisma.employee.count({ where: whereClause })
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
   * ID ile personeli ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<EmployeeWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findFirst({
      where: whereClause,
      include: {
        details: true,
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
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        _count: {
          select: {
            subordinates: true,
            documents: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Sicil no ile personel bul
   * Requirements: 4.2, 4.3
   */
  async findByEmployeeCode(employeeCode: string, includeDeleted: boolean = false): Promise<Employee | null> {
    const whereClause: any = {
      employeeCode,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findFirst({
      where: whereClause
    })

    return this.toPlain(result)
  }

  /**
   * Sicil no benzersizliğini kontrol et (soft deleted dahil)
   * Requirements: 4.3
   */
  async isEmployeeCodeUnique(employeeCode: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      employeeCode
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    // Soft deleted kayıtlar dahil kontrol et
    const count = await this.prisma.employee.count({ where: whereClause })
    return count === 0
  }

  /**
   * Benzersiz sicil no üret
   * Requirements: 4.2
   */
  async generateEmployeeCode(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `EMP${year}`

    // Son sicil no'yu bul
    const lastEmployee = await this.prisma.employee.findFirst({
      where: {
        employeeCode: {
          startsWith: prefix
        }
      },
      orderBy: {
        employeeCode: 'desc'
      }
    })

    let nextNumber = 1
    if (lastEmployee) {
      const lastNumber = parseInt(lastEmployee.employeeCode.replace(prefix, ''), 10)
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }

    // 4 haneli numara formatı
    const paddedNumber = nextNumber.toString().padStart(4, '0')
    return `${prefix}${paddedNumber}`
  }

  /**
   * Departman bazlı personelleri getir
   */
  async findByDepartment(departmentId: number, includeDeleted: boolean = false): Promise<Employee[]> {
    const whereClause = {
      departmentId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findMany({
      where: whereClause,
      orderBy: { lastName: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Pozisyon bazlı personelleri getir
   */
  async findByPosition(positionId: number, includeDeleted: boolean = false): Promise<Employee[]> {
    const whereClause = {
      positionId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findMany({
      where: whereClause,
      orderBy: { lastName: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Yönetici bazlı personelleri getir (astlar)
   */
  async findByManager(managerId: number, includeDeleted: boolean = false): Promise<Employee[]> {
    const whereClause = {
      managerId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findMany({
      where: whereClause,
      orderBy: { lastName: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Duruma göre personelleri getir
   */
  async findByStatus(status: string, includeDeleted: boolean = false): Promise<Employee[]> {
    const whereClause = {
      status,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findMany({
      where: whereClause,
      orderBy: { lastName: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * İş e-postası ile personel bul
   */
  async findByEmailWork(emailWork: string, includeDeleted: boolean = false): Promise<Employee | null> {
    const whereClause: any = {
      emailWork,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findFirst({
      where: whereClause
    })

    return this.toPlain(result)
  }

  /**
   * İş e-postası benzersizliğini kontrol et
   */
  async isEmailWorkUnique(emailWork: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      emailWork,
      deletedAt: null
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.employee.count({ where: whereClause })
    return count === 0
  }

  /**
   * Personelin astları var mı kontrol et
   */
  async hasSubordinates(employeeId: number, includeDeleted: boolean = false): Promise<boolean> {
    const whereClause: any = {
      managerId: employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const count = await this.prisma.employee.count({ where: whereClause })
    return count > 0
  }

  /**
   * Personelin yönettiği departmanlar var mı kontrol et
   */
  async hasManagedDepartments(employeeId: number, includeDeleted: boolean = false): Promise<boolean> {
    const whereClause: any = {
      managerId: employeeId
    }

    if (!includeDeleted) {
      whereClause.deletedAt = null
    }

    const count = await this.prisma.department.count({ where: whereClause })
    return count > 0
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

  /**
   * Pozisyon var mı kontrol et
   */
  async positionExists(positionId: number): Promise<boolean> {
    const count = await this.prisma.position.count({
      where: {
        id: positionId,
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Yönetici var mı kontrol et (aktif personel)
   */
  async managerExists(managerId: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: {
        id: managerId,
        deletedAt: null,
        status: 'Active'
      }
    })
    return count > 0
  }

  /**
   * İsim ve soyisime göre personel ara
   */
  async searchByName(searchTerm: string, includeDeleted: boolean = false): Promise<Employee[]> {
    const whereClause = {
      OR: [
        { firstName: { contains: searchTerm } },
        { lastName: { contains: searchTerm } }
      ],
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employee.findMany({
      where: whereClause,
      orderBy: { lastName: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Aktif personel sayısını getir
   */
  async getActiveCount(): Promise<number> {
    return await this.prisma.employee.count({
      where: {
        status: 'Active',
        deletedAt: null
      }
    })
  }
}

export default EmployeeRepository
