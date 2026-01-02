import { ipcMain } from 'electron'
import { OvertimeController } from '../controllers/OvertimeController'

let overtimeController: OvertimeController | null = null

/**
 * Overtime Controller'ı başlat
 */
export function initializeOvertimeController(): void {
  if (!overtimeController) {
    overtimeController = new OvertimeController()
  }
}

/**
 * Overtime IPC Handler'ları
 * Requirements: 8.1-8.6
 */
export function setupOvertimeHandlers(): void {
  initializeOvertimeController()

  // Tüm fazla mesai kayıtlarını getir
  ipcMain.handle('overtime-get-all', async (_event, options) => {
    try {
      return await overtimeController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Fazla mesai kaydı getir
  ipcMain.handle('overtime-get-by-id', async (_event, id: number) => {
    try {
      return await overtimeController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai kaydı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı fazla mesai kayıtlarını getir
  ipcMain.handle('overtime-get-by-employee', async (_event, employeeId: number, startDate?: Date, endDate?: Date) => {
    try {
      return await overtimeController!.getByEmployee(employeeId, startDate, endDate)
    } catch (error) {
      return { success: false, errors: ['Personel fazla mesai kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Bekleyen fazla mesai kayıtlarını getir
  ipcMain.handle('overtime-get-pending', async () => {
    try {
      return await overtimeController!.getPending()
    } catch (error) {
      return { success: false, errors: ['Bekleyen fazla mesai kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Fazla mesai kaydı oluştur
  ipcMain.handle('overtime-create', async (_event, data, userId?: number) => {
    try {
      return await overtimeController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Fazla mesai kaydı güncelle
  ipcMain.handle('overtime-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await overtimeController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai kaydı güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Fazla mesai kaydı sil
  ipcMain.handle('overtime-delete', async (_event, id: number, userId?: number) => {
    try {
      return await overtimeController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai kaydı silinemedi: ' + (error as Error).message] }
    }
  })

  // Fazla mesai kaydını onayla
  ipcMain.handle('overtime-approve', async (_event, id: number, approverId: number, userId?: number) => {
    try {
      return await overtimeController!.approve(id, approverId, userId)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai kaydı onaylanamadı: ' + (error as Error).message] }
    }
  })

  // Fazla mesai kaydını reddet
  ipcMain.handle('overtime-reject', async (_event, id: number, approverId: number, userId?: number) => {
    try {
      return await overtimeController!.reject(id, approverId, userId)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai kaydı reddedilemedi: ' + (error as Error).message] }
    }
  })

  // Fazla mesai ücreti hesapla
  ipcMain.handle('overtime-calculate-pay', async (_event, id: number, hourlyRate: number) => {
    try {
      return await overtimeController!.calculateOvertimePay(id, hourlyRate)
    } catch (error) {
      return { success: false, errors: ['Fazla mesai ücreti hesaplanamadı: ' + (error as Error).message] }
    }
  })

  // Aylık toplam onaylanmış mesai saati getir
  ipcMain.handle('overtime-get-total-approved-hours', async (_event, employeeId: number, month: number, year: number) => {
    try {
      return await overtimeController!.getTotalApprovedHours(employeeId, month, year)
    } catch (error) {
      return { success: false, errors: ['Toplam mesai saati getirilemedi: ' + (error as Error).message] }
    }
  })

  // Aylık toplam mesai ücreti hesapla
  ipcMain.handle('overtime-calculate-monthly-pay', async (_event, employeeId: number, month: number, year: number, hourlyRate: number) => {
    try {
      return await overtimeController!.calculateMonthlyOvertimePay(employeeId, month, year, hourlyRate)
    } catch (error) {
      return { success: false, errors: ['Aylık mesai ücreti hesaplanamadı: ' + (error as Error).message] }
    }
  })
}
