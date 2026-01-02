import { ipcMain } from 'electron'
import { LeaveRequestController } from '../controllers/LeaveRequestController'

let leaveRequestController: LeaveRequestController | null = null

/**
 * LeaveRequest Controller'ı başlat
 */
export function initializeLeaveRequestController(): void {
  if (!leaveRequestController) {
    leaveRequestController = new LeaveRequestController()
  }
}

/**
 * LeaveRequest IPC Handler'ları
 * Requirements: 10.1-10.9
 */
export function setupLeaveRequestHandlers(): void {
  initializeLeaveRequestController()

  // Tüm izin taleplerini getir
  ipcMain.handle('leave-request-get-all', async (_event, options) => {
    try {
      return await leaveRequestController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['İzin talepleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // İzin talebi getir
  ipcMain.handle('leave-request-get-by-id', async (_event, id: number) => {
    try {
      return await leaveRequestController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['İzin talebi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı izin taleplerini getir
  ipcMain.handle('leave-request-get-by-employee', async (_event, employeeId: number) => {
    try {
      return await leaveRequestController!.getByEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel izin talepleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Bekleyen izin taleplerini getir
  ipcMain.handle('leave-request-get-pending', async () => {
    try {
      return await leaveRequestController!.getPending()
    } catch (error) {
      return { success: false, errors: ['Bekleyen izin talepleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tarih aralığında izin taleplerini getir
  ipcMain.handle('leave-request-get-by-date-range', async (_event, startDate: Date, endDate: Date) => {
    try {
      return await leaveRequestController!.getByDateRange(startDate, endDate)
    } catch (error) {
      return { success: false, errors: ['Tarih aralığı izin talepleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // İzin talebi oluştur
  ipcMain.handle('leave-request-create', async (_event, data, userId?: number) => {
    try {
      return await leaveRequestController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['İzin talebi oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // İzin talebi güncelle
  ipcMain.handle('leave-request-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await leaveRequestController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['İzin talebi güncellenemedi: ' + (error as Error).message] }
    }
  })

  // İzin talebini onayla
  ipcMain.handle('leave-request-approve', async (_event, id: number, approverId: number, userId?: number) => {
    try {
      return await leaveRequestController!.approve(id, approverId, userId)
    } catch (error) {
      return { success: false, errors: ['İzin talebi onaylanamadı: ' + (error as Error).message] }
    }
  })

  // İzin talebini reddet
  ipcMain.handle('leave-request-reject', async (_event, id: number, approverId: number, userId?: number) => {
    try {
      return await leaveRequestController!.reject(id, approverId, userId)
    } catch (error) {
      return { success: false, errors: ['İzin talebi reddedilemedi: ' + (error as Error).message] }
    }
  })

  // İzin talebini iptal et
  ipcMain.handle('leave-request-cancel', async (_event, id: number, userId?: number) => {
    try {
      return await leaveRequestController!.cancel(id, userId)
    } catch (error) {
      return { success: false, errors: ['İzin talebi iptal edilemedi: ' + (error as Error).message] }
    }
  })

  // İzin talebi sil
  ipcMain.handle('leave-request-delete', async (_event, id: number, userId?: number) => {
    try {
      return await leaveRequestController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['İzin talebi silinemedi: ' + (error as Error).message] }
    }
  })

  // Gün sayısı hesapla
  ipcMain.handle('leave-request-calculate-day-count', async (_event, startDate: Date, endDate: Date, isHalfDay?: boolean) => {
    try {
      return leaveRequestController!.calculateDayCount(startDate, endDate, isHalfDay)
    } catch (error) {
      return { success: false, errors: ['Gün sayısı hesaplanamadı: ' + (error as Error).message] }
    }
  })

  // Çakışma kontrolü
  ipcMain.handle('leave-request-check-overlap', async (_event, employeeId: number, startDate: Date, endDate: Date) => {
    try {
      return await leaveRequestController!.checkOverlap(employeeId, startDate, endDate)
    } catch (error) {
      return { success: false, errors: ['Çakışma kontrolü yapılamadı: ' + (error as Error).message] }
    }
  })
}
