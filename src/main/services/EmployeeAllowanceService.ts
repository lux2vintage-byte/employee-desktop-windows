import { EmployeeAllowanceRepository, EmployeeAllowanceWithEmployee, EmployeeAllowanceFilterOptions } from '../repositories/EmployeeAllowanceRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

export interface CreateEmployeeAllowanceDto {
  employeeId: number
  type: 'Allowance' | 'Deduction'
  category: string
  name: string
  amount: number
  isPercentage?: boolean
  isActive?: boolean
  startDate: string | Date
  endDate?: string | Date
}

export interface UpdateEmployeeAllowanceDto {
  name?: string
  amount?: number
  isPercentage?: boolean
  isActive?: boolean
  endDate?: string | Date | null
}

export class EmployeeAllowanceService {
  constructor(private repository: EmployeeAllowanceRepository) {}

  async findAll(options: EmployeeAllowanceFilterOptions = {}): Promise<PaginatedResult<EmployeeAllowanceWithEmployee>> {
    return await this.repository.findAllWithRelations(options)
  }

  async findById(id: number): Promise<EmployeeAllowanceWithEmployee | null> {
    const result = await this.repository.findById(id)
    return result
  }

  async findByEmployee(employeeId: number, activeOnly: boolean = true): Promise<EmployeeAllowanceWithEmployee[]> {
    return await this.repository.findByEmployee(employeeId, activeOnly)
  }

  async create(data: CreateEmployeeAllowanceDto, userId?: number): Promise<EmployeeAllowanceWithEmployee> {
    const createData = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      isPercentage: data.isPercentage || false,
      isActive: data.isActive !== false
    }
    return await this.repository.create(createData as any, userId)
  }

  async update(id: number, data: UpdateEmployeeAllowanceDto, userId?: number): Promise<EmployeeAllowanceWithEmployee> {
    const updateData: any = { ...data }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null
    }
    return await this.repository.update(id, updateData, userId)
  }

  async delete(id: number, userId?: number): Promise<void> {
    await this.repository.softDelete(id, userId)
  }

  async toggleActive(id: number, userId?: number): Promise<EmployeeAllowanceWithEmployee> {
    const current = await this.repository.findById(id)
    if (!current) throw new Error('Kayıt bulunamadı')
    return await this.repository.update(id, { isActive: !current.isActive } as any, userId)
  }

  async calculateTotalAllowances(employeeId: number, baseSalary: number): Promise<number> {
    return await this.repository.calculateTotalAllowances(employeeId, baseSalary)
  }

  async calculateTotalDeductions(employeeId: number, baseSalary: number): Promise<number> {
    return await this.repository.calculateTotalDeductions(employeeId, baseSalary)
  }

  async getActiveAllowances(employeeId: number): Promise<EmployeeAllowanceWithEmployee[]> {
    return await this.repository.findActiveAllowances(employeeId)
  }

  async getActiveDeductions(employeeId: number): Promise<EmployeeAllowanceWithEmployee[]> {
    return await this.repository.findActiveDeductions(employeeId)
  }
}

export default EmployeeAllowanceService
