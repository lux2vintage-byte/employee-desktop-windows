import { PrismaClient, AppSetting } from '@prisma/client'
import { AuditLoggerService, AuditAction } from '../services/AuditLoggerService'

/**
 * AppSetting with relations type
 */
export type AppSettingWithRelations = AppSetting

/**
 * AppSetting filter options
 */
export interface AppSettingFilterOptions {
  group?: string
  key?: string
}

/**
 * AppSettingRepository
 * Uygulama ayarları için repository sınıfı
 * Requirements: 20.1
 */
export class AppSettingRepository {
  private prisma: PrismaClient
  private modelName: string = 'appSetting'
  private auditLogger: AuditLoggerService | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Audit logger'ı ayarla
   */
  setAuditLogger(auditLogger: AuditLoggerService): void {
    this.auditLogger = auditLogger
  }

  /**
   * Prisma objesini plain object'e çevir
   */
  private toPlain(data: any): any {
    if (!data) return null
    return JSON.parse(JSON.stringify(data))
  }

  /**
   * Audit log kaydı oluştur
   */
  private async logAudit(
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
   * Tüm ayarları getir
   */
  async findAll(): Promise<AppSetting[]> {
    const data = await this.prisma.appSetting.findMany({
      orderBy: [
        { group: 'asc' },
        { key: 'asc' }
      ]
    })
    return this.toPlain(data)
  }

  /**
   * ID ile ayar bul
   */
  async findById(id: number): Promise<AppSetting | null> {
    const result = await this.prisma.appSetting.findUnique({
      where: { id }
    })
    return this.toPlain(result)
  }

  /**
   * Key ile ayar bul
   * Requirements: 20.1
   */
  async findByKey(key: string): Promise<AppSetting | null> {
    const result = await this.prisma.appSetting.findUnique({
      where: { key }
    })
    return this.toPlain(result)
  }

  /**
   * Grup ile ayarları bul
   * Requirements: 20.1, 20.3
   */
  async findByGroup(group: string): Promise<AppSetting[]> {
    const data = await this.prisma.appSetting.findMany({
      where: { group },
      orderBy: { key: 'asc' }
    })
    return this.toPlain(data)
  }

  /**
   * Filtreli ayarları getir
   */
  async findWithFilters(filters: AppSettingFilterOptions): Promise<AppSetting[]> {
    const where: any = {}

    if (filters.group) {
      where.group = filters.group
    }

    if (filters.key) {
      where.key = {
        contains: filters.key
      }
    }

    const data = await this.prisma.appSetting.findMany({
      where,
      orderBy: [
        { group: 'asc' },
        { key: 'asc' }
      ]
    })
    return this.toPlain(data)
  }

  /**
   * Ayar oluştur
   */
  async create(data: { key: string; value: string; group?: string }, userId?: number): Promise<AppSetting> {
    const result = await this.prisma.appSetting.create({
      data: {
        key: data.key,
        value: data.value,
        group: data.group ?? null
      }
    })

    // Audit log
    await this.logAudit('INSERT', result.id, undefined, this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Ayar güncelle
   */
  async update(id: number, data: { value?: string; group?: string }, userId?: number): Promise<AppSetting> {
    // Eski değerleri al
    const oldRecord = await this.findById(id)
    if (!oldRecord) {
      throw new Error(`Ayar bulunamadı: ${id}`)
    }

    const result = await this.prisma.appSetting.update({
      where: { id },
      data
    })

    // Audit log
    await this.logAudit('UPDATE', id, this.toPlain(oldRecord), this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Key ile ayar güncelle veya oluştur (upsert)
   */
  async upsertByKey(key: string, value: string, group?: string, userId?: number): Promise<AppSetting> {
    const existing = await this.findByKey(key)

    if (existing) {
      return this.update(existing.id, { value, group }, userId)
    } else {
      return this.create({ key, value, group }, userId)
    }
  }

  /**
   * Ayar sil
   */
  async delete(id: number, userId?: number): Promise<AppSetting> {
    // Eski değerleri al
    const oldRecord = await this.findById(id)
    if (!oldRecord) {
      throw new Error(`Ayar bulunamadı: ${id}`)
    }

    const result = await this.prisma.appSetting.delete({
      where: { id }
    })

    // Audit log
    await this.logAudit('DELETE', id, this.toPlain(oldRecord), undefined, userId)

    return this.toPlain(result)
  }

  /**
   * Key ile ayar sil
   */
  async deleteByKey(key: string, userId?: number): Promise<AppSetting | null> {
    const existing = await this.findByKey(key)
    if (!existing) {
      return null
    }
    return this.delete(existing.id, userId)
  }

  /**
   * Tüm grupları getir
   */
  async getAllGroups(): Promise<string[]> {
    const results = await this.prisma.appSetting.findMany({
      where: {
        group: {
          not: null
        }
      },
      select: {
        group: true
      },
      distinct: ['group']
    })

    return results
      .map(r => r.group)
      .filter((g): g is string => g !== null)
      .sort()
  }

  /**
   * Key var mı kontrol et
   */
  async existsByKey(key: string): Promise<boolean> {
    const count = await this.prisma.appSetting.count({
      where: { key }
    })
    return count > 0
  }

  /**
   * Toplu ayar oluştur
   */
  async createMany(settings: { key: string; value: string; group?: string }[], userId?: number): Promise<number> {
    let createdCount = 0

    for (const setting of settings) {
      const exists = await this.existsByKey(setting.key)
      if (!exists) {
        await this.create(setting, userId)
        createdCount++
      }
    }

    return createdCount
  }
}

export default AppSettingRepository
