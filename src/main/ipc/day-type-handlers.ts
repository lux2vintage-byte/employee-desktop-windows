import { ipcMain } from 'electron'
import { DayTypeController } from '../controllers/DayTypeController'

let dayTypeController: DayTypeController | null = null

/**
 * DayType Controller'ı başlat
 */
export function initializeDayTypeController(): void {
  if (!dayTypeController) {
    dayTypeController = new DayTypeController()
  }
}

/**
 * DayType IPC Handler'ları
 */
export function setupDayTypeHandlers(): void {
  initializeDayTypeController()

  // Tüm gün türlerini getir
  ipcMain.handle('day-type-get-all', async (_event, options) => {
    try {
      return await dayTypeController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Gün türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm gün türlerini sayfalama olmadan getir
  ipcMain.handle('day-type-get-all-without-pagination', async () => {
    try {
      return await dayTypeController!.getAllWithoutPagination()
    } catch (error) {
      return { success: false, errors: ['Gün türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Aktif gün türlerini getir
  ipcMain.handle('day-type-get-active', async () => {
    try {
      return await dayTypeController!.getActiveTypes()
    } catch (error) {
      return { success: false, errors: ['Aktif gün türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Gün türü getir
  ipcMain.handle('day-type-get-by-id', async (_event, id: number) => {
    try {
      return await dayTypeController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Gün türü getirilemedi: ' + (error as Error).message] }
    }
  })

  // Gün türü oluştur
  ipcMain.handle('day-type-create', async (_event, data, userId?: number) => {
    try {
      return await dayTypeController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Gün türü oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Gün türü güncelle
  ipcMain.handle('day-type-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await dayTypeController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Gün türü güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Gün türü sil
  ipcMain.handle('day-type-delete', async (_event, id: number, userId?: number) => {
    try {
      return await dayTypeController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Gün türü silinemedi: ' + (error as Error).message] }
    }
  })

  // Varsayılan gün türlerini seed et
  ipcMain.handle('day-type-seed-defaults', async (_event, userId?: number) => {
    try {
      return await dayTypeController!.seedDefaults(userId)
    } catch (error) {
      return { success: false, errors: ['Varsayılan gün türleri oluşturulamadı: ' + (error as Error).message] }
    }
  })
}
