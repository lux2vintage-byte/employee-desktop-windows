import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { TrainingService, CreateTrainingDto, UpdateTrainingDto, BusinessRuleError, ValidationError } from '../services/TrainingService'
import { TrainingRepository, TrainingFilterOptions } from '../repositories/TrainingRepository'
import { EmployeeTrainingRepository, EmployeeTrainingFilterOptions } from '../repositories/EmployeeTrainingRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Training Controller
 * Eğitim CRUD operasyonları
 * Requirements: 17.1-17.7
 */
export class TrainingController extends BaseController {
  private service: TrainingService
  private trainingRepository: TrainingRepository
  private employeeTrainingRepository: EmployeeTrainingRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.trainingRepository = new TrainingRepository(this.prisma)
    this.employeeTrainingRepository = new EmployeeTrainingRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.trainingRepository.setAuditLogger(auditLogger)
    
    this.service = new TrainingService(this.trainingRepository, this.employeeTrainingRepository)
  }

  // ==================== TRAINING CATALOG ====================

  /**
   * Eğitim oluştur
   * Requirements: 17.1
   */
  async createTraining(data: CreateTrainingDto, userId?: number): Promise<any> {
    try {
      const training = await this.service.createTraining(data, userId)
      return this.success(training, 'Eğitim başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Eğitim oluşturma')
    }
  }

  /**
   * Eğitim güncelle
   */
  async updateTraining(id: number, data: UpdateTrainingDto, userId?: number): Promise<any> {
    try {
      const training = await this.service.updateTraining(id, data, userId)
      return this.success(training, 'Eğitim başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Eğitim güncelleme')
    }
  }

  /**
   * Eğitim sil
   */
  async deleteTraining(id: number, userId?: number): Promise<any> {
    try {
      const training = await this.service.deleteTraining(id, userId)
      return this.success(training, 'Eğitim başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Eğitim silme')
    }
  }

  /**
   * Eğitim getir
   */
  async getTrainingById(id: number): Promise<any> {
    try {
      const training = await this.service.findTrainingById(id)
      if (!training) {
        return this.error(['Eğitim bulunamadı'], 404)
      }
      return this.success(training)
    } catch (error) {
      return this.handleError(error, 'Eğitim getirme')
    }
  }

  /**
   * Tüm eğitimleri getir
   */
  async getAllTrainings(options: TrainingFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAllTrainings(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Eğitimler getirme')
    }
  }

  /**
   * Kategori bazlı eğitimleri getir
   */
  async getTrainingsByCategory(category: string): Promise<any> {
    try {
      const trainings = await this.service.findTrainingsByCategory(category)
      return this.success(trainings)
    } catch (error) {
      return this.handleError(error, 'Kategori eğitimleri getirme')
    }
  }

  /**
   * Sağlayıcı bazlı eğitimleri getir
   */
  async getTrainingsByProvider(provider: string): Promise<any> {
    try {
      const trainings = await this.service.findTrainingsByProvider(provider)
      return this.success(trainings)
    } catch (error) {
      return this.handleError(error, 'Sağlayıcı eğitimleri getirme')
    }
  }

  /**
   * Tüm kategorileri getir
   */
  async getAllCategories(): Promise<any> {
    try {
      const categories = await this.service.getAllCategories()
      return this.success(categories)
    } catch (error) {
      return this.handleError(error, 'Kategoriler getirme')
    }
  }

  /**
   * Tüm sağlayıcıları getir
   */
  async getAllProviders(): Promise<any> {
    try {
      const providers = await this.service.getAllProviders()
      return this.success(providers)
    } catch (error) {
      return this.handleError(error, 'Sağlayıcılar getirme')
    }
  }

  // ==================== EMPLOYEE TRAINING ====================

  /**
   * Personeli eğitime ata
   * Requirements: 17.7
   */
  async assignEmployee(trainingId: number, employeeId: number, userId?: number): Promise<any> {
    try {
      const employeeTraining = await this.service.assignEmployee(trainingId, employeeId, userId)
      return this.success(employeeTraining, 'Personel eğitime başarıyla atandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel eğitime atama')
    }
  }

  /**
   * Eğitimi tamamla
   * Requirements: 17.4, 17.6
   */
  async completeTraining(employeeTrainingId: number, certificateUrl?: string, userId?: number): Promise<any> {
    try {
      const employeeTraining = await this.service.completeTraining(employeeTrainingId, certificateUrl, userId)
      return this.success(employeeTraining, 'Eğitim başarıyla tamamlandı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Eğitim tamamlama')
    }
  }

  /**
   * Eğitimi başarısız olarak işaretle
   * Requirements: 17.3
   */
  async failTraining(employeeTrainingId: number, userId?: number): Promise<any> {
    try {
      const employeeTraining = await this.service.failTraining(employeeTrainingId, userId)
      return this.success(employeeTraining, 'Eğitim başarısız olarak işaretlendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Eğitim başarısız işaretleme')
    }
  }

  /**
   * Personeli eğitimden çıkar
   */
  async removeEmployeeFromTraining(employeeTrainingId: number, userId?: number): Promise<any> {
    try {
      const employeeTraining = await this.service.removeEmployeeFromTraining(employeeTrainingId, userId)
      return this.success(employeeTraining, 'Personel eğitimden başarıyla çıkarıldı')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel eğitimden çıkarma')
    }
  }

  /**
   * Personel eğitim kaydı getir
   */
  async getEmployeeTrainingById(id: number): Promise<any> {
    try {
      const employeeTraining = await this.service.findEmployeeTrainingById(id)
      if (!employeeTraining) {
        return this.error(['Personel eğitim kaydı bulunamadı'], 404)
      }
      return this.success(employeeTraining)
    } catch (error) {
      return this.handleError(error, 'Personel eğitim kaydı getirme')
    }
  }

  /**
   * Tüm personel eğitim kayıtlarını getir
   */
  async getAllEmployeeTrainings(options: EmployeeTrainingFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAllEmployeeTrainings(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Personel eğitim kayıtları getirme')
    }
  }

  /**
   * Personel bazlı eğitim kayıtlarını getir
   */
  async getEmployeeTrainings(employeeId: number): Promise<any> {
    try {
      const trainings = await this.service.findEmployeeTrainings(employeeId)
      return this.success(trainings)
    } catch (error) {
      return this.handleError(error, 'Personel eğitimleri getirme')
    }
  }

  /**
   * Eğitim katılımcılarını getir
   */
  async getTrainingParticipants(trainingId: number): Promise<any> {
    try {
      const participants = await this.service.findTrainingParticipants(trainingId)
      return this.success(participants)
    } catch (error) {
      return this.handleError(error, 'Eğitim katılımcıları getirme')
    }
  }

  /**
   * Personelin tamamlanmış eğitim sayısını getir
   */
  async getCompletedTrainingCount(employeeId: number): Promise<any> {
    try {
      const count = await this.service.getCompletedTrainingCount(employeeId)
      return this.success({ count })
    } catch (error) {
      return this.handleError(error, 'Tamamlanmış eğitim sayısı getirme')
    }
  }

  /**
   * Personelin planlanan eğitim sayısını getir
   */
  async getPlannedTrainingCount(employeeId: number): Promise<any> {
    try {
      const count = await this.service.getPlannedTrainingCount(employeeId)
      return this.success({ count })
    } catch (error) {
      return this.handleError(error, 'Planlanan eğitim sayısı getirme')
    }
  }
}

export default TrainingController
