import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { LeaveRequestService, CreateLeaveRequestDto, UpdateLeaveRequestDto, BusinessRuleError, ValidationError } from '../services/LeaveRequestService'
import { LeaveRequestRepository, LeaveRequestFilterOptions } from '../repositories/LeaveRequestRepository'
import { LeaveBalanceRepository } from '../repositories/LeaveBalanceRepository'
import { LeaveBalanceService } from '../services/LeaveBalanceService'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * LeaveRequest Controller
 * İzin talepleri CRUD operasyonları
 * Requirements: 10.1-10.9
 */
export class LeaveRequestController extends BaseController {
  private service: LeaveRequestService
  private repository: LeaveRequestRepository
  private balanceService: LeaveBalanceService
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new LeaveRequestRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new LeaveRequestService(this.repository)

    // Initialize balance service for deduction callback
    const balanceRepository = new LeaveBalanceRepository(this.prisma)
    this.balanceService = new LeaveBalanceService(balanceRepository)

    // Connect leave request service to balance service
    this.service.setLeaveBalanceUpdateCallback(async (employeeId, year, days) => {
      await this.balanceService.deductDays(employeeId, year, days)
    })
  }

  /**
   * İzin talebi oluştur
   * Requirements: 10.1, 10.3, 10.4, 10.7, 10.8, 10.9
   */
  async create(data: CreateLeaveRequestDto, userId?: number): Promise<any> {
    try {
      const leaveRequest = await this.service.create(data, userId)
      return this.success(leaveRequest, 'İzin talebi başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin talebi oluşturma')
    }
  }

  /**
   * İzin talebi getir
   */
  async getById(id: number): Promise<any> {
    try {
      const leaveRequest = await this.service.findById(id)
      if (!leaveRequest) {
        return this.error(['İzin talebi bulunamadı'], 404)
      }
      return this.success(leaveRequest)
    } catch (error) {
      return this.handleError(error, 'İzin talebi getirme')
    }
  }

  /**
   * Tüm izin taleplerini getir
   */
  async getAll(options: LeaveRequestFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'İzin talepleri listesi getirme')
    }
  }

  /**
   * Personel bazlı izin taleplerini getir
   */
  async getByEmployee(employeeId: number): Promise<any> {
    try {
      const leaveRequests = await this.service.findByEmployee(employeeId)
      return this.success(leaveRequests)
    } catch (error) {
      return this.handleError(error, 'Personel izin talepleri getirme')
    }
  }

  /**
   * Bekleyen izin taleplerini getir
   */
  async getPending(): Promise<any> {
    try {
      const leaveRequests = await this.service.findPending()
      return this.success(leaveRequests)
    } catch (error) {
      return this.handleError(error, 'Bekleyen izin talepleri getirme')
    }
  }

  /**
   * Tarih aralığında izin taleplerini getir
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<any> {
    try {
      const leaveRequests = await this.service.findByDateRange(startDate, endDate)
      return this.success(leaveRequests)
    } catch (error) {
      return this.handleError(error, 'Tarih aralığı izin talepleri getirme')
    }
  }

  /**
   * İzin talebi güncelle
   */
  async update(id: number, data: UpdateLeaveRequestDto, userId?: number): Promise<any> {
    try {
      const leaveRequest = await this.service.update(id, data, userId)
      return this.success(leaveRequest, 'İzin talebi başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin talebi güncelleme')
    }
  }

  /**
   * İzin talebini onayla
   * Requirements: 10.5, 10.6
   */
  async approve(id: number, approverId: number, userId?: number): Promise<any> {
    try {
      const leaveRequest = await this.service.approve(id, approverId, userId)
      return this.success(leaveRequest, 'İzin talebi başarıyla onaylandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin talebi onaylama')
    }
  }

  /**
   * İzin talebini reddet
   */
  async reject(id: number, approverId: number, userId?: number): Promise<any> {
    try {
      const leaveRequest = await this.service.reject(id, approverId, userId)
      return this.success(leaveRequest, 'İzin talebi reddedildi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin talebi reddetme')
    }
  }

  /**
   * İzin talebini iptal et
   */
  async cancel(id: number, userId?: number): Promise<any> {
    try {
      const leaveRequest = await this.service.cancel(id, userId)
      return this.success(leaveRequest, 'İzin talebi iptal edildi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin talebi iptal etme')
    }
  }

  /**
   * İzin talebi sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'İzin talebi başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin talebi silme')
    }
  }

  /**
   * Gün sayısı hesapla
   * Requirements: 10.3, 10.4
   */
  calculateDayCount(startDate: Date, endDate: Date, isHalfDay: boolean = false): any {
    try {
      const dayCount = this.service.calculateDayCount(startDate, endDate, isHalfDay)
      return this.success({ dayCount })
    } catch (error) {
      return this.handleError(error, 'Gün sayısı hesaplama')
    }
  }

  /**
   * Çakışma kontrolü
   * Requirements: 10.9
   */
  async checkOverlap(employeeId: number, startDate: Date, endDate: Date): Promise<any> {
    try {
      const hasOverlap = await this.service.checkOverlap(employeeId, startDate, endDate)
      return this.success({ hasOverlap })
    } catch (error) {
      return this.handleError(error, 'Çakışma kontrolü')
    }
  }
}

export default LeaveRequestController
