import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { PerformanceService, CreatePerformanceReviewDto, UpdatePerformanceReviewDto, BusinessRuleError, ValidationError } from '../services/PerformanceService'
import { PerformanceRepository, PerformanceFilterOptions } from '../repositories/PerformanceRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Performance Controller
 * Performans değerlendirme CRUD operasyonları
 * Requirements: 16.1-16.7
 */
export class PerformanceController extends BaseController {
  private service: PerformanceService
  private repository: PerformanceRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new PerformanceRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    
    this.service = new PerformanceService(this.repository)
  }

  /**
   * Performans değerlendirmesi oluştur
   * Requirements: 16.1, 16.3, 16.4
   */
  async create(data: CreatePerformanceReviewDto, userId?: number): Promise<any> {
    try {
      const review = await this.service.create(data, userId)
      return this.success(review, 'Performans değerlendirmesi başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Performans değerlendirmesi oluşturma')
    }
  }

  /**
   * Performans değerlendirmesi güncelle
   * Requirements: 16.5
   */
  async update(id: number, data: UpdatePerformanceReviewDto, userId?: number): Promise<any> {
    try {
      const review = await this.service.update(id, data, userId)
      return this.success(review, 'Performans değerlendirmesi başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Performans değerlendirmesi güncelleme')
    }
  }

  /**
   * Performans değerlendirmesi getir
   */
  async getById(id: number): Promise<any> {
    try {
      const review = await this.service.findById(id)
      if (!review) {
        return this.error(['Performans değerlendirmesi bulunamadı'], 404)
      }
      return this.success(review)
    } catch (error) {
      return this.handleError(error, 'Performans değerlendirmesi getirme')
    }
  }

  /**
   * Tüm performans değerlendirmelerini getir
   */
  async getAll(options: PerformanceFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Performans değerlendirmeleri getirme')
    }
  }

  /**
   * Personel bazlı performans değerlendirmelerini getir
   * Requirements: 16.7
   */
  async getByEmployee(employeeId: number): Promise<any> {
    try {
      const reviews = await this.service.findByEmployee(employeeId)
      return this.success(reviews)
    } catch (error) {
      return this.handleError(error, 'Personel performans değerlendirmeleri getirme')
    }
  }

  /**
   * Değerlendirici bazlı performans değerlendirmelerini getir
   */
  async getByReviewer(reviewerId: number): Promise<any> {
    try {
      const reviews = await this.service.findByReviewer(reviewerId)
      return this.success(reviews)
    } catch (error) {
      return this.handleError(error, 'Değerlendirici performans değerlendirmeleri getirme')
    }
  }

  /**
   * Dönem bazlı performans değerlendirmelerini getir
   * Requirements: 16.6
   */
  async getByPeriod(reviewPeriod: string): Promise<any> {
    try {
      const reviews = await this.service.findByPeriod(reviewPeriod)
      return this.success(reviews)
    } catch (error) {
      return this.handleError(error, 'Dönem performans değerlendirmeleri getirme')
    }
  }

  /**
   * Performans değerlendirmesini gönder
   * Requirements: 16.5
   */
  async submit(id: number, userId?: number): Promise<any> {
    try {
      const review = await this.service.submit(id, userId)
      return this.success(review, 'Performans değerlendirmesi başarıyla gönderildi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Performans değerlendirmesi gönderme')
    }
  }

  /**
   * Performans değerlendirmesini onayla
   * Requirements: 16.2
   */
  async acknowledge(id: number, userId?: number): Promise<any> {
    try {
      const review = await this.service.acknowledge(id, userId)
      return this.success(review, 'Performans değerlendirmesi başarıyla onaylandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Performans değerlendirmesi onaylama')
    }
  }

  /**
   * Performans değerlendirmesini sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      const review = await this.service.delete(id, userId)
      return this.success(review, 'Performans değerlendirmesi başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Performans değerlendirmesi silme')
    }
  }
}

export default PerformanceController
