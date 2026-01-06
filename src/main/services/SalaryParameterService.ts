import { SalaryParameter } from '@prisma/client'
import { SalaryParameterRepository, SalaryParameterFilterOptions } from '../repositories/SalaryParameterRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

export interface CreateSalaryParameterDto {
  year: number
  month?: number
  parameterType: string
  parameterKey: string
  valueType: 'percentage' | 'amount'
  parameterValue?: number
  percentageValue?: number
  description?: string
  isActive?: boolean
}

export interface UpdateSalaryParameterDto {
  valueType?: 'percentage' | 'amount'
  parameterValue?: number
  percentageValue?: number
  description?: string
  isActive?: boolean
}

export class SalaryParameterService {
  constructor(private repository: SalaryParameterRepository) {}

  async findAll(options: SalaryParameterFilterOptions = {}): Promise<PaginatedResult<SalaryParameter>> {
    return await this.repository.findAllWithFilters(options)
  }

  async findById(id: number): Promise<SalaryParameter | null> {
    return await this.repository.findById(id)
  }

  async findByYearAndType(year: number, parameterType: string, month?: number): Promise<SalaryParameter[]> {
    return await this.repository.findByYearAndType(year, parameterType, month)
  }

  async create(data: CreateSalaryParameterDto, userId?: number): Promise<SalaryParameter> {
    return await this.repository.create(data as any, userId)
  }

  async update(id: number, data: UpdateSalaryParameterDto, userId?: number): Promise<SalaryParameter> {
    return await this.repository.update(id, data as any, userId)
  }

  async delete(id: number, userId?: number): Promise<SalaryParameter> {
    return await this.repository.hardDelete(id, userId)
  }

  async getMinimumWage(year: number, month?: number): Promise<number> {
    return await this.repository.getMinimumWage(year, month)
  }

  async getTaxBrackets(year: number): Promise<{ rate: number; limit: number }[]> {
    return await this.repository.getTaxBrackets(year)
  }

  async getSGKRates(year: number): Promise<{ employeeRate: number; employerRate: number }> {
    return await this.repository.getSGKRates(year)
  }

  async seedDefaults(year: number, userId?: number): Promise<SalaryParameter[]> {
    return await this.repository.seedDefaultParameters(year, userId)
  }

  async copyFromYear(sourceYear: number, targetYear: number, userId?: number): Promise<SalaryParameter[]> {
    const sourceParams = await this.repository.findAllWithFilters({ year: sourceYear, limit: 1000 })
    const created: SalaryParameter[] = []

    for (const param of sourceParams.data) {
      const newParam = await this.repository.create({
        year: targetYear,
        month: param.month,
        parameterType: param.parameterType,
        parameterKey: param.parameterKey,
        parameterValue: param.parameterValue,
        description: param.description,
        isActive: true
      } as any, userId)
      created.push(newParam)
    }

    return created
  }
}

export default SalaryParameterService
