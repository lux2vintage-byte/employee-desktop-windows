import { PrismaClient, Department } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Department with relations type
 */
export interface DepartmentWithRelations extends Department {
  manager?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
  parentDepartment?: {
    id: number
    name: string
  } | null
  childDepartments?: Department[]
  _count?: {
    employees: number
    positions: number
    childDepartments: number
  }
}

/**
 * Department tree node for hierarchy
 */
export interface DepartmentTreeNode {
  id: number
  name: string
  managerId: number | null
  costCenterCode: string | null
  parentDepartmentId: number | null
  children: DepartmentTreeNode[]
  employeeCount?: number
  positionCount?: number
}

/**
 * DepartmentRepository - Departman veritabanı işlemleri
 * BaseRepository'den türetilmiş, hiyerarşi sorguları için özel metodlar içerir
 * Requirements: 2.1, 2.3, 2.6
 */
export class DepartmentRepository extends BaseRepository<Department> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'department', true)
  }

  /**
   * Tüm departmanları ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: FindAllOptions = {}): Promise<PaginatedResult<DepartmentWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'name',
      order = 'asc',
      includeDeleted = false
    } = options
    const skip = (page - 1) * limit

    const whereClause = this.getSoftDeleteFilter(includeDeleted)

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true
            }
          },
          parentDepartment: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              employees: true,
              positions: true,
              childDepartments: true
            }
          }
        }
      }),
      this.prisma.department.count({ where: whereClause })
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
   * ID ile departmanı ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<DepartmentWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.department.findFirst({
      where: whereClause,
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        parentDepartment: {
          select: {
            id: true,
            name: true
          }
        },
        childDepartments: {
          where: this.getSoftDeleteFilter(includeDeleted)
        },
        _count: {
          select: {
            employees: true,
            positions: true,
            childDepartments: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Alt departmanları getir
   * Requirements: 2.6
   */
  async findChildren(parentId: number, includeDeleted: boolean = false): Promise<Department[]> {
    const whereClause = {
      parentDepartmentId: parentId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.department.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Kök departmanları getir (parent'ı olmayan)
   */
  async findRootDepartments(includeDeleted: boolean = false): Promise<Department[]> {
    const whereClause = {
      parentDepartmentId: null,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.department.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Departman hiyerarşisini ağaç yapısında getir
   * Requirements: 2.6
   */
  async getHierarchy(includeDeleted: boolean = false): Promise<DepartmentTreeNode[]> {
    const whereClause = this.getSoftDeleteFilter(includeDeleted)

    // Tüm departmanları getir
    const allDepartments = await this.prisma.department.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            employees: true,
            positions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Ağaç yapısını oluştur
    return this.buildTree(allDepartments, null)
  }

  /**
   * Recursive tree builder
   */
  private buildTree(departments: any[], parentId: number | null): DepartmentTreeNode[] {
    return departments
      .filter(dept => dept.parentDepartmentId === parentId)
      .map(dept => ({
        id: dept.id,
        name: dept.name,
        managerId: dept.managerId,
        costCenterCode: dept.costCenterCode,
        parentDepartmentId: dept.parentDepartmentId,
        employeeCount: dept._count?.employees || 0,
        positionCount: dept._count?.positions || 0,
        children: this.buildTree(departments, dept.id)
      }))
  }

  /**
   * Belirli bir departmanın tüm alt departmanlarını recursive olarak getir
   */
  async getAllDescendants(departmentId: number, includeDeleted: boolean = false): Promise<Department[]> {
    const descendants: Department[] = []
    const children = await this.findChildren(departmentId, includeDeleted)

    for (const child of children) {
      descendants.push(child)
      const childDescendants = await this.getAllDescendants(child.id, includeDeleted)
      descendants.push(...childDescendants)
    }

    return descendants
  }

  /**
   * Departmanın alt departmanı var mı kontrol et
   * Requirements: 2.4
   */
  async hasChildren(departmentId: number, includeDeleted: boolean = false): Promise<boolean> {
    const whereClause = {
      parentDepartmentId: departmentId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const count = await this.prisma.department.count({ where: whereClause })
    return count > 0
  }

  /**
   * Departmana atanmış çalışan var mı kontrol et
   */
  async hasEmployees(departmentId: number, includeDeleted: boolean = false): Promise<boolean> {
    const whereClause: any = {
      departmentId,
      deletedAt: null
    }

    if (includeDeleted) {
      delete whereClause.deletedAt
    }

    const count = await this.prisma.employee.count({ where: whereClause })
    return count > 0
  }

  /**
   * Departmana atanmış pozisyon var mı kontrol et
   */
  async hasPositions(departmentId: number, includeDeleted: boolean = false): Promise<boolean> {
    const whereClause: any = {
      departmentId,
      deletedAt: null
    }

    if (includeDeleted) {
      delete whereClause.deletedAt
    }

    const count = await this.prisma.position.count({ where: whereClause })
    return count > 0
  }

  /**
   * İsim ve parent kombinasyonunun benzersiz olup olmadığını kontrol et
   * Requirements: 2.2
   */
  async isNameUniqueWithinParent(
    name: string,
    parentDepartmentId: number | null,
    excludeId?: number,
    includeDeleted: boolean = false
  ): Promise<boolean> {
    const whereClause: any = {
      name,
      parentDepartmentId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.department.count({ where: whereClause })
    return count === 0
  }

  /**
   * Cost center code benzersizliğini kontrol et
   * Requirements: 2.7
   */
  async isCostCenterCodeUnique(
    costCenterCode: string,
    excludeId?: number,
    includeDeleted: boolean = false
  ): Promise<boolean> {
    const whereClause: any = {
      costCenterCode,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.department.count({ where: whereClause })
    return count === 0
  }

  /**
   * Yönetici ata
   * Requirements: 2.5
   */
  async assignManager(departmentId: number, managerId: number | null, userId?: number): Promise<Department> {
    return await this.update(departmentId, { managerId } as any, userId)
  }

  /**
   * İsme göre departman ara
   */
  async findByName(name: string, includeDeleted: boolean = false): Promise<Department[]> {
    const whereClause = {
      name: {
        contains: name
      },
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.department.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Cost center code ile departman bul
   */
  async findByCostCenterCode(costCenterCode: string, includeDeleted: boolean = false): Promise<Department | null> {
    const whereClause = {
      costCenterCode,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.department.findFirst({
      where: whereClause
    })

    return this.toPlain(result)
  }
}

export default DepartmentRepository
