import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { AdvanceService, CreateAdvanceDto, BusinessRuleError, ValidationError } from '../services/AdvanceService'
import { AdvanceRepository, AdvanceFilterOptions } from '../repositories/AdvanceRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Advance Controller
 * Avans CRUD operasyonları
 * Requirements: 15.1-15.7
 */
export class AdvanceController extends BaseController {
  private service: AdvanceService
  private repository: AdvanceRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new AdvanceRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    
    this.service = new AdvanceService(this.repository)
  }

  /**
   * Avans talebi oluştur
   * Requirements: 15.1, 15.5, 15.7
   */
  async request(employeeId: number, data: CreateAdvanceDto, userId?: number): Promise<any> {
    try {
      const advance = await this.service.request(employeeId, data, userId)
      return this.success(advance, 'Avans talebi başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Avans talebi oluşturma')
    }
  }

  /**
   * Avans getir
   */
  async getById(id: number): Promise<any> {
    try {
      const advance = await this.service.findById(id)
      if (!advance) {
        return this.error(['Avans bulunamadı'], 404)
      }
      return this.success(advance)
    } catch (error) {
      return this.handleError(error, 'Avans getirme')
    }
  }

  /**
   * Tüm avansları getir
   */
  async getAll(options: AdvanceFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Avans listesi getirme')
    }
  }

  /**
   * Personel bazlı avansları getir
   */
  async getByEmployee(employeeId: number): Promise<any> {
    try {
      const advances = await this.service.findByEmployee(employeeId)
      return this.success(advances)
    } catch (error) {
      return this.handleError(error, 'Personel avansları getirme')
    }
  }

  /**
   * Bekleyen avansları getir
   */
  async getPending(): Promise<any> {
    try {
      const advances = await this.service.findPending()
      return this.success(advances)
    } catch (error) {
      return this.handleError(error, 'Bekleyen avanslar getirme')
    }
  }

  /**
   * Kesinti dönemi bazlı avansları getir
   */
  async getByDeductionPeriod(deductionPeriod: string): Promise<any> {
    try {
      const advances = await this.service.findByDeductionPeriod(deductionPeriod)
      return this.success(advances)
    } catch (error) {
      return this.handleError(error, 'Kesinti dönemi avansları getirme')
    }
  }

  /**
   * Avansı onayla
   * Requirements: 15.3
   */
  async approve(id: number, approverId: number, deductionPeriod: string, userId?: number): Promise<any> {
    try {
      const advance = await this.service.approve(id, approverId, deductionPeriod, userId)
      return this.success(advance, 'Avans başarıyla onaylandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Avans onaylama')
    }
  }

  /**
   * Avansı reddet
   */
  async reject(id: number, approverId: number, userId?: number): Promise<any> {
    try {
      const advance = await this.service.reject(id, approverId, userId)
      return this.success(advance, 'Avans başarıyla reddedildi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Avans reddetme')
    }
  }

  /**
   * Avansı ödenmiş olarak işaretle
   * Requirements: 15.4
   */
  async markAsPaid(id: number, paymentDate: Date, userId?: number): Promise<any> {
    try {
      const advance = await this.service.markAsPaid(id, paymentDate, userId)
      return this.success(advance, 'Avans ödenmiş olarak işaretlendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Avans ödeme işaretleme')
    }
  }

  /**
   * Avansı kesilmiş olarak işaretle
   * Requirements: 15.6
   */
  async markAsDeducted(id: number, userId?: number): Promise<any> {
    try {
      const advance = await this.service.markAsDeducted(id, userId)
      return this.success(advance, 'Avans kesilmiş olarak işaretlendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Avans kesinti işaretleme')
    }
  }

  /**
   * Personelin bekleyen avansı var mı kontrol et
   * Requirements: 15.7
   */
  async hasPendingAdvance(employeeId: number): Promise<any> {
    try {
      const hasPending = await this.service.hasPendingAdvance(employeeId)
      return this.success({ hasPending })
    } catch (error) {
      return this.handleError(error, 'Bekleyen avans kontrolü')
    }
  }

  /**
   * Personelin maksimum avans tutarını getir
   * Requirements: 15.5
   */
  async getMaxAdvanceAmount(employeeId: number): Promise<any> {
    try {
      const maxAmount = await this.service.getMaxAdvanceAmount(employeeId)
      return this.success({ maxAmount })
    } catch (error) {
      return this.handleError(error, 'Maksimum avans tutarı getirme')
    }
  }

  /**
   * Avans tutarını doğrula
   * Requirements: 15.5
   */
  async validateAmount(employeeId: number, amount: number): Promise<any> {
    try {
      const isValid = await this.service.validateAmount(employeeId, amount)
      return this.success({ isValid })
    } catch (error) {
      return this.handleError(error, 'Avans tutarı doğrulama')
    }
  }
}

export default AdvanceController
