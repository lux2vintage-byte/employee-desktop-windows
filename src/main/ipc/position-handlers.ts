import { ipcMain } from 'electron'
import { PositionController } from '../controllers/PositionController'

let positionController: PositionController | null = null

/**
 * Position Controller'ı başlat
 */
export function initializePositionController(): void {
  if (!positionController) {
    positionController = new PositionController()
  }
}

/**
 * Pozisyon IPC Handler'ları
 * Requirements: 3.1-3.6
 */
export function setupPositionHandlers(): void {
  initializePositionController()

  // Tüm pozisyonları getir
  ipcMain.handle('position-get-all', async (_event, options) => {
    try {
      return await positionController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Pozisyonlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Pozisyon getir
  ipcMain.handle('position-get-by-id', async (_event, id: number) => {
    try {
      return await positionController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Pozisyon getirilemedi: ' + (error as Error).message] }
    }
  })

  // Departman bazlı pozisyonları getir
  ipcMain.handle('position-get-by-department', async (_event, departmentId: number) => {
    try {
      return await positionController!.getByDepartment(departmentId)
    } catch (error) {
      return { success: false, errors: ['Pozisyonlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Pozisyon oluştur
  ipcMain.handle('position-create', async (_event, data, userId?: number) => {
    try {
      return await positionController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Pozisyon oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Pozisyon güncelle
  ipcMain.handle('position-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await positionController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Pozisyon güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Pozisyon sil
  ipcMain.handle('position-delete', async (_event, id: number, userId?: number) => {
    try {
      return await positionController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Pozisyon silinemedi: ' + (error as Error).message] }
    }
  })

  // Pozisyonu geri yükle
  ipcMain.handle('position-restore', async (_event, id: number, userId?: number) => {
    try {
      return await positionController!.restore(id, userId)
    } catch (error) {
      return { success: false, errors: ['Pozisyon geri yüklenemedi: ' + (error as Error).message] }
    }
  })

  // Unvana göre pozisyon ara
  ipcMain.handle('position-find-by-title', async (_event, title: string) => {
    try {
      return await positionController!.findByTitle(title)
    } catch (error) {
      return { success: false, errors: ['Pozisyon aranamadı: ' + (error as Error).message] }
    }
  })

  // Maaş aralığına göre pozisyonları getir
  ipcMain.handle('position-find-by-salary-range', async (_event, minSalary?: number, maxSalary?: number) => {
    try {
      return await positionController!.findBySalaryRange(minSalary, maxSalary)
    } catch (error) {
      return { success: false, errors: ['Pozisyonlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Maaşın pozisyon aralığında olup olmadığını kontrol et
  ipcMain.handle('position-validate-salary', async (_event, positionId: number, salary: number) => {
    try {
      return await positionController!.validateSalaryRange(positionId, salary)
    } catch (error) {
      return { success: false, errors: ['Maaş kontrolü yapılamadı: ' + (error as Error).message] }
    }
  })
}
