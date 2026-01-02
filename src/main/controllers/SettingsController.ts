import { BaseController } from './BaseController'
import { SettingsService, SettingsValidationError, SettingsBusinessRuleError } from '../services/SettingsService'

/**
 * Settings Controller
 * Uygulama ayarları için controller
 * Requirements: 20.1-20.6
 */
export class SettingsController extends BaseController {
  private settingsService: SettingsService

  constructor() {
    super()
    this.settingsService = new SettingsService()
  }

  /**
   * Ayar değerini getir
   */
  async get(key: string): Promise<any> {
    try {
      if (!key || key.trim() === '') {
        return this.error(['Key parametresi zorunludur'], 400)
      }

      const value = await this.settingsService.get(key)
      return this.success({ key, value })
    } catch (error) {
      return this.handleError(error, 'Ayar getirme')
    }
  }

  /**
   * Ayar değerini set et
   */
  async set(data: { key: string; value: string; group?: string }, userId?: number): Promise<any> {
    try {
      if (!data.key || data.key.trim() === '') {
        return this.error(['Key parametresi zorunludur'], 400)
      }

      if (data.value === undefined || data.value === null) {
        return this.error(['Value parametresi zorunludur'], 400)
      }

      const setting = await this.settingsService.set(data.key, data.value, data.group, userId)
      return this.success(setting, 'Ayar başarıyla kaydedildi')
    } catch (error) {
      if (error instanceof SettingsValidationError) {
        return this.error([`Doğrulama hatası: ${error.constraint}`], 422)
      }
      return this.handleError(error, 'Ayar kaydetme')
    }
  }

  /**
   * Grup ile ayarları getir
   */
  async getByGroup(group: string): Promise<any> {
    try {
      if (!group || group.trim() === '') {
        return this.error(['Group parametresi zorunludur'], 400)
      }

      const settings = await this.settingsService.getByGroup(group)
      return this.success(settings)
    } catch (error) {
      return this.handleError(error, 'Grup ayarları getirme')
    }
  }

  /**
   * Tüm ayarları getir
   */
  async getAll(): Promise<any> {
    try {
      const settings = await this.settingsService.getAll()
      return this.success(settings)
    } catch (error) {
      return this.handleError(error, 'Tüm ayarları getirme')
    }
  }

  /**
   * Tüm grupları getir
   */
  async getAllGroups(): Promise<any> {
    try {
      const groups = await this.settingsService.getAllGroups()
      return this.success(groups)
    } catch (error) {
      return this.handleError(error, 'Grupları getirme')
    }
  }

  /**
   * Ayar sil
   */
  async delete(key: string, userId?: number): Promise<any> {
    try {
      if (!key || key.trim() === '') {
        return this.error(['Key parametresi zorunludur'], 400)
      }

      const deleted = await this.settingsService.delete(key, userId)
      if (!deleted) {
        return this.error(['Ayar bulunamadı'], 404)
      }
      return this.success(deleted, 'Ayar başarıyla silindi')
    } catch (error) {
      return this.handleError(error, 'Ayar silme')
    }
  }

  /**
   * Varsayılan ayarları seed et
   */
  async seedDefaults(userId?: number): Promise<any> {
    try {
      const count = await this.settingsService.seedDefaults(userId)
      return this.success({ seededCount: count }, `${count} varsayılan ayar oluşturuldu`)
    } catch (error) {
      return this.handleError(error, 'Varsayılan ayarları oluşturma')
    }
  }

  /**
   * Varsayılan ayarlara sıfırla
   */
  async resetToDefaults(userId?: number): Promise<any> {
    try {
      const count = await this.settingsService.resetToDefaults(userId)
      return this.success({ resetCount: count }, `${count} ayar varsayılana sıfırlandı`)
    } catch (error) {
      return this.handleError(error, 'Ayarları sıfırlama')
    }
  }

  /**
   * Birden fazla ayarı getir
   */
  async getMultiple(keys: string[]): Promise<any> {
    try {
      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return this.error(['Keys parametresi zorunludur ve dizi olmalıdır'], 400)
      }

      const settings = await this.settingsService.getMultiple(keys)
      return this.success(settings)
    } catch (error) {
      return this.handleError(error, 'Çoklu ayar getirme')
    }
  }

  /**
   * Birden fazla ayarı set et
   */
  async setMultiple(settings: { key: string; value: string; group?: string }[], userId?: number): Promise<any> {
    try {
      if (!settings || !Array.isArray(settings) || settings.length === 0) {
        return this.error(['Settings parametresi zorunludur ve dizi olmalıdır'], 400)
      }

      // Validate each setting
      for (const setting of settings) {
        if (!setting.key || setting.key.trim() === '') {
          return this.error(['Her ayar için key zorunludur'], 400)
        }
        if (setting.value === undefined || setting.value === null) {
          return this.error([`${setting.key} için value zorunludur`], 400)
        }
      }

      const count = await this.settingsService.setMultiple(settings, userId)
      return this.success({ updatedCount: count }, `${count} ayar başarıyla kaydedildi`)
    } catch (error) {
      if (error instanceof SettingsValidationError) {
        return this.error([`Doğrulama hatası: ${error.constraint}`], 422)
      }
      return this.handleError(error, 'Çoklu ayar kaydetme')
    }
  }

  /**
   * Ayar var mı kontrol et
   */
  async exists(key: string): Promise<any> {
    try {
      if (!key || key.trim() === '') {
        return this.error(['Key parametresi zorunludur'], 400)
      }

      const exists = await this.settingsService.exists(key)
      return this.success({ key, exists })
    } catch (error) {
      return this.handleError(error, 'Ayar kontrolü')
    }
  }
}

export default SettingsController
