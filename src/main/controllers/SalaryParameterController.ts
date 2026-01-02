import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { SalaryParameterService, CreateSalaryParameterDto, UpdateSalaryParameterDto } from '../services/SalaryParameterService'
import { SalaryParameterRepository, SalaryParameterFilterOptions } from '../repositories/SalaryParameterRepository'
import { getPrismaClient } from '../database/prisma-manager'

export class SalaryParameterController extends BaseController {
  private service: SalaryParameterService
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    const repository = new SalaryParameterRepository(this.prisma)
    this.service = new SalaryParameterService(repository)
  }

  async getAll(options: SalaryParameterFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(result.data, result.total, result.page, result.limit)
    } catch (error) {
      return this.handleError(error, 'Maaş parametreleri getirme')
    }
  }

  async getById(id: number): Promise<any> {
    try {
      const param = await this.service.findById(id)
      if (!param) return this.error(['Parametre bulunamadı'], 404)
      return this.success(param)
    } catch (error) {
      return this.handleError(error, 'Parametre getirme')
    }
  }

  async getByYearAndType(year: number, parameterType: string, month?: number): Promise<any> {
    try {
      const params = await this.service.findByYearAndType(year, parameterType, month)
      return this.success(params)
    } catch (error) {
      return this.handleError(error, 'Parametreler getirme')
    }
  }

  async create(data: CreateSalaryParameterDto, userId?: number): Promise<any> {
    try {
      const param = await this.service.create(data, userId)
      return this.success(param, 'Parametre başarıyla oluşturuldu')
    } catch (error) {
      return this.handleError(error, 'Parametre oluşturma')
    }
  }

  async update(id: number, data: UpdateSalaryParameterDto, userId?: number): Promise<any> {
    try {
      const param = await this.service.update(id, data, userId)
      return this.success(param, 'Parametre başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Parametre güncelleme')
    }
  }

  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Parametre başarıyla silindi')
    } catch (error) {
      return this.handleError(error, 'Parametre silme')
    }
  }

  async getMinimumWage(year: number, month?: number): Promise<any> {
    try {
      const wage = await this.service.getMinimumWage(year, month)
      return this.success({ minimumWage: wage })
    } catch (error) {
      return this.handleError(error, 'Asgari ücret getirme')
    }
  }

  async getTaxBrackets(year: number): Promise<any> {
    try {
      const brackets = await this.service.getTaxBrackets(year)
      return this.success(brackets)
    } catch (error) {
      return this.handleError(error, 'Vergi dilimleri getirme')
    }
  }

  async getSGKRates(year: number): Promise<any> {
    try {
      const rates = await this.service.getSGKRates(year)
      return this.success(rates)
    } catch (error) {
      return this.handleError(error, 'SGK oranları getirme')
    }
  }

  async seedDefaults(year: number, userId?: number): Promise<any> {
    try {
      const params = await this.service.seedDefaults(year, userId)
      return this.success(params, `${params.length} varsayılan parametre oluşturuldu`)
    } catch (error) {
      return this.handleError(error, 'Varsayılan parametreler oluşturma')
    }
  }

  async copyFromYear(sourceYear: number, targetYear: number, userId?: number): Promise<any> {
    try {
      const params = await this.service.copyFromYear(sourceYear, targetYear, userId)
      return this.success(params, `${params.length} parametre kopyalandı`)
    } catch (error) {
      return this.handleError(error, 'Parametreleri kopyalama')
    }
  }
}

export default SalaryParameterController
