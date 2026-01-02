import { ipcMain } from 'electron'
import { EmployeeController } from '../controllers/EmployeeController'

let employeeController: EmployeeController | null = null

/**
 * Employee Controller'ı başlat
 */
export function initializeEmployeeController(): void {
  if (!employeeController) {
    employeeController = new EmployeeController()
  }
}

/**
 * Employee IPC Handler'ları
 * Requirements: 4.1-4.10
 */
export function setupEmployeeHandlers(): void {
  initializeEmployeeController()

  // Tüm personelleri getir
  ipcMain.handle('employee-get-all', async (_event, options) => {
    try {
      return await employeeController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Personeller getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel getir
  ipcMain.handle('employee-get-by-id', async (_event, id: number) => {
    try {
      return await employeeController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Personel getirilemedi: ' + (error as Error).message] }
    }
  })

  // Sicil no ile personel getir
  ipcMain.handle('employee-get-by-code', async (_event, employeeCode: string) => {
    try {
      return await employeeController!.getByCode(employeeCode)
    } catch (error) {
      return { success: false, errors: ['Personel getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel oluştur
  ipcMain.handle('employee-create', async (_event, data, userId?: number) => {
    try {
      return await employeeController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Personel oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Personel güncelle
  ipcMain.handle('employee-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await employeeController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Personel güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Personel sil
  ipcMain.handle('employee-delete', async (_event, id: number, userId?: number) => {
    try {
      return await employeeController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Personel silinemedi: ' + (error as Error).message] }
    }
  })

  // Personeli geri yükle
  ipcMain.handle('employee-restore', async (_event, id: number, userId?: number) => {
    try {
      return await employeeController!.restore(id, userId)
    } catch (error) {
      return { success: false, errors: ['Personel geri yüklenemedi: ' + (error as Error).message] }
    }
  })

  // Departman bazlı personelleri getir
  ipcMain.handle('employee-get-by-department', async (_event, departmentId: number) => {
    try {
      return await employeeController!.getByDepartment(departmentId)
    } catch (error) {
      return { success: false, errors: ['Departman personelleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Yönetici bazlı personelleri getir (astlar)
  ipcMain.handle('employee-get-by-manager', async (_event, managerId: number) => {
    try {
      return await employeeController!.getByManager(managerId)
    } catch (error) {
      return { success: false, errors: ['Yönetici astları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel durumunu değiştir
  ipcMain.handle('employee-change-status', async (_event, id: number, status, userId?: number) => {
    try {
      return await employeeController!.changeStatus(id, status, userId)
    } catch (error) {
      return { success: false, errors: ['Personel durumu güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Benzersiz sicil no üret
  ipcMain.handle('employee-generate-code', async () => {
    try {
      return await employeeController!.generateEmployeeCode()
    } catch (error) {
      return { success: false, errors: ['Sicil no üretilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ile birlikte çözülmüş TC Kimlik No getir
  ipcMain.handle('employee-get-by-id-decrypted', async (_event, id: number) => {
    try {
      return await employeeController!.getByIdWithDecryptedIdentity(id)
    } catch (error) {
      return { success: false, errors: ['Personel getirilemedi: ' + (error as Error).message] }
    }
  })

  // İsim ve soyisime göre personel ara
  ipcMain.handle('employee-search-by-name', async (_event, searchTerm: string) => {
    try {
      return await employeeController!.searchByName(searchTerm)
    } catch (error) {
      return { success: false, errors: ['Personel aranamadı: ' + (error as Error).message] }
    }
  })

  // Aktif personel sayısını getir
  ipcMain.handle('employee-get-active-count', async () => {
    try {
      return await employeeController!.getActiveCount()
    } catch (error) {
      return { success: false, errors: ['Aktif personel sayısı getirilemedi: ' + (error as Error).message] }
    }
  })
}
