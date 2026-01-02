import { PrismaClient } from '@prisma/client'
import { AuditLoggerService, AuditAction } from '../services/AuditLoggerService'

export interface FindAllOptions {
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
  includeDeleted?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Base Repository - Tüm repository'ler için temel sınıf
 * Soft delete, audit logging ve timestamp yönetimi içerir
 * Requirements: 1.1, 1.2, 1.3
 */
export abstract class BaseRepository<T extends { id: number; deletedAt?: Date | null }> {
  protected prisma: PrismaClient
  protected modelName: string
  protected auditLogger: AuditLoggerService | null = null
  protected supportsSoftDelete: boolean = true

  constructor(prisma: PrismaClient, modelName: string, supportsSoftDelete: boolean = true) {
    this.prisma = prisma
    this.modelName = modelName
    this.supportsSoftDelete = supportsSoftDelete
  }

  /**
   * Audit logger'ı ayarla
   */
  setAuditLogger(auditLogger: AuditLoggerService): void {
    this.auditLogger = auditLogger
  }

  /**
   * Model'e erişim
   */
  protected get model(): any {
    return (this.prisma as any)[this.modelName]
  }

  /**
   * Prisma objesini plain object'e çevir
   */
  protected toPlain(data: any): any {
    if (!data) return null
    return JSON.parse(JSON.stringify(data))
  }

  /**
   * Soft delete filtresi oluştur
   */
  protected getSoftDeleteFilter(includeDeleted: boolean = false): object {
    if (!this.supportsSoftDelete || includeDeleted) {
      return {}
    }
    return { deletedAt: null }
  }

  /**
   * Audit log kaydı oluştur
   */
  protected async logAudit(
    action: AuditAction,
    recordId: number,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    userId?: number
  ): Promise<void> {
    if (this.auditLogger) {
      await this.auditLogger.log({
        tableName: this.modelName,
        recordId,
        action,
        oldValues,
        newValues,
        userId
      })
    }
  }

  /**
   * Tüm kayıtları getir (soft delete'li kayıtlar varsayılan olarak hariç)
   * Requirements: 1.3
   */
  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<T>> {
    const { 
      page = 1, 
      limit = 25, 
      orderBy = 'createdAt', 
      order = 'desc',
      includeDeleted = false 
    } = options
    const skip = (page - 1) * limit

    const whereClause = this.getSoftDeleteFilter(includeDeleted)

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order }
      }),
      this.model.count({ where: whereClause })
    ])

    return {
      data: this.toPlain(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Tüm kayıtları getir (sayfalama olmadan)
   */
  async findAllWithoutPagination(includeDeleted: boolean = false): Promise<T[]> {
    const whereClause = this.getSoftDeleteFilter(includeDeleted)
    const data = await this.model.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })
    return this.toPlain(data)
  }

  /**
   * ID ile kayıt bul (soft delete'li kayıtlar varsayılan olarak hariç)
   * Requirements: 1.3
   */
  async findById(id: number, includeDeleted: boolean = false): Promise<T | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.model.findFirst({
      where: whereClause
    })
    return this.toPlain(result)
  }

  /**
   * Kayıt oluştur
   * Requirements: 1.4, 1.5 (createdAt otomatik set edilir)
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, userId?: number): Promise<T> {
    const result = await this.model.create({
      data
    })

    // Audit log
    await this.logAudit('INSERT', result.id, undefined, this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Kayıt güncelle
   * Requirements: 1.6 (updatedAt otomatik güncellenir)
   */
  async update(id: number, data: Partial<T>, userId?: number): Promise<T> {
    // Eski değerleri al
    const oldRecord = await this.findById(id, true)
    if (!oldRecord) {
      throw new Error(`Kayıt bulunamadı: ${id}`)
    }

    const result = await this.model.update({
      where: { id },
      data
    })

    // Audit log
    await this.logAudit('UPDATE', id, this.toPlain(oldRecord), this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Soft delete - Kaydı fiziksel olarak silmez, deletedAt alanını set eder
   * Requirements: 1.1, 1.2
   */
  async softDelete(id: number, userId?: number): Promise<T> {
    if (!this.supportsSoftDelete) {
      throw new Error(`${this.modelName} soft delete desteklemiyor`)
    }

    // Eski değerleri al
    const oldRecord = await this.findById(id, true)
    if (!oldRecord) {
      throw new Error(`Kayıt bulunamadı: ${id}`)
    }

    const result = await this.model.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    // Audit log
    await this.logAudit('DELETE', id, this.toPlain(oldRecord), this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Soft delete'i geri al - deletedAt alanını null yapar
   * Requirements: 1.1
   */
  async restore(id: number, userId?: number): Promise<T> {
    if (!this.supportsSoftDelete) {
      throw new Error(`${this.modelName} soft delete desteklemiyor`)
    }

    // Silinmiş kaydı bul
    const oldRecord = await this.findById(id, true)
    if (!oldRecord) {
      throw new Error(`Kayıt bulunamadı: ${id}`)
    }

    if (!oldRecord.deletedAt) {
      throw new Error(`Kayıt zaten aktif: ${id}`)
    }

    const result = await this.model.update({
      where: { id },
      data: { deletedAt: null }
    })

    // Audit log
    await this.logAudit('UPDATE', id, this.toPlain(oldRecord), this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Hard delete - Kaydı fiziksel olarak siler (sadece admin için)
   */
  async hardDelete(id: number, userId?: number): Promise<T> {
    // Eski değerleri al
    const oldRecord = await this.findById(id, true)
    if (!oldRecord) {
      throw new Error(`Kayıt bulunamadı: ${id}`)
    }

    const result = await this.model.delete({
      where: { id }
    })

    // Audit log
    await this.logAudit('DELETE', id, this.toPlain(oldRecord), undefined, userId)

    return this.toPlain(result)
  }

  /**
   * Kayıt sayısı (soft delete'li kayıtlar varsayılan olarak hariç)
   */
  async count(where: any = {}, includeDeleted: boolean = false): Promise<number> {
    const whereClause = {
      ...where,
      ...this.getSoftDeleteFilter(includeDeleted)
    }
    return await this.model.count({ where: whereClause })
  }

  /**
   * Kayıt var mı kontrol et
   */
  async exists(id: number, includeDeleted: boolean = false): Promise<boolean> {
    const record = await this.findById(id, includeDeleted)
    return record !== null
  }
}

export default BaseRepository
