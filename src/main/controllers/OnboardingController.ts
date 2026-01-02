import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { OnboardingService, BusinessRuleError } from '../services/OnboardingService'
import { OnboardingRepository } from '../repositories/OnboardingRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

export class OnboardingController extends BaseController {
  private service: OnboardingService
  private repository: OnboardingRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new OnboardingRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new OnboardingService(this.repository)
  }

  async getAll(options: any = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(result.data, result.total, result.page, result.limit)
    } catch (error) {
      return this.handleError(error, 'Oryantasyon kayıtları getirme')
    }
  }

  async getById(id: number): Promise<any> {
    try {
      const onboarding = await this.service.findById(id)
      if (!onboarding) return this.error(['Oryantasyon kaydı bulunamadı'], 404)
      return this.success(onboarding)
    } catch (error) {
      return this.handleError(error, 'Oryantasyon kaydı getirme')
    }
  }

  async getByEmployee(employeeId: number): Promise<any> {
    try {
      const onboarding = await this.service.findByEmployee(employeeId)
      return this.success(onboarding)
    } catch (error) {
      return this.handleError(error, 'Oryantasyon kaydı getirme')
    }
  }

  async getByStatus(status: string): Promise<any> {
    try {
      const onboardings = await this.service.findByStatus(status)
      return this.success(onboardings)
    } catch (error) {
      return this.handleError(error, 'Oryantasyon kayıtları getirme')
    }
  }

  async create(data: any, userId?: number): Promise<any> {
    try {
      const onboarding = await this.service.create(data, userId)
      return this.success(onboarding, 'Oryantasyon kaydı oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Oryantasyon kaydı oluşturma')
    }
  }

  async createWithDefaultTasks(data: any, userId?: number): Promise<any> {
    try {
      const onboarding = await this.service.create(data, userId)
      await this.service.createDefaultTasks(onboarding.id)
      const result = await this.service.findById(onboarding.id)
      return this.success(result, 'Oryantasyon kaydı ve görevler oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Oryantasyon kaydı oluşturma')
    }
  }

  async update(id: number, data: any, userId?: number): Promise<any> {
    try {
      const onboarding = await this.service.update(id, data, userId)
      return this.success(onboarding, 'Oryantasyon kaydı güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Oryantasyon kaydı güncelleme')
    }
  }

  async start(id: number, userId?: number): Promise<any> {
    try {
      const onboarding = await this.service.start(id, userId)
      return this.success(onboarding, 'Oryantasyon başlatıldı')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Oryantasyon başlatma')
    }
  }

  async complete(id: number, userId?: number): Promise<any> {
    try {
      const onboarding = await this.service.complete(id, userId)
      return this.success(onboarding, 'Oryantasyon tamamlandı')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Oryantasyon tamamlama')
    }
  }

  async cancel(id: number, userId?: number): Promise<any> {
    try {
      const onboarding = await this.service.cancel(id, userId)
      return this.success(onboarding, 'Oryantasyon iptal edildi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Oryantasyon iptal etme')
    }
  }

  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Oryantasyon kaydı silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Oryantasyon kaydı silme')
    }
  }

  async addTask(onboardingId: number, data: any): Promise<any> {
    try {
      const task = await this.service.addTask(onboardingId, data)
      return this.success(task, 'Görev eklendi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'Görev ekleme')
    }
  }

  async updateTask(taskId: number, data: any): Promise<any> {
    try {
      const task = await this.service.updateTask(taskId, data)
      return this.success(task, 'Görev güncellendi')
    } catch (error) {
      return this.handleError(error, 'Görev güncelleme')
    }
  }

  async completeTask(taskId: number): Promise<any> {
    try {
      const task = await this.service.completeTask(taskId)
      return this.success(task, 'Görev tamamlandı')
    } catch (error) {
      return this.handleError(error, 'Görev tamamlama')
    }
  }

  async deleteTask(taskId: number): Promise<any> {
    try {
      await this.service.deleteTask(taskId)
      return this.success(null, 'Görev silindi')
    } catch (error) {
      return this.handleError(error, 'Görev silme')
    }
  }

  async getStats(): Promise<any> {
    try {
      const stats = await this.service.getStats()
      return this.success(stats)
    } catch (error) {
      return this.handleError(error, 'İstatistikler getirme')
    }
  }
}

export default OnboardingController
