import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { EmployeeDocumentsService, UploadDocumentDto, BusinessRuleError, ValidationError } from '../services/EmployeeDocumentsService'
import { EmployeeDocumentsRepository, DocumentFilterOptions } from '../repositories/EmployeeDocumentsRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'
import { DocumentType } from '../utils/validation'

/**
 * EmployeeDocuments Controller
 * Personel belgeleri CRUD operasyonları
 * Requirements: 6.1-6.6
 */
export class EmployeeDocumentsController extends BaseController {
  private service: EmployeeDocumentsService
  private repository: EmployeeDocumentsRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new EmployeeDocumentsRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.repository.setAuditLogger(auditLogger)
    this.service = new EmployeeDocumentsService(this.repository)
  }

  /**
   * Belge yükle
   * Requirements: 6.2, 6.3, 6.4
   */
  async upload(data: UploadDocumentDto, userId?: number): Promise<any> {
    try {
      const document = await this.service.upload(data, userId)
      return this.success(document, 'Belge başarıyla yüklendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Belge yükleme')
    }
  }

  /**
   * ID ile belge getir
   */
  async getById(documentId: number): Promise<any> {
    try {
      const document = await this.service.findById(documentId)
      if (!document) {
        return this.error(['Belge bulunamadı'], 404)
      }
      return this.success(document)
    } catch (error) {
      return this.handleError(error, 'Belge getirme')
    }
  }

  /**
   * Personel ID ile belgeleri getir
   * Requirements: 6.5
   */
  async getByEmployeeId(employeeId: number): Promise<any> {
    try {
      const documents = await this.service.findByEmployeeId(employeeId)
      return this.success(documents)
    } catch (error) {
      return this.handleError(error, 'Personel belgeleri getirme')
    }
  }

  /**
   * Personel ID ile belgeleri personel bilgileriyle birlikte getir
   */
  async getByEmployeeIdWithEmployee(employeeId: number): Promise<any> {
    try {
      const documents = await this.service.findByEmployeeIdWithEmployee(employeeId)
      return this.success(documents)
    } catch (error) {
      return this.handleError(error, 'Personel belgeleri getirme')
    }
  }

  /**
   * Personel ID ve belge tipine göre belgeleri getir
   */
  async getByType(employeeId: number, documentType: DocumentType): Promise<any> {
    try {
      const documents = await this.service.findByType(employeeId, documentType)
      return this.success(documents)
    } catch (error) {
      return this.handleError(error, 'Belge tipine göre getirme')
    }
  }

  /**
   * Tüm belgeleri filtrelerle getir
   */
  async getAll(options: DocumentFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Belge listesi getirme')
    }
  }

  /**
   * Belge tipine göre tüm belgeleri getir
   */
  async getByDocumentType(documentType: DocumentType): Promise<any> {
    try {
      const documents = await this.service.findByDocumentType(documentType)
      return this.success(documents)
    } catch (error) {
      return this.handleError(error, 'Belge tipine göre getirme')
    }
  }

  /**
   * Belge sil (soft delete)
   * Requirements: 6.6
   */
  async delete(documentId: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(documentId, userId)
      return this.success(null, 'Belge başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Belge silme')
    }
  }

  /**
   * Belgeyi geri yükle
   */
  async restore(documentId: number, userId?: number): Promise<any> {
    try {
      const document = await this.service.restore(documentId, userId)
      return this.success(document, 'Belge başarıyla geri yüklendi')
    } catch (error) {
      return this.handleError(error, 'Belge geri yükleme')
    }
  }

  /**
   * Belgeyi kalıcı olarak sil
   */
  async hardDelete(documentId: number, userId?: number): Promise<any> {
    try {
      await this.service.hardDelete(documentId, userId)
      return this.success(null, 'Belge kalıcı olarak silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Belge kalıcı silme')
    }
  }

  /**
   * Personelin belge sayısını getir
   */
  async countByEmployeeId(employeeId: number): Promise<any> {
    try {
      const count = await this.service.countByEmployeeId(employeeId)
      return this.success({ count })
    } catch (error) {
      return this.handleError(error, 'Belge sayısı getirme')
    }
  }

  /**
   * Personelin belirli tipteki belge sayısını getir
   */
  async countByEmployeeIdAndType(employeeId: number, documentType: DocumentType): Promise<any> {
    try {
      const count = await this.service.countByEmployeeIdAndType(employeeId, documentType)
      return this.success({ count })
    } catch (error) {
      return this.handleError(error, 'Belge sayısı getirme')
    }
  }

  /**
   * Tarih aralığına göre belgeleri getir
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<any> {
    try {
      const documents = await this.service.findByDateRange(startDate, endDate)
      return this.success(documents)
    } catch (error) {
      return this.handleError(error, 'Tarih aralığına göre belge getirme')
    }
  }

  /**
   * Dosya var mı kontrol et
   */
  async checkFileExists(filePath: string): Promise<any> {
    try {
      const exists = this.service.fileExists(filePath)
      return this.success({ exists })
    } catch (error) {
      return this.handleError(error, 'Dosya kontrolü')
    }
  }

  /**
   * Dosya bilgilerini getir
   */
  async getFileInfo(filePath: string): Promise<any> {
    try {
      const info = this.service.getFileInfo(filePath)
      if (!info) {
        return this.error(['Dosya bulunamadı'], 404)
      }
      return this.success(info)
    } catch (error) {
      return this.handleError(error, 'Dosya bilgisi getirme')
    }
  }
}

export default EmployeeDocumentsController
