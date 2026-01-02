import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { EmployeeAllowanceService, CreateEmployeeAllowanceDto, UpdateEmployeeAllowanceDto } from '../services/EmployeeAllowanceService'
import { EmployeeAllowanceRepository, EmployeeAllowanceFilterOptions } from '../repositories/EmployeeAllowanceRepository'
import { getPrismaClient } from '../database/prisma-manager'

export class EmployeeAllowanceController extends BaseController {
  private service: EmployeeAllowanceService
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    const repository = new EmployeeAllowanceRepository(this.prisma)
    this.service = new EmployeeAllowanceService(repository)
  }

  async getAll(options: EmployeeAllowanceFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(result.data, result.total, result.page, result.limit)
    } catch (error) {
      return this.handleError(error, 'Ek ödemeler/kesintiler getirme')
    }
  }

  async getById(id: number): Promise<any> {
    try {
      const item = await this.service.findById(id)
      if (!item) return this.error(['Kayıt bulunamadı'], 404)
      return this.success(item)
    } catch (error) {
      return this.handleError(error, 'Kayıt getirme')
    }
  }

  async getByEmployee(employeeId: number, activeOnly: boolean = true): Promise<any> {
    try {
      const items = await this.service.findByEmployee(employeeId, activeOnly)
      return this.success(items)
    } catch (error) {
      return this.handleError(error, 'Personel kayıtları getirme')
    }
  }

  async create(data: CreateEmployeeAllowanceDto, userId?: number): Promise<any> {
    try {
      const item = await this.service.create(data, userId)
      return this.success(item, 'Kayıt başarıyla oluşturuldu')
    } catch (error) {
      return this.handleError(error, 'Kayıt oluşturma')
    }
  }

  async update(id: number, data: UpdateEmployeeAllowanceDto, userId?: number): Promise<any> {
    try {
      const item = await this.service.update(id, data, userId)
      return this.success(item, 'Kayıt başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Kayıt güncelleme')
    }
  }

  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Kayıt başarıyla silindi')
    } catch (error) {
      return this.handleError(error, 'Kayıt silme')
    }
  }

  async toggleActive(id: number, userId?: number): Promise<any> {
    try {
      const item = await this.service.toggleActive(id, userId)
      return this.success(item, 'Durum güncellendi')
    } catch (error) {
      return this.handleError(error, 'Durum güncelleme')
    }
  }

  async calculateTotals(employeeId: number, baseSalary: number): Promise<any> {
    try {
      const [allowances, deductions] = await Promise.all([
        this.service.calculateTotalAllowances(employeeId, baseSalary),
        this.service.calculateTotalDeductions(employeeId, baseSalary)
      ])
      return this.success({ totalAllowances: allowances, totalDeductions: deductions, net: allowances - deductions })
    } catch (error) {
      return this.handleError(error, 'Toplam hesaplama')
    }
  }
}

export default EmployeeAllowanceController
