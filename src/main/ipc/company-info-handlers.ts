import { ipcMain } from 'electron'
import { CompanyInfoController } from '../controllers/CompanyInfoController'

let companyInfoController: CompanyInfoController | null = null

/**
 * CompanyInfo Controller'ı başlat
 */
export function initializeCompanyInfoController(): void {
  if (!companyInfoController) {
    companyInfoController = new CompanyInfoController()
  }
}

/**
 * Şirket Bilgileri IPC Handler'ları
 */
export function setupCompanyInfoHandlers(): void {
  initializeCompanyInfoController()

  // Şirket bilgilerini getir
  ipcMain.handle('company-info-get', async () => {
    try {
      return await companyInfoController!.getInfo()
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Şirket bilgileri getirilemedi: ${error.message}`] 
      }
    }
  })

  // Şirket bilgilerini güncelle
  ipcMain.handle('company-info-update', async (event, data) => {
    try {
      return await companyInfoController!.update(data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Şirket bilgileri güncellenemedi: ${error.message}`] 
      }
    }
  })

  // Genel bilgileri güncelle
  ipcMain.handle('company-info-update-general', async (event, data) => {
    try {
      return await companyInfoController!.updateGeneral(data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Genel bilgiler güncellenemedi: ${error.message}`] 
      }
    }
  })

  // İletişim bilgilerini güncelle
  ipcMain.handle('company-info-update-contact', async (event, data) => {
    try {
      return await companyInfoController!.updateContact(data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`İletişim bilgileri güncellenemedi: ${error.message}`] 
      }
    }
  })

  // Vergi bilgilerini güncelle
  ipcMain.handle('company-info-update-tax', async (event, data) => {
    try {
      return await companyInfoController!.updateTax(data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Vergi bilgileri güncellenemedi: ${error.message}`] 
      }
    }
  })

  // Banka bilgilerini güncelle
  ipcMain.handle('company-info-update-bank', async (event, data) => {
    try {
      return await companyInfoController!.updateBank(data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Banka bilgileri güncellenemedi: ${error.message}`] 
      }
    }
  })

  // Logo bilgilerini güncelle
  ipcMain.handle('company-info-update-logo', async (event, data) => {
    try {
      return await companyInfoController!.updateLogo(data)
    } catch (error: any) {
      return { 
        success: false, 
        errors: [`Logo bilgileri güncellenemedi: ${error.message}`] 
      }
    }
  })
}
