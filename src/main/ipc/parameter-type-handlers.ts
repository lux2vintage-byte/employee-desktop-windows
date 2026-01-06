import { ipcMain } from 'electron'
import { ParameterTypeController } from '../controllers/ParameterTypeController'

let parameterTypeController: ParameterTypeController | null = null

/**
 * ParameterType Controller'ı başlat
 */
export function initializeParameterTypeController(): void {
  if (!parameterTypeController) {
    parameterTypeController = new ParameterTypeController()
  }
}

/**
 * ParameterType IPC Handler'ları
 */
export function setupParameterTypeHandlers(): void {
  initializeParameterTypeController()

  // Tüm parametre türlerini getir
  ipcMain.handle('parameter-type-get-all', async (_event, options) => {
    try {
      return await parameterTypeController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Parametre türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm parametre türlerini sayfalama olmadan getir
  ipcMain.handle('parameter-type-get-all-without-pagination', async () => {
    try {
      return await parameterTypeController!.getAllWithoutPagination()
    } catch (error) {
      return { success: false, errors: ['Parametre türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Aktif parametre türlerini getir
  ipcMain.handle('parameter-type-get-active', async () => {
    try {
      return await parameterTypeController!.getActiveTypes()
    } catch (error) {
      return { success: false, errors: ['Aktif parametre türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Parametre türü getir (ID ile)
  ipcMain.handle('parameter-type-get-by-id', async (_event, id: number) => {
    try {
      return await parameterTypeController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Parametre türü getirilemedi: ' + (error as Error).message] }
    }
  })

  // Parametre türü getir (kod ile)
  ipcMain.handle('parameter-type-get-by-code', async (_event, code: string) => {
    try {
      return await parameterTypeController!.getByCode(code)
    } catch (error) {
      return { success: false, errors: ['Parametre türü getirilemedi: ' + (error as Error).message] }
    }
  })

  // Kategoriye göre parametre türlerini getir
  ipcMain.handle('parameter-type-get-by-category', async (_event, category: string) => {
    try {
      return await parameterTypeController!.getByCategory(category)
    } catch (error) {
      return { success: false, errors: ['Parametre türleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm kategorileri getir
  ipcMain.handle('parameter-type-get-categories', async () => {
    try {
      return await parameterTypeController!.getCategories()
    } catch (error) {
      return { success: false, errors: ['Kategoriler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Parametre türü oluştur
  ipcMain.handle('parameter-type-create', async (_event, data, userId?: number) => {
    try {
      return await parameterTypeController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Parametre türü oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Parametre türü güncelle
  ipcMain.handle('parameter-type-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await parameterTypeController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Parametre türü güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Parametre türü sil
  ipcMain.handle('parameter-type-delete', async (_event, id: number, userId?: number) => {
    try {
      return await parameterTypeController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Parametre türü silinemedi: ' + (error as Error).message] }
    }
  })

  // Varsayılan parametre türlerini seed et
  ipcMain.handle('parameter-type-seed-defaults', async (_event, userId?: number) => {
    try {
      return await parameterTypeController!.seedDefaults(userId)
    } catch (error) {
      return { success: false, errors: ['Varsayılan parametre türleri oluşturulamadı: ' + (error as Error).message] }
    }
  })
}
