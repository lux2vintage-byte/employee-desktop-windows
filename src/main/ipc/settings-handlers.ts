import { ipcMain } from 'electron'
import { SettingsController } from '../controllers/SettingsController'

let settingsController: SettingsController | null = null

/**
 * Settings Controller'ı başlat
 */
export function initializeSettingsController(): void {
  if (!settingsController) {
    settingsController = new SettingsController()
  }
}

/**
 * Settings IPC Handler'ları
 * Requirements: 20.1-20.6
 */
export function setupSettingsHandlers(): void {
  initializeSettingsController()

  // Ayar değerini getir
  ipcMain.handle('settings-get', async (event, key: string) => {
    try {
      return await settingsController!.get(key)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar getirilemedi: ${error.message}`]
      }
    }
  })

  // Ayar değerini sayı olarak getir
  ipcMain.handle('settings-get-number', async (event, key: string) => {
    try {
      const result = await settingsController!.get(key)
      if (result?.success && result.data?.value) {
        const num = parseFloat(result.data.value)
        return { success: true, data: isNaN(num) ? null : num }
      }
      return result
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar getirilemedi: ${error.message}`]
      }
    }
  })

  // Ayar değerini boolean olarak getir
  ipcMain.handle('settings-get-boolean', async (event, key: string) => {
    try {
      const result = await settingsController!.get(key)
      if (result?.success && result.data?.value) {
        return { success: true, data: result.data.value === 'true' || result.data.value === '1' }
      }
      return result
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar getirilemedi: ${error.message}`]
      }
    }
  })

  // Ayar değerini set et
  ipcMain.handle('settings-set', async (event, key: string, value: string, group?: string, userId?: number) => {
    try {
      return await settingsController!.set({ key, value, group }, userId)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar kaydedilemedi: ${error.message}`]
      }
    }
  })

  // Sayı değeri set et
  ipcMain.handle('settings-set-number', async (event, key: string, value: number, group?: string, userId?: number) => {
    try {
      return await settingsController!.set({ key, value: String(value), group }, userId)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar kaydedilemedi: ${error.message}`]
      }
    }
  })

  // Boolean değeri set et
  ipcMain.handle('settings-set-boolean', async (event, key: string, value: boolean, group?: string, userId?: number) => {
    try {
      return await settingsController!.set({ key, value: value ? 'true' : 'false', group }, userId)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar kaydedilemedi: ${error.message}`]
      }
    }
  })

  // Grup ile ayarları getir
  ipcMain.handle('settings-get-by-group', async (event, group: string) => {
    try {
      return await settingsController!.getByGroup(group)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Grup ayarları getirilemedi: ${error.message}`]
      }
    }
  })

  // Tüm ayarları getir
  ipcMain.handle('settings-get-all', async () => {
    try {
      return await settingsController!.getAll()
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayarlar getirilemedi: ${error.message}`]
      }
    }
  })

  // Tüm grupları getir
  ipcMain.handle('settings-get-all-groups', async () => {
    try {
      return await settingsController!.getAllGroups()
    } catch (error: any) {
      return {
        success: false,
        errors: [`Gruplar getirilemedi: ${error.message}`]
      }
    }
  })

  // Ayar sil
  ipcMain.handle('settings-delete', async (event, key: string, userId?: number) => {
    try {
      return await settingsController!.delete(key, userId)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar silinemedi: ${error.message}`]
      }
    }
  })

  // Varsayılan ayarları seed et
  ipcMain.handle('settings-seed-defaults', async (event, userId?: number) => {
    try {
      return await settingsController!.seedDefaults(userId)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Varsayılan ayarlar oluşturulamadı: ${error.message}`]
      }
    }
  })

  // Varsayılan ayarlara sıfırla
  ipcMain.handle('settings-reset-to-defaults', async (event, userId?: number) => {
    try {
      return await settingsController!.resetToDefaults(userId)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayarlar sıfırlanamadı: ${error.message}`]
      }
    }
  })

  // Birden fazla ayarı getir
  ipcMain.handle('settings-get-multiple', async (event, keys: string[]) => {
    try {
      return await settingsController!.getMultiple(keys)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayarlar getirilemedi: ${error.message}`]
      }
    }
  })

  // Birden fazla ayarı set et
  ipcMain.handle('settings-set-multiple', async (event, settings: { key: string; value: string; group?: string }[], userId?: number) => {
    try {
      return await settingsController!.setMultiple(settings, userId)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayarlar kaydedilemedi: ${error.message}`]
      }
    }
  })

  // Ayar var mı kontrol et
  ipcMain.handle('settings-exists', async (event, key: string) => {
    try {
      return await settingsController!.exists(key)
    } catch (error: any) {
      return {
        success: false,
        errors: [`Ayar kontrolü yapılamadı: ${error.message}`]
      }
    }
  })
}
