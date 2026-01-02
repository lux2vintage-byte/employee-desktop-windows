import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { AttendanceService, CreateAttendanceDto, UpdateAttendanceDto, BusinessRuleError, ValidationError } from '../services/AttendanceService'
import { AttendanceRepository, AttendanceFilterOptions, BulkAttendanceDto } from '../repositories/AttendanceRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Attendance Controller
 * Puantaj CRUD operasyonları
 * Requirements: 7.1-7.7
 */
export class AttendanceController extends BaseController {
  private service: AttendanceService
  private repository: AttendanceRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new AttendanceRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new AttendanceService(this.repository)
  }

  /**
   * Puantaj kaydı oluştur
   * Requirements: 7.1, 7.2
   */
  async create(data: CreateAttendanceDto, userId?: number): Promise<any> {
    try {
      const attendance = await this.service.create(data, userId)
      return this.success(attendance, 'Puantaj kaydı başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Puantaj kaydı oluşturma')
    }
  }

  /**
   * Puantaj kaydı getir
   */
  async getById(id: number): Promise<any> {
    try {
      const attendance = await this.service.findById(id)
      if (!attendance) {
        return this.error(['Puantaj kaydı bulunamadı'], 404)
      }
      return this.success(attendance)
    } catch (error) {
      return this.handleError(error, 'Puantaj kaydı getirme')
    }
  }

  /**
   * Tüm puantaj kayıtlarını getir
   */
  async getAll(options: AttendanceFilterOptions = {}): Promise<any> {
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
      return this.handleError(error, 'Puantaj listesi getirme')
    }
  }

  /**
   * Personel bazlı puantaj kayıtlarını getir
   */
  async getByEmployee(employeeId: number, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const dateRange = startDate && endDate ? { startDate, endDate } : undefined
      const records = await this.service.findByEmployee(employeeId, dateRange)
      return this.success(records)
    } catch (error) {
      return this.handleError(error, 'Personel puantaj kayıtları getirme')
    }
  }

  /**
   * Tarih bazlı puantaj kayıtlarını getir
   */
  async getByDate(date: Date): Promise<any> {
    try {
      const records = await this.service.findByDate(date)
      return this.success(records)
    } catch (error) {
      return this.handleError(error, 'Tarih bazlı puantaj kayıtları getirme')
    }
  }

  /**
   * Puantaj kaydı güncelle
   * Requirements: 7.4
   */
  async update(id: number, data: UpdateAttendanceDto, userId?: number): Promise<any> {
    try {
      const attendance = await this.service.update(id, data, userId)
      return this.success(attendance, 'Puantaj kaydı başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Puantaj kaydı güncelleme')
    }
  }

  /**
   * Puantaj kaydı sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Puantaj kaydı başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Puantaj kaydı silme')
    }
  }

  /**
   * Check-in işlemi
   * Requirements: 7.3
   */
  async checkIn(employeeId: number, time?: Date, userId?: number): Promise<any> {
    try {
      const attendance = await this.service.checkIn(employeeId, time, userId)
      return this.success(attendance, 'Giriş kaydı başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Giriş kaydı oluşturma')
    }
  }

  /**
   * Check-out işlemi
   * Requirements: 7.3, 7.4
   */
  async checkOut(employeeId: number, time?: Date, userId?: number): Promise<any> {
    try {
      const attendance = await this.service.checkOut(employeeId, time, userId)
      return this.success(attendance, 'Çıkış kaydı başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Çıkış kaydı oluşturma')
    }
  }

  /**
   * Mola süresi ayarla
   * Requirements: 7.5
   */
  async setBreakDuration(logId: number, minutes: number, userId?: number): Promise<any> {
    try {
      const attendance = await this.service.setBreakDuration(logId, minutes, userId)
      return this.success(attendance, 'Mola süresi başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Mola süresi güncelleme')
    }
  }

  /**
   * Durum ayarla
   * Requirements: 7.3
   */
  async setStatus(logId: number, status: string, userId?: number): Promise<any> {
    try {
      const attendance = await this.service.setStatus(logId, status as any, userId)
      return this.success(attendance, 'Durum başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Durum güncelleme')
    }
  }

  /**
   * Toplu puantaj kaydı oluştur
   * Requirements: 7.7
   */
  async bulkCreate(records: BulkAttendanceDto[], userId?: number): Promise<any> {
    try {
      const created = await this.service.bulkCreate(records, userId)
      return this.success(created, `${created.length} puantaj kaydı başarıyla oluşturuldu`)
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Toplu puantaj kaydı oluşturma')
    }
  }

  /**
   * Aylık rapor getir
   * Requirements: 7.6
   */
  async getMonthlyReport(employeeId: number, month: number, year: number): Promise<any> {
    try {
      const report = await this.service.getMonthlyReport(employeeId, month, year)
      return this.success(report)
    } catch (error) {
      return this.handleError(error, 'Aylık rapor getirme')
    }
  }

  /**
   * Çalışma saati hesapla
   * Requirements: 7.6
   */
  async calculateWorkingHours(id: number): Promise<any> {
    try {
      const attendance = await this.service.findById(id)
      if (!attendance) {
        return this.error(['Puantaj kaydı bulunamadı'], 404)
      }
      const hours = this.service.calculateWorkingHours(attendance)
      return this.success({ hours })
    } catch (error) {
      return this.handleError(error, 'Çalışma saati hesaplama')
    }
  }
}

export default AttendanceController
