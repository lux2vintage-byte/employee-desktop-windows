import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { HiringRequestService, BusinessRuleError } from '../services/HiringRequestService'
import { HiringRequestRepository } from '../repositories/HiringRequestRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

export class HiringRequestController extends BaseController {
  private service: HiringRequestService
  private repository: HiringRequestRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new HiringRequestRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new HiringRequestService(this.repository)
  }

  async getAll(options: any = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(result.data, result.total, result.page, result.limit)
    } catch (error) {
      return this.handleError(error, 'İşe alım talepleri getirme')
    }
  }

  async getById(id: number): Promise<any> {
    try {
      const request = await this.service.findById(id)
      if (!request) return this.error(['İşe alım talebi bulunamadı'], 404)
      return this.success(request)
    } catch (error) {
      return this.handleError(error, 'İşe alım talebi getirme')
    }
  }

  async getByStatus(status: string): Promise<any> {
    try {
      const requests = await this.service.findByStatus(status)
      return this.success(requests)
    } catch (error) {
      return this.handleError(error, 'İşe alım talepleri getirme')
    }
  }

  async getByDepartment(departmentId: number): Promise<any> {
    try {
      const requests = await this.service.findByDepartment(departmentId)
      return this.success(requests)
    } catch (error) {
      return this.handleError(error, 'İşe alım talepleri getirme')
    }
  }

  async create(data: any, userId?: number): Promise<any> {
    try {
      const request = await this.service.create(data, userId)
      return this.success(request, 'İşe alım talebi oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım talebi oluşturma')
    }
  }

  async update(id: number, data: any, userId?: number): Promise<any> {
    try {
      const request = await this.service.update(id, data, userId)
      return this.success(request, 'İşe alım talebi güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım talebi güncelleme')
    }
  }

  async approve(id: number, approverId: number, userId?: number): Promise<any> {
    try {
      const request = await this.service.approve(id, approverId, userId)
      return this.success(request, 'İşe alım talebi onaylandı')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım talebi onaylama')
    }
  }

  async reject(id: number, approverId: number, userId?: number): Promise<any> {
    try {
      const request = await this.service.reject(id, approverId, userId)
      return this.success(request, 'İşe alım talebi reddedildi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım talebi reddetme')
    }
  }

  async startProcess(id: number, userId?: number): Promise<any> {
    try {
      const request = await this.service.startProcess(id, userId)
      return this.success(request, 'İşe alım süreci başlatıldı')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım süreci başlatma')
    }
  }

  async complete(id: number, userId?: number): Promise<any> {
    try {
      const request = await this.service.complete(id, userId)
      return this.success(request, 'İşe alım talebi tamamlandı')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım talebi tamamlama')
    }
  }

  async cancel(id: number, userId?: number): Promise<any> {
    try {
      const request = await this.service.cancel(id, userId)
      return this.success(request, 'İşe alım talebi iptal edildi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım talebi iptal etme')
    }
  }

  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'İşe alım talebi silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) return this.error([error.message])
      return this.handleError(error, 'İşe alım talebi silme')
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

export default HiringRequestController
