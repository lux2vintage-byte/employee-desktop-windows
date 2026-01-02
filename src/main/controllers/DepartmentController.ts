import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { DepartmentService, CreateDepartmentDto, UpdateDepartmentDto, BusinessRuleError, ValidationError } from '../services/DepartmentService'
import { DepartmentRepository } from '../repositories/DepartmentRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Department Controller
 * Departman CRUD operasyonları ve hiyerarşi yönetimi
 * Requirements: 2.1-2.7
 */
export class DepartmentController extends BaseController {
  private service: DepartmentService
  private repository: DepartmentRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new DepartmentRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new DepartmentService(this.repository)
  }

  /**
   * Departman oluştur
   * Requirements: 2.1, 2.2, 2.7
   */
  async create(data: CreateDepartmentDto, userId?: number): Promise<any> {
    try {
      const department = await this.service.create(data, userId)
      return this.success(department, 'Departman başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Departman oluşturma')
    }
  }

  /**
   * Departman getir
   */
  async getById(id: number): Promise<any> {
    try {
      const department = await this.service.findById(id)
      if (!department) {
        return this.error(['Departman bulunamadı'], 404)
      }
      return this.success(department)
    } catch (error) {
      return this.handleError(error, 'Departman getirme')
    }
  }

  /**
   * Tüm departmanları getir
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
      return this.handleError(error, 'Departman listesi getirme')
    }
  }

  /**
   * Departman güncelle
   * Requirements: 2.2, 2.5, 2.7
   */
  async update(id: number, data: UpdateDepartmentDto, userId?: number): Promise<any> {
    try {
      const department = await this.service.update(id, data, userId)
      return this.success(department, 'Departman başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Departman güncelleme')
    }
  }

  /**
   * Departman sil (soft delete)
   * Requirements: 2.4
   */
  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Departman başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Departman silme')
    }
  }

  /**
   * Departmanı geri yükle
   */
  async restore(id: number, userId?: number): Promise<any> {
    try {
      const department = await this.service.restore(id, userId)
      return this.success(department, 'Departman başarıyla geri yüklendi')
    } catch (error) {
      return this.handleError(error, 'Departman geri yükleme')
    }
  }

  /**
   * Departman hiyerarşisini getir
   * Requirements: 2.6
   */
  async getHierarchy(): Promise<any> {
    try {
      const hierarchy = await this.service.getHierarchy()
      return this.success(hierarchy)
    } catch (error) {
      return this.handleError(error, 'Departman hiyerarşisi getirme')
    }
  }

  /**
   * Alt departmanları getir
   * Requirements: 2.6
   */
  async getChildren(parentId: number): Promise<any> {
    try {
      const children = await this.service.getChildren(parentId)
      return this.success(children)
    } catch (error) {
      return this.handleError(error, 'Alt departmanları getirme')
    }
  }

  /**
   * Kök departmanları getir
   */
  async getRootDepartments(): Promise<any> {
    try {
      const roots = await this.service.getRootDepartments()
      return this.success(roots)
    } catch (error) {
      return this.handleError(error, 'Kök departmanları getirme')
    }
  }

  /**
   * Yönetici ata
   * Requirements: 2.5
   */
  async assignManager(departmentId: number, managerId: number | null, userId?: number): Promise<any> {
    try {
      const department = await this.service.assignManager(departmentId, managerId, userId)
      return this.success(department, 'Yönetici başarıyla atandı')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Yönetici atama')
    }
  }

  /**
   * İsme göre departman ara
   */
  async findByName(name: string): Promise<any> {
    try {
      const departments = await this.service.findByName(name)
      return this.success(departments)
    } catch (error) {
      return this.handleError(error, 'Departman arama')
    }
  }

  /**
   * Cost center code ile departman bul
   */
  async findByCostCenterCode(costCenterCode: string): Promise<any> {
    try {
      const department = await this.service.findByCostCenterCode(costCenterCode)
      if (!department) {
        return this.error(['Departman bulunamadı'], 404)
      }
      return this.success(department)
    } catch (error) {
      return this.handleError(error, 'Departman arama')
    }
  }
}

export default DepartmentController
