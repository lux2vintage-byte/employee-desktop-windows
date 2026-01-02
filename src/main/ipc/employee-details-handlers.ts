import { ipcMain } from 'electron'
import { EmployeeDetailsController } from '../controllers/EmployeeDetailsController'

let employeeDetailsController: EmployeeDetailsController | null = null

/**
 * EmployeeDetails Controller'ı başlat
 */
export function initializeEmployeeDetailsController(): void {
  if (!employeeDetailsController) {
    employeeDetailsController = new EmployeeDetailsController()
  }
}

/**
 * EmployeeDetails IPC Handler'ları
 * Requirements: 5.1-5.9
 */
export function setupEmployeeDetailsHandlers(): void {
  initializeEmployeeDetailsController()

  // Personel ID ile detay bilgisi getir
  ipcMain.handle('employee-details-get-by-employee-id', async (_event, employeeId: number) => {
    try {
      return await employeeDetailsController!.getByEmployeeId(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel detay bilgisi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ID ile çözülmüş detay bilgisi getir
  ipcMain.handle('employee-details-get-by-employee-id-decrypted', async (_event, employeeId: number) => {
    try {
      return await employeeDetailsController!.getByEmployeeIdDecrypted(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel detay bilgisi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm detay bilgilerini getir
  ipcMain.handle('employee-details-get-all', async () => {
    try {
      return await employeeDetailsController!.getAll()
    } catch (error) {
      return { success: false, errors: ['Personel detay bilgileri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel detay bilgisi oluştur
  ipcMain.handle('employee-details-create', async (_event, data, userId?: number) => {
    try {
      return await employeeDetailsController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Personel detay bilgisi oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Personel detay bilgisi güncelle
  ipcMain.handle('employee-details-update', async (_event, employeeId: number, data, userId?: number) => {
    try {
      return await employeeDetailsController!.update(employeeId, data, userId)
    } catch (error) {
      return { success: false, errors: ['Personel detay bilgisi güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Personel detay bilgisi sil
  ipcMain.handle('employee-details-delete', async (_event, employeeId: number, userId?: number) => {
    try {
      return await employeeDetailsController!.delete(employeeId, userId)
    } catch (error) {
      return { success: false, errors: ['Personel detay bilgisi silinemedi: ' + (error as Error).message] }
    }
  })

  // Upsert - varsa güncelle, yoksa oluştur
  ipcMain.handle('employee-details-upsert', async (_event, employeeId: number, data, userId?: number) => {
    try {
      return await employeeDetailsController!.upsert(employeeId, data, userId)
    } catch (error) {
      return { success: false, errors: ['Personel detay bilgisi kaydedilemedi: ' + (error as Error).message] }
    }
  })

  // Kan grubuna göre personelleri getir
  ipcMain.handle('employee-details-get-by-blood-group', async (_event, bloodGroup) => {
    try {
      return await employeeDetailsController!.getByBloodGroup(bloodGroup)
    } catch (error) {
      return { success: false, errors: ['Kan grubuna göre personeller getirilemedi: ' + (error as Error).message] }
    }
  })

  // Askerlik durumuna göre personelleri getir
  ipcMain.handle('employee-details-get-by-military-status', async (_event, militaryStatus) => {
    try {
      return await employeeDetailsController!.getByMilitaryStatus(militaryStatus)
    } catch (error) {
      return { success: false, errors: ['Askerlik durumuna göre personeller getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel için detay bilgisi var mı kontrol et
  ipcMain.handle('employee-details-exists-for-employee', async (_event, employeeId: number) => {
    try {
      return await employeeDetailsController!.existsForEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Detay bilgisi kontrolü yapılamadı: ' + (error as Error).message] }
    }
  })
}
