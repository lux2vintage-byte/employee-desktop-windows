import { ipcMain } from 'electron'
import { AdvanceController } from '../controllers/AdvanceController'

let advanceController: AdvanceController | null = null

/**
 * Advance Controller'ı başlat
 */
export function initializeAdvanceController(): void {
  if (!advanceController) {
    advanceController = new AdvanceController()
  }
}

/**
 * Advance IPC Handler'ları
 * Requirements: 15.1-15.7
 */
export function setupAdvanceHandlers(): void {
  initializeAdvanceController()

  // Avans talebi oluştur
  ipcMain.handle('advance-request', async (_event, employeeId: number, data, userId?: number) => {
    try {
      return await advanceController!.request(employeeId, data, userId)
    } catch (error) {
      return { success: false, errors: ['Avans talebi oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Avans getir (ID ile)
  ipcMain.handle('advance-get-by-id', async (_event, id: number) => {
    try {
      return await advanceController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Avans getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm avansları getir
  ipcMain.handle('advance-get-all', async (_event, options) => {
    try {
      return await advanceController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Avans listesi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı avansları getir
  ipcMain.handle('advance-get-by-employee', async (_event, employeeId: number) => {
    try {
      return await advanceController!.getByEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel avansları getirilemedi: ' + (error as Error).message] }
    }
  })


  // Bekleyen avansları getir
  ipcMain.handle('advance-get-pending', async (_event) => {
    try {
      return await advanceController!.getPending()
    } catch (error) {
      return { success: false, errors: ['Bekleyen avanslar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Kesinti dönemi bazlı avansları getir
  ipcMain.handle('advance-get-by-deduction-period', async (_event, deductionPeriod: string) => {
    try {
      return await advanceController!.getByDeductionPeriod(deductionPeriod)
    } catch (error) {
      return { success: false, errors: ['Kesinti dönemi avansları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Avansı onayla
  ipcMain.handle('advance-approve', async (_event, id: number, approverId: number, deductionPeriod: string, userId?: number) => {
    try {
      return await advanceController!.approve(id, approverId, deductionPeriod, userId)
    } catch (error) {
      return { success: false, errors: ['Avans onaylanamadı: ' + (error as Error).message] }
    }
  })

  // Avansı reddet
  ipcMain.handle('advance-reject', async (_event, id: number, approverId: number, userId?: number) => {
    try {
      return await advanceController!.reject(id, approverId, userId)
    } catch (error) {
      return { success: false, errors: ['Avans reddedilemedi: ' + (error as Error).message] }
    }
  })

  // Avansı ödenmiş olarak işaretle
  ipcMain.handle('advance-mark-as-paid', async (_event, id: number, paymentDate: string, userId?: number) => {
    try {
      return await advanceController!.markAsPaid(id, new Date(paymentDate), userId)
    } catch (error) {
      return { success: false, errors: ['Avans ödeme işaretlenemedi: ' + (error as Error).message] }
    }
  })

  // Avansı kesilmiş olarak işaretle
  ipcMain.handle('advance-mark-as-deducted', async (_event, id: number, userId?: number) => {
    try {
      return await advanceController!.markAsDeducted(id, userId)
    } catch (error) {
      return { success: false, errors: ['Avans kesinti işaretlenemedi: ' + (error as Error).message] }
    }
  })

  // Personelin bekleyen avansı var mı kontrol et
  ipcMain.handle('advance-has-pending', async (_event, employeeId: number) => {
    try {
      return await advanceController!.hasPendingAdvance(employeeId)
    } catch (error) {
      return { success: false, errors: ['Bekleyen avans kontrolü yapılamadı: ' + (error as Error).message] }
    }
  })

  // Personelin maksimum avans tutarını getir
  ipcMain.handle('advance-get-max-amount', async (_event, employeeId: number) => {
    try {
      return await advanceController!.getMaxAdvanceAmount(employeeId)
    } catch (error) {
      return { success: false, errors: ['Maksimum avans tutarı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Avans tutarını doğrula
  ipcMain.handle('advance-validate-amount', async (_event, employeeId: number, amount: number) => {
    try {
      return await advanceController!.validateAmount(employeeId, amount)
    } catch (error) {
      return { success: false, errors: ['Avans tutarı doğrulanamadı: ' + (error as Error).message] }
    }
  })
}
