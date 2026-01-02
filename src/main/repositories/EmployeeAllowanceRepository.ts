import { PrismaClient } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

export interface EmployeeAllowanceWithEmployee {
  id: number
  employeeId: number
  type: string
  category: string
  name: string
  amount: number
  isPercentage: boolean
  isActive: boolean
  startDate: Date
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  }
}

export interface EmployeeAllowanceFilterOptions extends FindAllOptions {
  employeeId?: number
  type?: string
  category?: string
  isActive?: boolean
}

export class EmployeeAllowanceRepository extends BaseRepository<any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'employeeAllowance', true)
  }

  async findAllWithRelations(options: EmployeeAllowanceFilterOptions = {}): Promise<PaginatedResult<EmployeeAllowanceWithEmployee>> {
    const { page = 1, limit = 25, orderBy = 'createdAt', order = 'desc', includeDeleted = false, employeeId, type, category, isActive } = options
    const skip = (page - 1) * limit

    const whereClause: any = { ...this.getSoftDeleteFilter(includeDeleted) }
    if (employeeId) whereClause.employeeId = employeeId
    if (type) whereClause.type = type
    if (category) whereClause.category = category
    if (isActive !== undefined) whereClause.isActive = isActive

    const [data, total] = await Promise.all([
      this.prisma.employeeAllowance.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
        }
      }),
      this.prisma.employeeAllowance.count({ where: whereClause })
    ])

    return { data: this.toPlain(data), total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findByEmployee(employeeId: number, activeOnly: boolean = true): Promise<EmployeeAllowanceWithEmployee[]> {
    const whereClause: any = { employeeId, deletedAt: null }
    if (activeOnly) {
      whereClause.isActive = true
      whereClause.OR = [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    }

    const result = await this.prisma.employeeAllowance.findMany({
      where: whereClause,
      orderBy: { type: 'asc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
      }
    })
    return this.toPlain(result)
  }

  async findActiveAllowances(employeeId: number): Promise<EmployeeAllowanceWithEmployee[]> {
    const now = new Date()
    const result = await this.prisma.employeeAllowance.findMany({
      where: {
        employeeId,
        type: 'Allowance',
        isActive: true,
        deletedAt: null,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }]
      }
    })
    return this.toPlain(result)
  }

  async findActiveDeductions(employeeId: number): Promise<EmployeeAllowanceWithEmployee[]> {
    const now = new Date()
    const result = await this.prisma.employeeAllowance.findMany({
      where: {
        employeeId,
        type: 'Deduction',
        isActive: true,
        deletedAt: null,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }]
      }
    })
    return this.toPlain(result)
  }

  async calculateTotalAllowances(employeeId: number, baseSalary: number): Promise<number> {
    const allowances = await this.findActiveAllowances(employeeId)
    return allowances.reduce((total, a) => {
      return total + (a.isPercentage ? (baseSalary * a.amount / 100) : a.amount)
    }, 0)
  }

  async calculateTotalDeductions(employeeId: number, baseSalary: number): Promise<number> {
    const deductions = await this.findActiveDeductions(employeeId)
    return deductions.reduce((total, d) => {
      return total + (d.isPercentage ? (baseSalary * d.amount / 100) : d.amount)
    }, 0)
  }
}

export default EmployeeAllowanceRepository
