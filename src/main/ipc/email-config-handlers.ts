import { ipcMain } from 'electron'
import { EmailConfigController } from '../controllers/EmailConfigController'
import { getPrisma } from '../database/config'

let emailConfigController: EmailConfigController | null = null

/**
 * EmailConfig Controller'ı başlat
 */
export function initializeEmailConfigController(): void {
  if (!emailConfigController) {
    const prisma = getPrisma()
    emailConfigController = new EmailConfigController(prisma)
  }
}

/**
 * Email Config IPC Handler'ları
 */
export function setupEmailConfigHandlers(): void {
  initializeEmailConfigController()

  // Tüm email yapılandırmalarını getir
  ipcMain.handle('email-config-get-all', async (_event, options) => {
    try {
      return await emailConfigController!.getAll(options)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Email yapılandırmaları getirilemedi: ${error.message}`] 
      }
    }
  })

  // Aktif email yapılandırmasını getir
  ipcMain.handle('email-config-get-active', async () => {
    try {
      return await emailConfigController!.getActive()
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Aktif email yapılandırması getirilemedi: ${error.message}`] 
      }
    }
  })

  // ID ile email yapılandırması getir
  ipcMain.handle('email-config-get-by-id', async (_event, id) => {
    try {
      return await emailConfigController!.getById(id)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Email yapılandırması getirilemedi: ${error.message}`] 
      }
    }
  })

  // Email yapılandırması oluştur
  ipcMain.handle('email-config-create', async (_event, data) => {
    try {
      return await emailConfigController!.create(data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Email yapılandırması oluşturulamadı: ${error.message}`] 
      }
    }
  })

  // Email yapılandırması güncelle
  ipcMain.handle('email-config-update', async (_event, id, data) => {
    try {
      return await emailConfigController!.update(id, data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Email yapılandırması güncellenemedi: ${error.message}`] 
      }
    }
  })

  // Email yapılandırması sil
  ipcMain.handle('email-config-delete', async (_event, id) => {
    try {
      return await emailConfigController!.delete(id)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Email yapılandırması silinemedi: ${error.message}`] 
      }
    }
  })

  // Email yapılandırmasını aktif yap
  ipcMain.handle('email-config-set-active', async (_event, id) => {
    try {
      return await emailConfigController!.setActive(id)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Email yapılandırması aktif yapılamadı: ${error.message}`] 
      }
    }
  })

  // Şifreyi decrypt edilmiş olarak getir
  ipcMain.handle('email-config-get-password', async (_event, id) => {
    try {
      return await emailConfigController!.getDecryptedPassword(id)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Şifre getirilemedi: ${error.message}`] 
      }
    }
  })
}
