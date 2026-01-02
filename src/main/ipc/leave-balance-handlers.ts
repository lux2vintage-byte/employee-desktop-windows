import { ipcMain } from 'electron'
import { LeaveBalanceController } from '../controllers/LeaveBalanceController'

let leaveBalanceController: LeaveBalanceController | null = null

/**
 * LeaveBalance Controller'ı başlat
 */
export function initializeLeaveBalanceController(): void {
  if (!leaveBalanceController) {
    leaveBalanceController = new LeaveBalanceController()
  }
}

/**
 * LeaveBalance IPC Handler'ları
 * Requirements: 11.1-11.7
 */
export function setupLeaveBalanceHandlers(): void {
  initializeLeaveBalanceController()

  // Tüm izin bakiyelerini getir
  ipcMain.handle('leave-balance-get-all', async (_event, options) => {
    try {
      return await leaveBalanceController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['İzin bakiyeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // İzin bakiyesi getir (ID ile)
  ipcMain.handle('leave-balance-get-by-id', async (_event, id: number) => {
    try {
      return await leaveBalanceController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['İzin bakiyesi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ve yıl ile izin bakiyesi getir
  ipcMain.handle('leave-balance-get', async (_event, employeeId: number, year: number) => {
    try {
      return await leaveBalanceController!.getBalance(employeeId, year)
    } catch (error) {
      return { success: false, errors: ['İzin bakiyesi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı izin bakiyelerini getir
  ipcMain.handle('leave-balance-get-by-employee', async (_event, employeeId: number) => {
    try {
      return await leaveBalanceController!.getByEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel izin bakiyeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Yıl bazlı izin bakiyelerini getir
  ipcMain.handle('leave-balance-get-by-year', async (_event, year: number) => {
    try {
      return await leaveBalanceController!.getByYear(year)
    } catch (error) {
      return { success: false, errors: ['Yıl bazlı izin bakiyeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // İzin bakiyesi oluştur
  ipcMain.handle('leave-balance-create', async (_event, employeeId: number, year: number, userId?: number) => {
    try {
      return await leaveBalanceController!.create(employeeId, year, userId)
    } catch (error) {
      return { success: false, errors: ['İzin bakiyesi oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // İzin bakiyesi güncelle
  ipcMain.handle('leave-balance-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await leaveBalanceController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['İzin bakiyesi güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Kullanılan günleri düş
  ipcMain.handle('leave-balance-deduct-days', async (_event, employeeId: number, year: number, days: number, userId?: number) => {
    try {
      return await leaveBalanceController!.deductDays(employeeId, year, days, userId)
    } catch (error) {
      return { success: false, errors: ['İzin bakiyesi düşülemedi: ' + (error as Error).message] }
    }
  })

  // Kullanılan günleri ekle
  ipcMain.handle('leave-balance-add-days', async (_event, employeeId: number, year: number, days: number, userId?: number) => {
    try {
      return await leaveBalanceController!.addDays(employeeId, year, days, userId)
    } catch (error) {
      return { success: false, errors: ['İzin bakiyesi eklenemedi: ' + (error as Error).message] }
    }
  })

  // Yıl sonu devir işlemi
  ipcMain.handle('leave-balance-transfer-to-next-year', async (_event, employeeId: number, fromYear: number, userId?: number) => {
    try {
      return await leaveBalanceController!.transferToNextYear(employeeId, fromYear, userId)
    } catch (error) {
      return { success: false, errors: ['İzin devri yapılamadı: ' + (error as Error).message] }
    }
  })

  // Kıdeme göre yıllık izin hakkı hesapla
  ipcMain.handle('leave-balance-calculate-entitlement', async (_event, employeeId: number, year: number) => {
    try {
      return await leaveBalanceController!.calculateEntitlement(employeeId, year)
    } catch (error) {
      return { success: false, errors: ['İzin hakkı hesaplanamadı: ' + (error as Error).message] }
    }
  })

  // Yıllık bakiyeleri toplu oluştur
  ipcMain.handle('leave-balance-initialize-yearly', async (_event, year: number, userId?: number) => {
    try {
      return await leaveBalanceController!.initializeYearlyBalances(year, userId)
    } catch (error) {
      return { success: false, errors: ['Yıllık bakiyeler oluşturulamadı: ' + (error as Error).message] }
    }
  })
}
