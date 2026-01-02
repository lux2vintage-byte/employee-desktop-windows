import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { EmployeeDetailsService, CreateEmployeeDetailsDto, UpdateEmployeeDetailsDto, BusinessRuleError, ValidationError } from '../services/EmployeeDetailsService'
import { EmployeeDetailsRepository } from '../repositories/EmployeeDetailsRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'
import { BloodGroup, MilitaryStatus } from '../utils/validation'

/**
 * EmployeeDetails Controller
 * Personel detay bilgileri CRUD operasyonları
 * Requirements: 5.1-5.9
 */
export class EmployeeDetailsController extends BaseController {
  private service: EmployeeDetailsService
  private repository: EmployeeDetailsRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new EmployeeDetailsRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new EmployeeDetailsService(this.repository)
  }

  /**
   * Personel detay bilgisi oluştur
   * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
   */
  async create(data: CreateEmployeeDetailsDto, userId?: number): Promise<any> {
    try {
      const details = await this.service.create(data, userId)
      return this.success(details, 'Personel detay bilgisi başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel detay bilgisi oluşturma')
    }
  }

  /**
   * Personel ID ile detay bilgisi getir
   * Requirements: 5.1, 5.2
   */
  async getByEmployeeId(employeeId: number): Promise<any> {
    try {
      const details = await this.service.findByEmployeeId(employeeId)
      if (!details) {
        return this.error(['Personel detay bilgisi bulunamadı'], 404)
      }
      return this.success(details)
    } catch (error) {
      return this.handleError(error, 'Personel detay bilgisi getirme')
    }
  }

  /**
   * Personel ID ile çözülmüş detay bilgisi getir (IBAN, SGK no çözülmüş)
   */
  async getByEmployeeIdDecrypted(employeeId: number): Promise<any> {
    try {
      const details = await this.service.findByEmployeeIdDecrypted(employeeId)
      if (!details) {
        return this.error(['Personel detay bilgisi bulunamadı'], 404)
      }
      return this.success(details)
    } catch (error) {
      return this.handleError(error, 'Personel detay bilgisi getirme')
    }
  }

  /**
   * Tüm detay bilgilerini getir
   */
  async getAll(): Promise<any> {
    try {
      const details = await this.service.findAll()
      return this.success(details)
    } catch (error) {
      return this.handleError(error, 'Personel detay bilgileri getirme')
    }
  }

  /**
   * Personel detay bilgisi güncelle
   * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
   */
  async update(employeeId: number, data: UpdateEmployeeDetailsDto, userId?: number): Promise<any> {
    try {
      const details = await this.service.update(employeeId, data, userId)
      return this.success(details, 'Personel detay bilgisi başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel detay bilgisi güncelleme')
    }
  }

  /**
   * Personel detay bilgisi sil
   */
  async delete(employeeId: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(employeeId, userId)
      return this.success(null, 'Personel detay bilgisi başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel detay bilgisi silme')
    }
  }

  /**
   * Upsert - varsa güncelle, yoksa oluştur
   */
  async upsert(employeeId: number, data: UpdateEmployeeDetailsDto, userId?: number): Promise<any> {
    try {
      const details = await this.service.upsert(employeeId, data, userId)
      return this.success(details, 'Personel detay bilgisi başarıyla kaydedildi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel detay bilgisi kaydetme')
    }
  }

  /**
   * Kan grubuna göre personelleri getir
   */
  async getByBloodGroup(bloodGroup: BloodGroup): Promise<any> {
    try {
      const details = await this.service.findByBloodGroup(bloodGroup)
      return this.success(details)
    } catch (error) {
      return this.handleError(error, 'Kan grubuna göre personel getirme')
    }
  }

  /**
   * Askerlik durumuna göre personelleri getir
   */
  async getByMilitaryStatus(militaryStatus: MilitaryStatus): Promise<any> {
    try {
      const details = await this.service.findByMilitaryStatus(militaryStatus)
      return this.success(details)
    } catch (error) {
      return this.handleError(error, 'Askerlik durumuna göre personel getirme')
    }
  }

  /**
   * Personel için detay bilgisi var mı kontrol et
   */
  async existsForEmployee(employeeId: number): Promise<any> {
    try {
      const exists = await this.service.existsForEmployee(employeeId)
      return this.success({ exists })
    } catch (error) {
      return this.handleError(error, 'Detay bilgisi kontrolü')
    }
  }
}

export default EmployeeDetailsController
