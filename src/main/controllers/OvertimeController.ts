import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { OvertimeService, CreateOvertimeDto, UpdateOvertimeDto, BusinessRuleError, ValidationError } from '../services/OvertimeService'
import { OvertimeRepository, OvertimeFilterOptions } from '../repositories/OvertimeRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Overtime Controller
 * Fazla mesai CRUD operasyonları
 * Requirements: 8.1-8.6
 */
export class OvertimeController extends BaseController {
  private service: OvertimeService
  private repository: OvertimeRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new OvertimeRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new OvertimeService(this.repository)
  }

  /**
   * Fazla mesai kaydı oluştur
   * Requirements: 8.2, 8.3, 8.6
   */
  async create(data: CreateOvertimeDto, userId?: number): Promise<any> {
    try {
      const overtime = await this.service.create(data, userId)
      return this.success(overtime, 'Fazla mesai kaydı başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Fazla mesai kaydı oluşturma')
    }
  }

  /**
   * Fazla mesai kaydı getir
   */
  async getById(id: number): Promise<any> {
    try {
      const overtime = await this.service.findById(id)
      if (!overtime) {
        return this.error(['Fazla mesai kaydı bulunamadı'], 404)
      }
      return this.success(overtime)
    } catch (error) {
      return this.handleError(error, 'Fazla mesai kaydı getirme')
    }
  }

  /**
   * Tüm fazla mesai kayıtlarını getir
   */
  async getAll(options: OvertimeFilterOptions = {}): Promise<any> {
    try {
      // String tarihleri Date'e çevir
      const processedOptions = { ...options }
      if (processedOptions.startDate && typeof processedOptions.startDate === 'string') {
        processedOptions.startDate = new Date(processedOptions.startDate)
      }
      if (processedOptions.endDate && typeof processedOptions.endDate === 'string') {
        processedOptions.endDate = new Date(processedOptions.endDate)
      }
      
      const result = await this.service.findAll(processedOptions)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Fazla mesai listesi getirme')
    }
  }

  /**
   * Personel bazlı fazla mesai kayıtlarını getir
   */
  async getByEmployee(employeeId: number, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const dateRange = startDate && endDate ? { startDate, endDate } : undefined
      const records = await this.service.findByEmployee(employeeId, dateRange)
      return this.success(records)
    } catch (error) {
      return this.handleError(error, 'Personel fazla mesai kayıtları getirme')
    }
  }

  /**
   * Bekleyen fazla mesai kayıtlarını getir
   * Requirements: 8.1
   */
  async getPending(): Promise<any> {
    try {
      const records = await this.service.findPending()
      return this.success(records)
    } catch (error) {
      return this.handleError(error, 'Bekleyen fazla mesai kayıtları getirme')
    }
  }

  /**
   * Fazla mesai kaydı güncelle
   * Requirements: 8.3, 8.6
   */
  async update(id: number, data: UpdateOvertimeDto, userId?: number): Promise<any> {
    try {
      const overtime = await this.service.update(id, data, userId)
      return this.success(overtime, 'Fazla mesai kaydı başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Fazla mesai kaydı güncelleme')
    }
  }

  /**
   * Fazla mesai kaydı sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Fazla mesai kaydı başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Fazla mesai kaydı silme')
    }
  }

  /**
   * Fazla mesai kaydını onayla
   * Requirements: 8.2, 8.4
   */
  async approve(id: number, approverId: number, userId?: number): Promise<any> {
    try {
      const overtime = await this.service.approve(id, approverId, userId)
      return this.success(overtime, 'Fazla mesai kaydı başarıyla onaylandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Fazla mesai kaydı onaylama')
    }
  }

  /**
   * Fazla mesai kaydını reddet
   * Requirements: 8.2
   */
  async reject(id: number, approverId: number, userId?: number): Promise<any> {
    try {
      const overtime = await this.service.reject(id, approverId, userId)
      return this.success(overtime, 'Fazla mesai kaydı başarıyla reddedildi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Fazla mesai kaydı reddetme')
    }
  }

  /**
   * Fazla mesai ücreti hesapla
   * Requirements: 8.5
   */
  async calculateOvertimePay(id: number, hourlyRate: number): Promise<any> {
    try {
      const overtime = await this.service.findById(id)
      if (!overtime) {
        return this.error(['Fazla mesai kaydı bulunamadı'], 404)
      }
      const pay = this.service.calculateOvertimePay(overtime, hourlyRate)
      return this.success({ pay })
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Fazla mesai ücreti hesaplama')
    }
  }

  /**
   * Aylık toplam onaylanmış mesai saati getir
   */
  async getTotalApprovedHours(employeeId: number, month: number, year: number): Promise<any> {
    try {
      const hours = await this.service.getTotalApprovedHours(employeeId, month, year)
      return this.success({ hours })
    } catch (error) {
      return this.handleError(error, 'Toplam mesai saati getirme')
    }
  }

  /**
   * Aylık toplam mesai ücreti hesapla
   */
  async calculateMonthlyOvertimePay(employeeId: number, month: number, year: number, hourlyRate: number): Promise<any> {
    try {
      const pay = await this.service.calculateMonthlyOvertimePay(employeeId, month, year, hourlyRate)
      return this.success({ pay })
    } catch (error) {
      return this.handleError(error, 'Aylık mesai ücreti hesaplama')
    }
  }
}

export default OvertimeController
