import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { DayTypeService, CreateDayTypeDto, UpdateDayTypeDto, DayTypeBusinessRuleError, DayTypeValidationError } from '../services/DayTypeService'
import { DayTypeRepository, DayTypeFilterOptions } from '../repositories/DayTypeRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * DayType Controller
 * Gün türleri CRUD operasyonları
 */
export class DayTypeController extends BaseController {
  private service: DayTypeService
  private repository: DayTypeRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new DayTypeRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new DayTypeService(this.repository)
  }

  /**
   * Gün türü oluştur
   */
  async create(data: CreateDayTypeDto, userId?: number): Promise<any> {
    try {
      const dayType = await this.service.create(data, userId)
      return this.success(dayType, 'Gün türü başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof DayTypeBusinessRuleError || error instanceof DayTypeValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Gün türü oluşturma')
    }
  }

  /**
   * Gün türü getir
   */
  async getById(id: number): Promise<any> {
    try {
      const dayType = await this.service.findById(id)
      if (!dayType) {
        return this.error(['Gün türü bulunamadı'], 404)
      }
      return this.success(dayType)
    } catch (error) {
      return this.handleError(error, 'Gün türü getirme')
    }
  }

  /**
   * Tüm gün türlerini getir
   */
  async getAll(options: DayTypeFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Gün türleri listesi getirme')
    }
  }

  /**
   * Tüm gün türlerini sayfalama olmadan getir
   */
  async getAllWithoutPagination(): Promise<any> {
    try {
      const dayTypes = await this.service.findAllWithoutPagination()
      return this.success(dayTypes)
    } catch (error) {
      return this.handleError(error, 'Gün türleri listesi getirme')
    }
  }

  /**
   * Tüm aktif gün türlerini getir
   */
  async getActiveTypes(): Promise<any> {
    try {
      const dayTypes = await this.service.findAllActive()
      return this.success(dayTypes)
    } catch (error) {
      return this.handleError(error, 'Aktif gün türleri getirme')
    }
  }

  /**
   * Gün türü güncelle
   */
  async update(id: number, data: UpdateDayTypeDto, userId?: number): Promise<any> {
    try {
      const dayType = await this.service.update(id, data, userId)
      return this.success(dayType, 'Gün türü başarıyla güncellendi')
    } catch (error) {
      if (error instanceof DayTypeBusinessRuleError || error instanceof DayTypeValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Gün türü güncelleme')
    }
  }

  /**
   * Gün türü sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Gün türü başarıyla silindi')
    } catch (error) {
      if (error instanceof DayTypeBusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Gün türü silme')
    }
  }

  /**
   * Varsayılan gün türlerini seed et
   */
  async seedDefaults(userId?: number): Promise<any> {
    try {
      const created = await this.service.seedDefaults(userId)
      return this.success(created, `${created.length} varsayılan gün türü oluşturuldu`)
    } catch (error) {
      return this.handleError(error, 'Varsayılan gün türleri oluşturma')
    }
  }
}

export default DayTypeController
