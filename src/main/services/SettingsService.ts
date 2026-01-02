import { PrismaClient, AppSetting } from '@prisma/client'
import { AppSettingRepository, AppSettingFilterOptions } from '../repositories/AppSettingRepository'
import { AuditLoggerService, getAuditLoggerService } from './AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Varsayılan ayarlar
 * Requirements: 20.4
 */
export const DEFAULT_SETTINGS: { key: string; value: string; group: string }[] = [
  // Şirket ayarları
  { key: 'company_name', value: '', group: 'company' },
  { key: 'logo_path', value: '', group: 'company' },
  
  // Bordro ayarları
  { key: 'minimum_wage', value: '17002', group: 'payroll' },
  { key: 'advance_max_percentage', value: '50', group: 'payroll' },
  
  // İzin ayarları
  { key: 'annual_leave_base_days', value: '14', group: 'leave' },
  { key: 'max_leave_transfer_days', value: '5', group: 'leave' },
  
  // Sistem ayarları
  { key: 'date_format', value: 'DD.MM.YYYY', group: 'system' },
  { key: 'time_format', value: 'HH:mm', group: 'system' },
  { key: 'currency', value: 'TRY', group: 'system' },
  { key: 'language', value: 'tr', group: 'system' }
]

/**
 * Ayar veri tipi tanımları
 * Requirements: 20.6
 */
export const SETTING_DATA_TYPES: Record<string, 'string' | 'number' | 'boolean' | 'json'> = {
  company_name: 'string',
  logo_path: 'string',
  minimum_wage: 'number',
  advance_max_percentage: 'number',
  annual_leave_base_days: 'number',
  max_leave_transfer_days: 'number',
  date_format: 'string',
  time_format: 'string',
  currency: 'string',
  language: 'string'
}

/**
 * Validation Error
 */
export class SettingsValidationError extends Error {
  constructor(
    public field: string,
    public value: unknown,
    public constraint: string
  ) {
    super(`Validation failed for ${field}: ${constraint}`)
    this.name = 'SettingsValidationError'
  }
}

/**
 * Business Rule Error
 */
export class SettingsBusinessRuleError extends Error {
  constructor(
    public rule: string,
    public details: Record<string, unknown>
  ) {
    super(`Business rule violation: ${rule}`)
    this.name = 'SettingsBusinessRuleError'
  }
}

/**
 * SettingsService
 * Uygulama ayarları yönetimi servisi
 * Requirements: 20.2, 20.3, 20.4, 20.5, 20.6
 */
export class SettingsService {
  private repository: AppSettingRepository
  private auditLogger: AuditLoggerService

  constructor(prisma?: PrismaClient) {
    const prismaClient = prisma || getPrismaClient()
    this.repository = new AppSettingRepository(prismaClient)
    this.auditLogger = getAuditLoggerService(prismaClient)
    this.repository.setAuditLogger(this.auditLogger)
  }

  /**
   * Ayar değerini getir
   * Requirements: 20.2
   */
  async get(key: string): Promise<string | null> {
    const setting = await this.repository.findByKey(key)
    return setting?.value ?? null
  }

  /**
   * Ayar değerini sayı olarak getir
   */
  async getNumber(key: string): Promise<number | null> {
    const value = await this.get(key)
    if (value === null) return null
    const num = parseFloat(value)
    return isNaN(num) ? null : num
  }

  /**
   * Ayar değerini boolean olarak getir
   */
  async getBoolean(key: string): Promise<boolean | null> {
    const value = await this.get(key)
    if (value === null) return null
    return value === 'true' || value === '1'
  }

  /**
   * Ayar değerini JSON olarak getir
   */
  async getJson<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key)
    if (value === null) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  /**
   * Ayar değerini set et
   * Requirements: 20.2, 20.5
   */
  async set(key: string, value: string, group?: string, userId?: number): Promise<AppSetting> {
    // Validate key format
    if (!key || key.trim() === '') {
      throw new SettingsValidationError('key', key, 'Key boş olamaz')
    }

    // Validate value based on expected data type
    this.validateValue(key, value)

    // Upsert the setting
    return this.repository.upsertByKey(key, value, group, userId)
  }

  /**
   * Sayı değeri set et
   */
  async setNumber(key: string, value: number, group?: string, userId?: number): Promise<AppSetting> {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new SettingsValidationError('value', value, 'Geçerli bir sayı olmalıdır')
    }
    return this.set(key, value.toString(), group, userId)
  }

  /**
   * Boolean değeri set et
   */
  async setBoolean(key: string, value: boolean, group?: string, userId?: number): Promise<AppSetting> {
    return this.set(key, value ? 'true' : 'false', group, userId)
  }

  /**
   * JSON değeri set et
   */
  async setJson(key: string, value: any, group?: string, userId?: number): Promise<AppSetting> {
    try {
      const jsonString = JSON.stringify(value)
      return this.set(key, jsonString, group, userId)
    } catch {
      throw new SettingsValidationError('value', value, 'JSON formatına dönüştürülemedi')
    }
  }

  /**
   * Grup ile ayarları getir
   * Requirements: 20.3
   */
  async getByGroup(group: string): Promise<AppSetting[]> {
    return this.repository.findByGroup(group)
  }

  /**
   * Tüm ayarları getir
   */
  async getAll(): Promise<AppSetting[]> {
    return this.repository.findAll()
  }

  /**
   * Filtreli ayarları getir
   */
  async findWithFilters(filters: AppSettingFilterOptions): Promise<AppSetting[]> {
    return this.repository.findWithFilters(filters)
  }

  /**
   * Tüm grupları getir
   */
  async getAllGroups(): Promise<string[]> {
    return this.repository.getAllGroups()
  }

  /**
   * Ayar sil
   */
  async delete(key: string, userId?: number): Promise<AppSetting | null> {
    return this.repository.deleteByKey(key, userId)
  }

  /**
   * Varsayılan ayarları seed et
   * Requirements: 20.4
   */
  async seedDefaults(userId?: number): Promise<number> {
    let seededCount = 0

    for (const setting of DEFAULT_SETTINGS) {
      const exists = await this.repository.existsByKey(setting.key)
      if (!exists) {
        await this.repository.create(setting, userId)
        seededCount++
      }
    }

    return seededCount
  }

  /**
   * Varsayılan ayarları zorla güncelle (mevcut değerleri korumaz)
   */
  async resetToDefaults(userId?: number): Promise<number> {
    let resetCount = 0

    for (const setting of DEFAULT_SETTINGS) {
      await this.repository.upsertByKey(setting.key, setting.value, setting.group, userId)
      resetCount++
    }

    return resetCount
  }

  /**
   * Ayar değerini doğrula
   * Requirements: 20.6
   */
  private validateValue(key: string, value: string): void {
    const expectedType = SETTING_DATA_TYPES[key]
    
    if (!expectedType) {
      // Bilinmeyen key'ler için validasyon yapma
      return
    }

    switch (expectedType) {
      case 'number':
        const num = parseFloat(value)
        if (isNaN(num)) {
          throw new SettingsValidationError(key, value, 'Sayısal bir değer olmalıdır')
        }
        // Özel validasyonlar
        if (key === 'minimum_wage' && num < 0) {
          throw new SettingsValidationError(key, value, 'Asgari ücret negatif olamaz')
        }
        if (key === 'advance_max_percentage' && (num < 0 || num > 100)) {
          throw new SettingsValidationError(key, value, 'Avans yüzdesi 0-100 arasında olmalıdır')
        }
        if (key === 'annual_leave_base_days' && num < 0) {
          throw new SettingsValidationError(key, value, 'Yıllık izin günü negatif olamaz')
        }
        if (key === 'max_leave_transfer_days' && num < 0) {
          throw new SettingsValidationError(key, value, 'Devir izin günü negatif olamaz')
        }
        break

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          throw new SettingsValidationError(key, value, 'Boolean değer olmalıdır (true/false)')
        }
        break

      case 'json':
        try {
          JSON.parse(value)
        } catch {
          throw new SettingsValidationError(key, value, 'Geçerli JSON formatında olmalıdır')
        }
        break

      case 'string':
        // String için özel validasyon yok
        break
    }
  }

  /**
   * Ayar var mı kontrol et
   */
  async exists(key: string): Promise<boolean> {
    return this.repository.existsByKey(key)
  }

  /**
   * Birden fazla ayarı getir
   */
  async getMultiple(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {}
    
    for (const key of keys) {
      result[key] = await this.get(key)
    }
    
    return result
  }

  /**
   * Birden fazla ayarı set et
   */
  async setMultiple(settings: { key: string; value: string; group?: string }[], userId?: number): Promise<number> {
    let count = 0
    
    for (const setting of settings) {
      await this.set(setting.key, setting.value, setting.group, userId)
      count++
    }
    
    return count
  }
}

// Singleton instance
let instance: SettingsService | null = null

export function getSettingsService(prisma?: PrismaClient): SettingsService {
  if (!instance) {
    instance = new SettingsService(prisma)
  }
  return instance
}

// Test için instance'ı sıfırla
export function resetSettingsService(): void {
  instance = null
}

export default SettingsService
