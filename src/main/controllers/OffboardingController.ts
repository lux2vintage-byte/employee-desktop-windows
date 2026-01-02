import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { 
  OffboardingService, 
  CreateResignationDto, 
  UpdateResignationDto,
  CreateExitInterviewDto,
  UpdateExitInterviewDto,
  BusinessRuleError, 
  ValidationError 
} from '../services/OffboardingService'
import { ResignationRepository, ResignationFilterOptions } from '../repositories/ResignationRepository'
import { ExitInterviewRepository } from '../repositories/ExitInterviewRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Offboarding Controller
 * İşten ayrılma ve çıkış mülakatı CRUD operasyonları
 * Requirements: 19.1-19.7
 */
export class OffboardingController extends BaseController {
  private service: OffboardingService
  private resignationRepository: ResignationRepository
  private exitInterviewRepository: ExitInterviewRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.resignationRepository = new ResignationRepository(this.prisma)
    this.exitInterviewRepository = new ExitInterviewRepository(this.prisma)
    
    const auditLogger = new AuditLoggerService(this.prisma)
    this.resignationRepository.setAuditLogger(auditLogger)
    this.exitInterviewRepository.setAuditLogger(auditLogger)
    
    this.service = new OffboardingService(
      this.resignationRepository,
      this.exitInterviewRepository,
      this.prisma
    )
  }

  // ==================== RESIGNATION METHODS ====================

  /**
   * Ayrılma talebi oluştur
   * Requirements: 19.1, 19.2, 19.3
   */
  async createResignation(data: CreateResignationDto, userId?: number): Promise<any> {
    try {
      const resignation = await this.service.createResignation(data, userId)
      return this.success(resignation, 'Ayrılma talebi başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Ayrılma talebi oluşturma')
    }
  }

  /**
   * Ayrılma talebini güncelle
   */
  async updateResignation(id: number, data: UpdateResignationDto, userId?: number): Promise<any> {
    try {
      const resignation = await this.service.updateResignation(id, data, userId)
      return this.success(resignation, 'Ayrılma talebi başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Ayrılma talebi güncelleme')
    }
  }

  /**
   * Ayrılma talebini getir
   */
  async getResignationById(id: number): Promise<any> {
    try {
      const resignation = await this.service.findResignationById(id)
      if (!resignation) {
        return this.error(['Ayrılma talebi bulunamadı'], 404)
      }
      return this.success(resignation)
    } catch (error) {
      return this.handleError(error, 'Ayrılma talebi getirme')
    }
  }

  /**
   * Tüm ayrılma taleplerini getir
   */
  async getAllResignations(options: ResignationFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAllResignations(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Ayrılma talepleri getirme')
    }
  }

  /**
   * Personel bazlı ayrılma talebini getir
   */
  async getResignationByEmployee(employeeId: number): Promise<any> {
    try {
      const resignation = await this.service.findResignationByEmployee(employeeId)
      return this.success(resignation)
    } catch (error) {
      return this.handleError(error, 'Personel ayrılma talebi getirme')
    }
  }

  /**
   * Bekleyen ayrılma taleplerini getir
   * Requirements: 19.1
   */
  async getPendingResignations(): Promise<any> {
    try {
      const resignations = await this.service.findPendingResignations()
      return this.success(resignations)
    } catch (error) {
      return this.handleError(error, 'Bekleyen ayrılma talepleri getirme')
    }
  }

  /**
   * Onaylanmış ayrılma taleplerini getir
   */
  async getApprovedResignations(): Promise<any> {
    try {
      const resignations = await this.service.findApprovedResignations()
      return this.success(resignations)
    } catch (error) {
      return this.handleError(error, 'Onaylanmış ayrılma talepleri getirme')
    }
  }

  /**
   * Ayrılma talebini onayla
   * Requirements: 19.3
   */
  async approveResignation(id: number, lastWorkingDay?: Date, userId?: number): Promise<any> {
    try {
      const resignation = await this.service.approveResignation(id, lastWorkingDay, userId)
      return this.success(resignation, 'Ayrılma talebi başarıyla onaylandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Ayrılma talebi onaylama')
    }
  }

  /**
   * Ayrılma talebini tamamla
   * Requirements: 19.4
   */
  async completeResignation(id: number, userId?: number): Promise<any> {
    try {
      const resignation = await this.service.completeResignation(id, userId)
      return this.success(resignation, 'Ayrılma talebi başarıyla tamamlandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Ayrılma talebi tamamlama')
    }
  }

  /**
   * Ayrılma talebini sil
   */
  async deleteResignation(id: number, userId?: number): Promise<any> {
    try {
      const resignation = await this.service.deleteResignation(id, userId)
      return this.success(resignation, 'Ayrılma talebi başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Ayrılma talebi silme')
    }
  }

  // ==================== EXIT INTERVIEW METHODS ====================

  /**
   * Çıkış mülakatı oluştur
   * Requirements: 19.5, 19.6
   */
  async createExitInterview(resignationId: number, data: CreateExitInterviewDto, userId?: number): Promise<any> {
    try {
      const exitInterview = await this.service.createExitInterview(resignationId, data, userId)
      return this.success(exitInterview, 'Çıkış mülakatı başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Çıkış mülakatı oluşturma')
    }
  }

  /**
   * Çıkış mülakatını güncelle
   */
  async updateExitInterview(id: number, data: UpdateExitInterviewDto, userId?: number): Promise<any> {
    try {
      const exitInterview = await this.service.updateExitInterview(id, data, userId)
      return this.success(exitInterview, 'Çıkış mülakatı başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Çıkış mülakatı güncelleme')
    }
  }

  /**
   * Çıkış mülakatını getir
   */
  async getExitInterviewById(id: number): Promise<any> {
    try {
      const exitInterview = await this.service.findExitInterviewById(id)
      if (!exitInterview) {
        return this.error(['Çıkış mülakatı bulunamadı'], 404)
      }
      return this.success(exitInterview)
    } catch (error) {
      return this.handleError(error, 'Çıkış mülakatı getirme')
    }
  }

  /**
   * Tüm çıkış mülakatlarını getir
   */
  async getAllExitInterviews(): Promise<any> {
    try {
      const exitInterviews = await this.service.findAllExitInterviews()
      return this.success(exitInterviews)
    } catch (error) {
      return this.handleError(error, 'Çıkış mülakatları getirme')
    }
  }

  /**
   * Resignation ID ile çıkış mülakatını getir
   */
  async getExitInterviewByResignation(resignationId: number): Promise<any> {
    try {
      const exitInterview = await this.service.findExitInterviewByResignation(resignationId)
      return this.success(exitInterview)
    } catch (error) {
      return this.handleError(error, 'Çıkış mülakatı getirme')
    }
  }

  /**
   * Çıkış mülakatını sil
   */
  async deleteExitInterview(id: number, userId?: number): Promise<any> {
    try {
      const exitInterview = await this.service.deleteExitInterview(id, userId)
      return this.success(exitInterview, 'Çıkış mülakatı başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Çıkış mülakatı silme')
    }
  }

  // ==================== SETTLEMENT METHODS ====================

  /**
   * Final settlement hesapla
   * Requirements: 19.7
   */
  async calculateFinalSettlement(resignationId: number): Promise<any> {
    try {
      const settlement = await this.service.calculateFinalSettlement(resignationId)
      return this.success(settlement)
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Final settlement hesaplama')
    }
  }
}

export default OffboardingController
