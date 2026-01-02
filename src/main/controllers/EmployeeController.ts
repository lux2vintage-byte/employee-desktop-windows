import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { EmployeeService, CreateEmployeeDto, UpdateEmployeeDto, BusinessRuleError, ValidationError } from '../services/EmployeeService'
import { EmployeeRepository, EmployeeFilterOptions } from '../repositories/EmployeeRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'
import { EmployeeStatus } from '../utils/validation'

/**
 * Employee Controller
 * Personel CRUD operasyonları
 * Requirements: 4.1-4.10
 */
export class EmployeeController extends BaseController {
  private service: EmployeeService
  private repository: EmployeeRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new EmployeeRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new EmployeeService(this.repository)
  }

  /**
   * Personel oluştur
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9
   */
  async create(data: CreateEmployeeDto, userId?: number): Promise<any> {
    try {
      const employee = await this.service.create(data, userId)
      return this.success(employee, 'Personel başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel oluşturma')
    }
  }

  /**
   * Personel getir
   * Requirements: 4.10
   */
  async getById(id: number): Promise<any> {
    try {
      const employee = await this.service.findById(id)
      if (!employee) {
        return this.error(['Personel bulunamadı'], 404)
      }
      return this.success(employee)
    } catch (error) {
      return this.handleError(error, 'Personel getirme')
    }
  }

  /**
   * Sicil no ile personel getir
   */
  async getByCode(employeeCode: string): Promise<any> {
    try {
      const employee = await this.service.findByCode(employeeCode)
      if (!employee) {
        return this.error(['Personel bulunamadı'], 404)
      }
      return this.success(employee)
    } catch (error) {
      return this.handleError(error, 'Personel getirme')
    }
  }

  /**
   * Tüm personelleri getir
   * Requirements: 4.10
   */
  async getAll(options: EmployeeFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Personel listesi getirme')
    }
  }

  /**
   * Departman bazlı personelleri getir
   */
  async getByDepartment(departmentId: number): Promise<any> {
    try {
      const employees = await this.service.findByDepartment(departmentId)
      return this.success(employees)
    } catch (error) {
      return this.handleError(error, 'Departman personelleri getirme')
    }
  }

  /**
   * Yönetici bazlı personelleri getir (astlar)
   */
  async getByManager(managerId: number): Promise<any> {
    try {
      const employees = await this.service.findByManager(managerId)
      return this.success(employees)
    } catch (error) {
      return this.handleError(error, 'Yönetici astları getirme')
    }
  }

  /**
   * Personel güncelle
   * Requirements: 4.4, 4.5, 4.6, 4.7, 4.9
   */
  async update(id: number, data: UpdateEmployeeDto, userId?: number): Promise<any> {
    try {
      const employee = await this.service.update(id, data, userId)
      return this.success(employee, 'Personel başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel güncelleme')
    }
  }

  /**
   * Personel sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Personel başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel silme')
    }
  }

  /**
   * Personeli geri yükle
   */
  async restore(id: number, userId?: number): Promise<any> {
    try {
      const employee = await this.service.restore(id, userId)
      return this.success(employee, 'Personel başarıyla geri yüklendi')
    } catch (error) {
      return this.handleError(error, 'Personel geri yükleme')
    }
  }

  /**
   * Personel durumunu değiştir
   * Requirements: 4.7
   */
  async changeStatus(id: number, status: EmployeeStatus, userId?: number): Promise<any> {
    try {
      const employee = await this.service.changeStatus(id, status, userId)
      return this.success(employee, 'Personel durumu başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Personel durumu güncelleme')
    }
  }

  /**
   * Benzersiz sicil no üret
   * Requirements: 4.2
   */
  async generateEmployeeCode(): Promise<any> {
    try {
      const code = await this.service.generateEmployeeCode()
      return this.success({ employeeCode: code })
    } catch (error) {
      return this.handleError(error, 'Sicil no üretme')
    }
  }

  /**
   * Personel ile birlikte çözülmüş TC Kimlik No getir
   */
  async getByIdWithDecryptedIdentity(id: number): Promise<any> {
    try {
      const employee = await this.service.findByIdWithDecryptedIdentity(id)
      if (!employee) {
        return this.error(['Personel bulunamadı'], 404)
      }
      return this.success(employee)
    } catch (error) {
      return this.handleError(error, 'Personel getirme')
    }
  }

  /**
   * İsim ve soyisime göre personel ara
   */
  async searchByName(searchTerm: string): Promise<any> {
    try {
      const employees = await this.service.searchByName(searchTerm)
      return this.success(employees)
    } catch (error) {
      return this.handleError(error, 'Personel arama')
    }
  }

  /**
   * Aktif personel sayısını getir
   */
  async getActiveCount(): Promise<any> {
    try {
      const count = await this.service.getActiveCount()
      return this.success({ count })
    } catch (error) {
      return this.handleError(error, 'Aktif personel sayısı getirme')
    }
  }
}

export default EmployeeController
