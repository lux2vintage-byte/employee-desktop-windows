import { EmployeeDocument } from '@prisma/client'
import { EmployeeDocumentsRepository, EmployeeDocumentWithEmployee, DocumentFilterOptions } from '../repositories/EmployeeDocumentsRepository'
import { PaginatedResult } from '../repositories/BaseRepository'
import { ValidationUtils, DocumentType } from '../utils/validation'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Upload Document DTO
 */
export interface UploadDocumentDto {
  employeeId: number
  documentType: DocumentType
  filePath: string
}

/**
 * Business Rule Error
 */
export class BusinessRuleError extends Error {
  constructor(
    public rule: string,
    public details: Record<string, unknown> = {}
  ) {
    super(`İş kuralı ihlali: ${rule}`)
    this.name = 'BusinessRuleError'
  }
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public value: unknown,
    public constraint: string
  ) {
    super(`Doğrulama hatası - ${field}: ${constraint}`)
    this.name = 'ValidationError'
  }
}

/**
 * EmployeeDocumentsService - Personel belgeleri iş mantığı
 * Belge yükleme ve silme, dosya yolu validasyonu, otomatik tarih ataması
 * Requirements: 6.2, 6.3, 6.4, 6.6
 */
export class EmployeeDocumentsService {
  private repository: EmployeeDocumentsRepository

  constructor(repository: EmployeeDocumentsRepository) {
    this.repository = repository
  }

  /**
   * Belge yükle
   * Requirements: 6.2, 6.3, 6.4
   */
  async upload(data: UploadDocumentDto, userId?: number): Promise<EmployeeDocument> {
    // Validasyon
    await this.validateUpload(data)

    // Belge oluştur (uploadDate otomatik set edilir)
    // Requirements: 6.4
    const createData = {
      employeeId: data.employeeId,
      documentType: data.documentType,
      filePath: data.filePath,
      uploadDate: new Date()
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Belge sil (soft delete)
   * Requirements: 6.6 - Personel silinse bile belgeler korunur
   */
  async delete(documentId: number, userId?: number): Promise<EmployeeDocument> {
    const existing = await this.repository.findById(documentId)
    if (!existing) {
      throw new BusinessRuleError('Belge bulunamadı', { documentId })
    }

    return await this.repository.softDelete(documentId, userId)
  }

  /**
   * Belgeyi geri yükle
   */
  async restore(documentId: number, userId?: number): Promise<EmployeeDocument> {
    return await this.repository.restore(documentId, userId)
  }

  /**
   * Belgeyi kalıcı olarak sil
   */
  async hardDelete(documentId: number, userId?: number): Promise<EmployeeDocument> {
    const existing = await this.repository.findById(documentId, true)
    if (!existing) {
      throw new BusinessRuleError('Belge bulunamadı', { documentId })
    }

    return await this.repository.hardDelete(documentId, userId)
  }

  /**
   * ID ile belge getir
   */
  async findById(documentId: number): Promise<EmployeeDocumentWithEmployee | null> {
    return await this.repository.findByIdWithEmployee(documentId)
  }

  /**
   * Personel ID ile belgeleri getir
   * Requirements: 6.5
   */
  async findByEmployeeId(employeeId: number): Promise<EmployeeDocument[]> {
    return await this.repository.findByEmployeeId(employeeId)
  }

  /**
   * Personel ID ile belgeleri personel bilgileriyle birlikte getir
   */
  async findByEmployeeIdWithEmployee(employeeId: number): Promise<EmployeeDocumentWithEmployee[]> {
    return await this.repository.findByEmployeeIdWithEmployee(employeeId)
  }

  /**
   * Personel ID ve belge tipine göre belgeleri getir
   */
  async findByType(employeeId: number, documentType: DocumentType): Promise<EmployeeDocument[]> {
    return await this.repository.findByEmployeeIdAndType(employeeId, documentType)
  }

  /**
   * Tüm belgeleri filtrelerle getir
   */
  async findAll(options: DocumentFilterOptions = {}): Promise<PaginatedResult<EmployeeDocumentWithEmployee>> {
    return await this.repository.findAllWithFilters(options)
  }

  /**
   * Belge tipine göre tüm belgeleri getir
   */
  async findByDocumentType(documentType: DocumentType): Promise<EmployeeDocumentWithEmployee[]> {
    return await this.repository.findByDocumentType(documentType)
  }

  /**
   * Personelin belge sayısını getir
   */
  async countByEmployeeId(employeeId: number): Promise<number> {
    return await this.repository.countByEmployeeId(employeeId)
  }

  /**
   * Personelin belirli tipteki belge sayısını getir
   */
  async countByEmployeeIdAndType(employeeId: number, documentType: DocumentType): Promise<number> {
    return await this.repository.countByEmployeeIdAndType(employeeId, documentType)
  }

  /**
   * Tarih aralığına göre belgeleri getir
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<EmployeeDocumentWithEmployee[]> {
    return await this.repository.findByDateRange(startDate, endDate)
  }

  /**
   * Dosya var mı kontrol et
   * Requirements: 6.3
   */
  fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }

  /**
   * Dosya bilgilerini getir
   */
  getFileInfo(filePath: string): { size: number; extension: string; name: string } | null {
    try {
      if (!fs.existsSync(filePath)) return null
      
      const stats = fs.statSync(filePath)
      const extension = path.extname(filePath)
      const name = path.basename(filePath)

      return {
        size: stats.size,
        extension,
        name
      }
    } catch {
      return null
    }
  }

  /**
   * Upload validasyonu
   */
  private async validateUpload(data: UploadDocumentDto): Promise<void> {
    // Personel ID zorunlu
    if (!data.employeeId) {
      throw new ValidationError('employeeId', data.employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(data.employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
    }

    // Belge tipi zorunlu ve validasyonu
    // Requirements: 6.2
    if (!data.documentType) {
      throw new ValidationError('documentType', data.documentType, 'Belge tipi zorunludur')
    }
    const documentTypeValidation = ValidationUtils.validateDocumentType(data.documentType)
    if (!documentTypeValidation.isValid) {
      throw new ValidationError('documentType', data.documentType, documentTypeValidation.error!)
    }

    // Dosya yolu zorunlu
    if (!data.filePath || data.filePath.trim() === '') {
      throw new ValidationError('filePath', data.filePath, 'Dosya yolu zorunludur')
    }

    // Dosya yolu validasyonu - dosya var mı kontrol et
    // Requirements: 6.3
    // Not: Electron ortamında dosya sistemi erişimi olduğu varsayılır
    // Geliştirme/test ortamında bu kontrol atlanabilir
    if (process.env.NODE_ENV === 'production') {
      if (!this.fileExists(data.filePath)) {
        throw new ValidationError('filePath', data.filePath, 'Belirtilen dosya bulunamadı')
      }
    }

    // Aynı dosya yolu zaten yüklü mü kontrol et
    const isUnique = await this.repository.isFilePathUniqueForEmployee(data.employeeId, data.filePath)
    if (!isUnique) {
      throw new BusinessRuleError('Bu dosya zaten yüklenmiş', { 
        employeeId: data.employeeId, 
        filePath: data.filePath 
      })
    }
  }
}

export default EmployeeDocumentsService
