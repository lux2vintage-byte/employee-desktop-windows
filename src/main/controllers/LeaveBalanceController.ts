import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { LeaveBalanceService, CreateLeaveBalanceDto, UpdateLeaveBalanceDto, BusinessRuleError, ValidationError } from '../services/LeaveBalanceService'
import { LeaveBalanceRepository, LeaveBalanceFilterOptions } from '../repositories/LeaveBalanceRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * LeaveBalance Controller
 * İzin bakiyeleri CRUD operasyonları
 * Requirements: 11.1-11.7
 */
export class LeaveBalanceController extends BaseController {
  private service: LeaveBalanceService
  private repository: LeaveBalanceRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new LeaveBalanceRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    // LeaveBalance doesn't support soft delete, but we can still use audit logger
    this.service = new LeaveBalanceService(this.repository)
  }

  /**
   * İzin bakiyesi oluştur
   * Requirements: 11.1, 11.2, 11.3
   */
  async create(employeeId: number, year: number, userId?: number): Promise<any> {
    try {
      const balance = await this.service.create(employeeId, year, userId)
      return this.success(balance, 'İzin bakiyesi başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin bakiyesi oluşturma')
    }
  }

  /**
   * İzin bakiyesi getir
   */
  async getById(id: number): Promise<any> {
    try {
      const balance = await this.service.findById(id)
      if (!balance) {
        return this.error(['İzin bakiyesi bulunamadı'], 404)
      }
      return this.success(balance)
    } catch (error) {
      return this.handleError(error, 'İzin bakiyesi getirme')
    }
  }

  /**
   * Personel ve yıl ile izin bakiyesi getir
   */
  async getBalance(employeeId: number, year: number): Promise<any> {
    try {
      const balance = await this.service.getBalance(employeeId, year)
      if (!balance) {
        return this.error(['İzin bakiyesi bulunamadı'], 404)
      }
      return this.success(balance)
    } catch (error) {
      return this.handleError(error, 'İzin bakiyesi getirme')
    }
  }

  /**
   * Tüm izin bakiyelerini getir
   */
  async getAll(options: LeaveBalanceFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'İzin bakiyeleri listesi getirme')
    }
  }

  /**
   * Personel bazlı izin bakiyelerini getir
   */
  async getByEmployee(employeeId: number): Promise<any> {
    try {
      const balances = await this.service.findByEmployee(employeeId)
      return this.success(balances)
    } catch (error) {
      return this.handleError(error, 'Personel izin bakiyeleri getirme')
    }
  }

  /**
   * Yıl bazlı izin bakiyelerini getir
   */
  async getByYear(year: number): Promise<any> {
    try {
      const balances = await this.service.findByYear(year)
      return this.success(balances)
    } catch (error) {
      return this.handleError(error, 'Yıl bazlı izin bakiyeleri getirme')
    }
  }

  /**
   * İzin bakiyesi güncelle
   */
  async update(id: number, data: UpdateLeaveBalanceDto, userId?: number): Promise<any> {
    try {
      const balance = await this.service.update(id, data, userId)
      return this.success(balance, 'İzin bakiyesi başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin bakiyesi güncelleme')
    }
  }

  /**
   * Kullanılan günleri düş
   * Requirements: 11.7
   */
  async deductDays(employeeId: number, year: number, days: number, userId?: number): Promise<any> {
    try {
      const balance = await this.service.deductDays(employeeId, year, days, userId)
      return this.success(balance, `${days} gün izin bakiyesinden düşüldü`)
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin bakiyesi düşme')
    }
  }

  /**
   * Kullanılan günleri ekle (iptal durumunda)
   */
  async addDays(employeeId: number, year: number, days: number, userId?: number): Promise<any> {
    try {
      const balance = await this.service.addDays(employeeId, year, days, userId)
      return this.success(balance, `${days} gün izin bakiyesine eklendi`)
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin bakiyesi ekleme')
    }
  }

  /**
   * Yıl sonu devir işlemi
   * Requirements: 11.6
   */
  async transferToNextYear(employeeId: number, fromYear: number, userId?: number): Promise<any> {
    try {
      const balance = await this.service.transferToNextYear(employeeId, fromYear, userId)
      return this.success(balance, `${fromYear} yılından ${fromYear + 1} yılına izin devri yapıldı`)
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin devri')
    }
  }

  /**
   * Kıdeme göre yıllık izin hakkı hesapla
   * Requirements: 11.5
   */
  async calculateEntitlement(employeeId: number, year: number): Promise<any> {
    try {
      const entitlement = await this.service.calculateEntitlement(employeeId, year)
      return this.success({ entitlement })
    } catch (error) {
      return this.handleError(error, 'İzin hakkı hesaplama')
    }
  }

  /**
   * Yıllık bakiyeleri toplu oluştur
   * Requirements: 11.3
   */
  async initializeYearlyBalances(year: number, userId?: number): Promise<any> {
    try {
      const balances = await this.service.initializeYearlyBalances(year, userId)
      return this.success(balances, `${balances.length} personel için izin bakiyesi oluşturuldu`)
    } catch (error) {
      return this.handleError(error, 'Yıllık bakiye oluşturma')
    }
  }
}

export default LeaveBalanceController
