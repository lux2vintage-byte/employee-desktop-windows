import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { PositionService, CreatePositionDto, UpdatePositionDto, BusinessRuleError, ValidationError } from '../services/PositionService'
import { PositionRepository } from '../repositories/PositionRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Position Controller
 * Pozisyon CRUD operasyonları ve maaş skalası yönetimi
 * Requirements: 3.1-3.6
 */
export class PositionController extends BaseController {
  private service: PositionService
  private repository: PositionRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new PositionRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new PositionService(this.repository)
  }

  /**
   * Pozisyon oluştur
   * Requirements: 3.1, 3.2, 3.3
   */
  async create(data: CreatePositionDto, userId?: number): Promise<any> {
    try {
      const position = await this.service.create(data, userId)
      return this.success(position, 'Pozisyon başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Pozisyon oluşturma')
    }
  }

  /**
   * Pozisyon getir
   */
  async getById(id: number): Promise<any> {
    try {
      const position = await this.service.findById(id)
      if (!position) {
        return this.error(['Pozisyon bulunamadı'], 404)
      }
      return this.success(position)
    } catch (error) {
      return this.handleError(error, 'Pozisyon getirme')
    }
  }

  /**
   * Tüm pozisyonları getir
   */
  async getAll(options: any = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Pozisyon listesi getirme')
    }
  }

  /**
   * Departman bazlı pozisyonları getir
   * Requirements: 3.6
   */
  async getByDepartment(departmentId: number): Promise<any> {
    try {
      const positions = await this.service.findByDepartment(departmentId)
      return this.success(positions)
    } catch (error) {
      return this.handleError(error, 'Departman pozisyonları getirme')
    }
  }

  /**
   * Pozisyon güncelle
   * Requirements: 3.2, 3.3
   */
  async update(id: number, data: UpdatePositionDto, userId?: number): Promise<any> {
    try {
      const position = await this.service.update(id, data, userId)
      return this.success(position, 'Pozisyon başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Pozisyon güncelleme')
    }
  }

  /**
   * Pozisyon sil (soft delete)
   * Requirements: 3.4
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Pozisyon başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Pozisyon silme')
    }
  }

  /**
   * Pozisyonu geri yükle
   */
  async restore(id: number, userId?: number): Promise<any> {
    try {
      const position = await this.service.restore(id, userId)
      return this.success(position, 'Pozisyon başarıyla geri yüklendi')
    } catch (error) {
      return this.handleError(error, 'Pozisyon geri yükleme')
    }
  }

  /**
   * Unvana göre pozisyon ara
   */
  async findByTitle(title: string): Promise<any> {
    try {
      const positions = await this.service.findByTitle(title)
      return this.success(positions)
    } catch (error) {
      return this.handleError(error, 'Pozisyon arama')
    }
  }

  /**
   * Maaş aralığına göre pozisyonları getir
   */
  async findBySalaryRange(minSalary?: number, maxSalary?: number): Promise<any> {
    try {
      const positions = await this.service.findBySalaryRange(minSalary, maxSalary)
      return this.success(positions)
    } catch (error) {
      return this.handleError(error, 'Pozisyon arama')
    }
  }

  /**
   * Maaşın pozisyon aralığında olup olmadığını kontrol et
   * Requirements: 3.3
   */
  async validateSalaryRange(positionId: number, salary: number): Promise<any> {
    try {
      const isValid = await this.service.validateSalaryRange(positionId, salary)
      return this.success({ isValid, positionId, salary })
    } catch (error) {
      return this.handleError(error, 'Maaş aralığı kontrolü')
    }
  }
}

export default PositionController
