import { ipcMain } from 'electron'
import { OffboardingController } from '../controllers/OffboardingController'

let offboardingController: OffboardingController | null = null

/**
 * Offboarding Controller'ı başlat
 */
export function initializeOffboardingController(): void {
  if (!offboardingController) {
    offboardingController = new OffboardingController()
  }
}

/**
 * Offboarding IPC Handler'ları
 * Resignation ve ExitInterview kanalları
 * Requirements: 19.1-19.7
 */
export function setupOffboardingHandlers(): void {
  initializeOffboardingController()

  // ==================== RESIGNATION HANDLERS ====================

  // Ayrılma talebi oluştur
  ipcMain.handle('resignation-create', async (_event, data, userId?: number) => {
    try {
      return await offboardingController!.createResignation(data, userId)
    } catch (error) {
      return { success: false, errors: ['Ayrılma talebi oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Ayrılma talebi güncelle
  ipcMain.handle('resignation-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await offboardingController!.updateResignation(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Ayrılma talebi güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Ayrılma talebi getir (ID ile)
  ipcMain.handle('resignation-get-by-id', async (_event, id: number) => {
    try {
      return await offboardingController!.getResignationById(id)
    } catch (error) {
      return { success: false, errors: ['Ayrılma talebi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm ayrılma taleplerini getir
  ipcMain.handle('resignation-get-all', async (_event, options) => {
    try {
      return await offboardingController!.getAllResignations(options)
    } catch (error) {
      return { success: false, errors: ['Ayrılma talepleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı ayrılma talebini getir
  ipcMain.handle('resignation-get-by-employee', async (_event, employeeId: number) => {
    try {
      return await offboardingController!.getResignationByEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel ayrılma talebi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Bekleyen ayrılma taleplerini getir
  ipcMain.handle('resignation-get-pending', async (_event) => {
    try {
      return await offboardingController!.getPendingResignations()
    } catch (error) {
      return { success: false, errors: ['Bekleyen ayrılma talepleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Onaylanmış ayrılma taleplerini getir
  ipcMain.handle('resignation-get-approved', async (_event) => {
    try {
      return await offboardingController!.getApprovedResignations()
    } catch (error) {
      return { success: false, errors: ['Onaylanmış ayrılma talepleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Ayrılma talebini onayla
  ipcMain.handle('resignation-approve', async (_event, id: number, lastWorkingDay?: Date, userId?: number) => {
    try {
      return await offboardingController!.approveResignation(id, lastWorkingDay, userId)
    } catch (error) {
      return { success: false, errors: ['Ayrılma talebi onaylanamadı: ' + (error as Error).message] }
    }
  })

  // Ayrılma talebini tamamla
  ipcMain.handle('resignation-complete', async (_event, id: number, userId?: number) => {
    try {
      return await offboardingController!.completeResignation(id, userId)
    } catch (error) {
      return { success: false, errors: ['Ayrılma talebi tamamlanamadı: ' + (error as Error).message] }
    }
  })

  // Ayrılma talebini sil
  ipcMain.handle('resignation-delete', async (_event, id: number, userId?: number) => {
    try {
      return await offboardingController!.deleteResignation(id, userId)
    } catch (error) {
      return { success: false, errors: ['Ayrılma talebi silinemedi: ' + (error as Error).message] }
    }
  })

  // ==================== EXIT INTERVIEW HANDLERS ====================

  // Çıkış mülakatı oluştur
  ipcMain.handle('exit-interview-create', async (_event, resignationId: number, data, userId?: number) => {
    try {
      return await offboardingController!.createExitInterview(resignationId, data, userId)
    } catch (error) {
      return { success: false, errors: ['Çıkış mülakatı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Çıkış mülakatı güncelle
  ipcMain.handle('exit-interview-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await offboardingController!.updateExitInterview(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Çıkış mülakatı güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Çıkış mülakatı getir (ID ile)
  ipcMain.handle('exit-interview-get-by-id', async (_event, id: number) => {
    try {
      return await offboardingController!.getExitInterviewById(id)
    } catch (error) {
      return { success: false, errors: ['Çıkış mülakatı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm çıkış mülakatlarını getir
  ipcMain.handle('exit-interview-get-all', async (_event) => {
    try {
      return await offboardingController!.getAllExitInterviews()
    } catch (error) {
      return { success: false, errors: ['Çıkış mülakatları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Resignation ID ile çıkış mülakatını getir
  ipcMain.handle('exit-interview-get-by-resignation', async (_event, resignationId: number) => {
    try {
      return await offboardingController!.getExitInterviewByResignation(resignationId)
    } catch (error) {
      return { success: false, errors: ['Çıkış mülakatı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Çıkış mülakatını sil
  ipcMain.handle('exit-interview-delete', async (_event, id: number, userId?: number) => {
    try {
      return await offboardingController!.deleteExitInterview(id, userId)
    } catch (error) {
      return { success: false, errors: ['Çıkış mülakatı silinemedi: ' + (error as Error).message] }
    }
  })

  // ==================== SETTLEMENT HANDLERS ====================

  // Final settlement hesapla
  ipcMain.handle('resignation-calculate-settlement', async (_event, resignationId: number) => {
    try {
      return await offboardingController!.calculateFinalSettlement(resignationId)
    } catch (error) {
      return { success: false, errors: ['Final settlement hesaplanamadı: ' + (error as Error).message] }
    }
  })
}
