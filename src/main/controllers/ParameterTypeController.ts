import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { ParameterTypeService, CreateParameterTypeDto, UpdateParameterTypeDto, ParameterTypeBusinessRuleError, ParameterTypeValidationError } from '../services/ParameterTypeService'
import { ParameterTypeRepository, ParameterTypeFilterOptions } from '../repositories/ParameterTypeRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * ParameterType Controller
 * Parametre türleri CRUD operasyonları
 */
export class ParameterTypeController extends BaseController {
  private service: ParameterTypeService
  private repository: ParameterTypeRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new ParameterTypeRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new ParameterTypeService(this.repository)
  }

  /**
   * Parametre türü oluştur
   */
  async create(data: CreateParameterTypeDto, userId?: number): Promise<any> {
    try {
      const parameterType = await this.service.create(data, userId)
      return this.success(parameterType, 'Parametre türü başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof ParameterTypeBusinessRuleError || error instanceof ParameterTypeValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Parametre türü oluşturma')
    }
  }

  /**
   * Parametre türü getir
   */
  async getById(id: number): Promise<any> {
    try {
      const parameterType = await this.service.findById(id)
      if (!parameterType) {
        return this.error(['Parametre türü bulunamadı'], 404)
      }
      return this.success(parameterType)
    } catch (error) {
      return this.handleError(error, 'Parametre türü getirme')
    }
  }

  /**
   * Kod ile parametre türü getir
   */
  async getByCode(code: string): Promise<any> {
    try {
      const parameterType = await this.service.findByCode(code)
      if (!parameterType) {
        return this.error(['Parametre türü bulunamadı'], 404)
      }
      return this.success(parameterType)
    } catch (error) {
      return this.handleError(error, 'Parametre türü getirme')
    }
  }

  /**
   * Tüm parametre türlerini getir
   */
  async getAll(options: ParameterTypeFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Parametre türleri listesi getirme')
    }
  }

  /**
   * Tüm parametre türlerini sayfalama olmadan getir
   */
  async getAllWithoutPagination(): Promise<any> {
    try {
      const parameterTypes = await this.service.findAllWithoutPagination()
      return this.success(parameterTypes)
    } catch (error) {
      return this.handleError(error, 'Parametre türleri listesi getirme')
    }
  }

  /**
   * Tüm aktif parametre türlerini getir
   */
  async getActiveTypes(): Promise<any> {
    try {
      const parameterTypes = await this.service.findAllActive()
      return this.success(parameterTypes)
    } catch (error) {
      return this.handleError(error, 'Aktif parametre türleri getirme')
    }
  }

  /**
   * Kategoriye göre parametre türlerini getir
   */
  async getByCategory(category: string): Promise<any> {
    try {
      const parameterTypes = await this.service.findByCategory(category)
      return this.success(parameterTypes)
    } catch (error) {
      return this.handleError(error, 'Kategoriye göre parametre türleri getirme')
    }
  }

  /**
   * Tüm kategorileri getir
   */
  async getCategories(): Promise<any> {
    try {
      const categories = await this.service.getCategories()
      return this.success(categories)
    } catch (error) {
      return this.handleError(error, 'Kategoriler getirme')
    }
  }

  /**
   * Parametre türü güncelle
   */
  async update(id: number, data: UpdateParameterTypeDto, userId?: number): Promise<any> {
    try {
      const parameterType = await this.service.update(id, data, userId)
      return this.success(parameterType, 'Parametre türü başarıyla güncellendi')
    } catch (error) {
      if (error instanceof ParameterTypeBusinessRuleError || error instanceof ParameterTypeValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Parametre türü güncelleme')
    }
  }

  /**
   * Parametre türü sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Parametre türü başarıyla silindi')
    } catch (error) {
      if (error instanceof ParameterTypeBusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Parametre türü silme')
    }
  }

  /**
   * Varsayılan parametre türlerini oluştur
   */
  async seedDefaults(userId?: number): Promise<any> {
    try {
      const created = await this.service.seedDefaults(userId)
      return this.success(created, `${created.length} varsayılan parametre türü oluşturuldu`)
    } catch (error) {
      return this.handleError(error, 'Varsayılan parametre türleri oluşturma')
    }
  }
}
