import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { DisciplinaryService, CreateDisciplinaryActionDto, UpdateDisciplinaryActionDto, BusinessRuleError, ValidationError } from '../services/DisciplinaryService'
import { DisciplinaryRepository, DisciplinaryFilterOptions, ViolationType, ActionTakenType } from '../repositories/DisciplinaryRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Disciplinary Controller
 * Disiplin kayıtları CRUD operasyonları
 * Requirements: 18.1-18.6
 */
export class DisciplinaryController extends BaseController {
  private service: DisciplinaryService
  private repository: DisciplinaryRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new DisciplinaryRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    
    this.service = new DisciplinaryService(this.repository)
  }

  /**
   * Disiplin kaydı oluştur
   * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
   */
  async create(data: CreateDisciplinaryActionDto, userId?: number): Promise<any> {
    try {
      const disciplinaryAction = await this.service.create(data, userId)
      return this.success(disciplinaryAction, 'Disiplin kaydı başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Disiplin kaydı oluşturma')
    }
  }

  /**
   * Disiplin kaydı güncelle
   * Requirements: 18.2, 18.3
   */
  async update(id: number, data: UpdateDisciplinaryActionDto, userId?: number): Promise<any> {
    try {
      const disciplinaryAction = await this.service.update(id, data, userId)
      return this.success(disciplinaryAction, 'Disiplin kaydı başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Disiplin kaydı güncelleme')
    }
  }

  /**
   * Disiplin kaydı sil
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      const disciplinaryAction = await this.service.delete(id, userId)
      return this.success(disciplinaryAction, 'Disiplin kaydı başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Disiplin kaydı silme')
    }
  }

  /**
   * Disiplin kaydı getir
   */
  async getById(id: number): Promise<any> {
    try {
      const disciplinaryAction = await this.service.findById(id)
      if (!disciplinaryAction) {
        return this.error(['Disiplin kaydı bulunamadı'], 404)
      }
      return this.success(disciplinaryAction)
    } catch (error) {
      return this.handleError(error, 'Disiplin kaydı getirme')
    }
  }

  /**
   * Tüm disiplin kayıtlarını getir
   */
  async getAll(options: DisciplinaryFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Disiplin kayıtları getirme')
    }
  }

  /**
   * Personel bazlı disiplin kayıtlarını getir
   */
  async getByEmployee(employeeId: number): Promise<any> {
    try {
      const disciplinaryActions = await this.service.findByEmployee(employeeId)
      return this.success(disciplinaryActions)
    } catch (error) {
      return this.handleError(error, 'Personel disiplin kayıtları getirme')
    }
  }

  /**
   * İhlal tipi bazlı disiplin kayıtlarını getir
   * Requirements: 18.1
   */
  async getByViolationType(violationType: ViolationType): Promise<any> {
    try {
      const disciplinaryActions = await this.service.findByViolationType(violationType)
      return this.success(disciplinaryActions)
    } catch (error) {
      return this.handleError(error, 'İhlal tipi disiplin kayıtları getirme')
    }
  }

  /**
   * Alınan aksiyon bazlı disiplin kayıtlarını getir
   */
  async getByActionTaken(actionTaken: ActionTakenType): Promise<any> {
    try {
      const disciplinaryActions = await this.service.findByActionTaken(actionTaken)
      return this.success(disciplinaryActions)
    } catch (error) {
      return this.handleError(error, 'Aksiyon tipi disiplin kayıtları getirme')
    }
  }

  /**
   * Tarih aralığında disiplin kayıtlarını getir
   */
  async getByDateRange(startDate: string, endDate: string): Promise<any> {
    try {
      const disciplinaryActions = await this.service.findByDateRange(
        new Date(startDate),
        new Date(endDate)
      )
      return this.success(disciplinaryActions)
    } catch (error) {
      return this.handleError(error, 'Tarih aralığı disiplin kayıtları getirme')
    }
  }

  /**
   * Maaş kesintisi olan disiplin kayıtlarını getir
   * Requirements: 18.6
   */
  async getSalaryDeductions(): Promise<any> {
    try {
      const disciplinaryActions = await this.service.findSalaryDeductions()
      return this.success(disciplinaryActions)
    } catch (error) {
      return this.handleError(error, 'Maaş kesintisi disiplin kayıtları getirme')
    }
  }

  /**
   * Personelin disiplin kaydı sayısını getir
   */
  async getCountByEmployee(employeeId: number): Promise<any> {
    try {
      const count = await this.service.getCountByEmployee(employeeId)
      return this.success({ count })
    } catch (error) {
      return this.handleError(error, 'Personel disiplin kaydı sayısı getirme')
    }
  }

  /**
   * Personelin belirli ihlal tipindeki kayıt sayısını getir
   */
  async getCountByEmployeeAndViolationType(employeeId: number, violationType: ViolationType): Promise<any> {
    try {
      const count = await this.service.getCountByEmployeeAndViolationType(employeeId, violationType)
      return this.success({ count })
    } catch (error) {
      return this.handleError(error, 'Personel ihlal tipi kayıt sayısı getirme')
    }
  }
}

export default DisciplinaryController
