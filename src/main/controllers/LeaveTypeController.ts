import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { LeaveTypeService, CreateLeaveTypeDto, UpdateLeaveTypeDto, BusinessRuleError, ValidationError } from '../services/LeaveTypeService'
import { LeaveTypeRepository, LeaveTypeFilterOptions } from '../repositories/LeaveTypeRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * LeaveType Controller
 * İzin türleri CRUD operasyonları
 * Requirements: 9.1-9.6
 */
export class LeaveTypeController extends BaseController {
  private service: LeaveTypeService
  private repository: LeaveTypeRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new LeaveTypeRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new LeaveTypeService(this.repository)
  }

  /**
   * İzin türü oluştur
   * Requirements: 9.1, 9.2
   */
  async create(data: CreateLeaveTypeDto, userId?: number): Promise<any> {
    try {
      const leaveType = await this.service.create(data, userId)
      return this.success(leaveType, 'İzin türü başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin türü oluşturma')
    }
  }

  /**
   * İzin türü getir
   */
  async getById(id: number): Promise<any> {
    try {
      const leaveType = await this.service.findById(id)
      if (!leaveType) {
        return this.error(['İzin türü bulunamadı'], 404)
      }
      return this.success(leaveType)
    } catch (error) {
      return this.handleError(error, 'İzin türü getirme')
    }
  }

  /**
   * Tüm izin türlerini getir
   */
  async getAll(options: LeaveTypeFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'İzin türleri listesi getirme')
    }
  }

  /**
   * Tüm izin türlerini sayfalama olmadan getir
   */
  async getAllWithoutPagination(): Promise<any> {
    try {
      const leaveTypes = await this.service.findAllWithoutPagination()
      return this.success(leaveTypes)
    } catch (error) {
      return this.handleError(error, 'İzin türleri listesi getirme')
    }
  }

  /**
   * Ücretli izin türlerini getir
   * Requirements: 9.3
   */
  async getPaidLeaveTypes(): Promise<any> {
    try {
      const leaveTypes = await this.service.findPaidLeaveTypes()
      return this.success(leaveTypes)
    } catch (error) {
      return this.handleError(error, 'Ücretli izin türleri getirme')
    }
  }

  /**
   * Ücretsiz izin türlerini getir
   * Requirements: 9.3
   */
  async getUnpaidLeaveTypes(): Promise<any> {
    try {
      const leaveTypes = await this.service.findUnpaidLeaveTypes()
      return this.success(leaveTypes)
    } catch (error) {
      return this.handleError(error, 'Ücretsiz izin türleri getirme')
    }
  }

  /**
   * İzin türü güncelle
   * Requirements: 9.2
   */
  async update(id: number, data: UpdateLeaveTypeDto, userId?: number): Promise<any> {
    try {
      const leaveType = await this.service.update(id, data, userId)
      return this.success(leaveType, 'İzin türü başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin türü güncelleme')
    }
  }

  /**
   * İzin türü sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'İzin türü başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'İzin türü silme')
    }
  }

  /**
   * Varsayılan izin türlerini seed et
   * Requirements: 9.6
   */
  async seedDefaults(userId?: number): Promise<any> {
    try {
      const created = await this.service.seedDefaults(userId)
      return this.success(created, `${created.length} varsayılan izin türü oluşturuldu`)
    } catch (error) {
      return this.handleError(error, 'Varsayılan izin türleri oluşturma')
    }
  }
}

export default LeaveTypeController
