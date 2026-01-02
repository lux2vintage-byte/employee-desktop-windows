import { ipcMain } from 'electron'
import { LeaveTypeController } from '../controllers/LeaveTypeController'

let leaveTypeController: LeaveTypeController | null = null

/**
 * LeaveType Controller'ı başlat
 */
export function initializeLeaveTypeController(): void {
  if (!leaveTypeController) {
    leaveTypeController = new LeaveTypeController()
  }
}

/**
 * LeaveType IPC Handler'ları
 * Requirements: 9.1-9.6
 */
export function setupLeaveTypeHandlers(): void {
  initializeLeaveTypeController()

  // Tüm izin türlerini getir
  ipcMain.handle('leave-type-get-all', async (_event, options) => {
    try {
      return await leaveTypeController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['İzin türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm izin türlerini sayfalama olmadan getir
  ipcMain.handle('leave-type-get-all-without-pagination', async () => {
    try {
      return await leaveTypeController!.getAllWithoutPagination()
    } catch (error) {
      return { success: false, errors: ['İzin türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // İzin türü getir
  ipcMain.handle('leave-type-get-by-id', async (_event, id: number) => {
    try {
      return await leaveTypeController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['İzin türü getirilemedi: ' + (error as Error).message] }
    }
  })

  // Ücretli izin türlerini getir
  ipcMain.handle('leave-type-get-paid', async () => {
    try {
      return await leaveTypeController!.getPaidLeaveTypes()
    } catch (error) {
      return { success: false, errors: ['Ücretli izin türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Ücretsiz izin türlerini getir
  ipcMain.handle('leave-type-get-unpaid', async () => {
    try {
      return await leaveTypeController!.getUnpaidLeaveTypes()
    } catch (error) {
      return { success: false, errors: ['Ücretsiz izin türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // İzin türü oluştur
  ipcMain.handle('leave-type-create', async (_event, data, userId?: number) => {
    try {
      return await leaveTypeController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['İzin türü oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // İzin türü güncelle
  ipcMain.handle('leave-type-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await leaveTypeController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['İzin türü güncellenemedi: ' + (error as Error).message] }
    }
  })

  // İzin türü sil
  ipcMain.handle('leave-type-delete', async (_event, id: number, userId?: number) => {
    try {
      return await leaveTypeController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['İzin türü silinemedi: ' + (error as Error).message] }
    }
  })

  // Varsayılan izin türlerini seed et
  ipcMain.handle('leave-type-seed-defaults', async (_event, userId?: number) => {
    try {
      return await leaveTypeController!.seedDefaults(userId)
    } catch (error) {
      return { success: false, errors: ['Varsayılan izin türleri oluşturulamadı: ' + (error as Error).message] }
    }
  })
}
