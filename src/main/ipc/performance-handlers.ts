import { ipcMain } from 'electron'
import { PerformanceController } from '../controllers/PerformanceController'

let performanceController: PerformanceController | null = null

/**
 * Performance Controller'ı başlat
 */
export function initializePerformanceController(): void {
  if (!performanceController) {
    performanceController = new PerformanceController()
  }
}

/**
 * Performance IPC Handler'ları
 * Requirements: 16.1-16.7
 */
export function setupPerformanceHandlers(): void {
  initializePerformanceController()

  // Performans değerlendirmesi oluştur
  ipcMain.handle('performance-create', async (_event, data, userId?: number) => {
    try {
      return await performanceController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Performans değerlendirmesi oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Performans değerlendirmesi güncelle
  ipcMain.handle('performance-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await performanceController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Performans değerlendirmesi güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Performans değerlendirmesi getir (ID ile)
  ipcMain.handle('performance-get-by-id', async (_event, id: number) => {
    try {
      return await performanceController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Performans değerlendirmesi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm performans değerlendirmelerini getir
  ipcMain.handle('performance-get-all', async (_event, options) => {
    try {
      return await performanceController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Performans değerlendirmeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı performans değerlendirmelerini getir
  ipcMain.handle('performance-get-by-employee', async (_event, employeeId: number) => {
    try {
      return await performanceController!.getByEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel performans değerlendirmeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Değerlendirici bazlı performans değerlendirmelerini getir
  ipcMain.handle('performance-get-by-reviewer', async (_event, reviewerId: number) => {
    try {
      return await performanceController!.getByReviewer(reviewerId)
    } catch (error) {
      return { success: false, errors: ['Değerlendirici performans değerlendirmeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Dönem bazlı performans değerlendirmelerini getir
  ipcMain.handle('performance-get-by-period', async (_event, reviewPeriod: string) => {
    try {
      return await performanceController!.getByPeriod(reviewPeriod)
    } catch (error) {
      return { success: false, errors: ['Dönem performans değerlendirmeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Performans değerlendirmesini gönder
  ipcMain.handle('performance-submit', async (_event, id: number, userId?: number) => {
    try {
      return await performanceController!.submit(id, userId)
    } catch (error) {
      return { success: false, errors: ['Performans değerlendirmesi gönderilemedi: ' + (error as Error).message] }
    }
  })

  // Performans değerlendirmesini onayla
  ipcMain.handle('performance-acknowledge', async (_event, id: number, userId?: number) => {
    try {
      return await performanceController!.acknowledge(id, userId)
    } catch (error) {
      return { success: false, errors: ['Performans değerlendirmesi onaylanamadı: ' + (error as Error).message] }
    }
  })

  // Performans değerlendirmesini sil
  ipcMain.handle('performance-delete', async (_event, id: number, userId?: number) => {
    try {
      return await performanceController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Performans değerlendirmesi silinemedi: ' + (error as Error).message] }
    }
  })
}
