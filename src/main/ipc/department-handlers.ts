import { ipcMain } from 'electron'
import { DepartmentController } from '../controllers/DepartmentController'

let departmentController: DepartmentController | null = null

/**
 * Department Controller'ı başlat
 */
export function initializeDepartmentController(): void {
  if (!departmentController) {
    departmentController = new DepartmentController()
  }
}

/**
 * Departman IPC Handler'ları
 * Requirements: 2.1-2.7
 */
export function setupDepartmentHandlers(): void {
  initializeDepartmentController()

  // Tüm departmanları getir
  ipcMain.handle('department-get-all', async (_event, options) => {
    try {
      return await departmentController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Departmanlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Departman getir
  ipcMain.handle('department-get-by-id', async (_event, id: number) => {
    try {
      return await departmentController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Departman getirilemedi: ' + (error as Error).message] }
    }
  })

  // Departman oluştur
  ipcMain.handle('department-create', async (_event, data, userId?: number) => {
    try {
      return await departmentController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Departman oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Departman güncelle
  ipcMain.handle('department-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await departmentController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Departman güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Departman sil
  ipcMain.handle('department-delete', async (_event, id: number, userId?: number) => {
    try {
      return await departmentController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Departman silinemedi: ' + (error as Error).message] }
    }
  })

  // Departmanı geri yükle
  ipcMain.handle('department-restore', async (_event, id: number, userId?: number) => {
    try {
      return await departmentController!.restore(id, userId)
    } catch (error) {
      return { success: false, errors: ['Departman geri yüklenemedi: ' + (error as Error).message] }
    }
  })

  // Departman hiyerarşisini getir
  ipcMain.handle('department-get-hierarchy', async () => {
    try {
      return await departmentController!.getHierarchy()
    } catch (error) {
      return { success: false, errors: ['Departman hiyerarşisi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Alt departmanları getir
  ipcMain.handle('department-get-children', async (_event, parentId: number) => {
    try {
      return await departmentController!.getChildren(parentId)
    } catch (error) {
      return { success: false, errors: ['Alt departmanlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Kök departmanları getir
  ipcMain.handle('department-get-roots', async () => {
    try {
      return await departmentController!.getRootDepartments()
    } catch (error) {
      return { success: false, errors: ['Kök departmanlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Yönetici ata
  ipcMain.handle('department-assign-manager', async (_event, departmentId: number, managerId: number | null, userId?: number) => {
    try {
      return await departmentController!.assignManager(departmentId, managerId, userId)
    } catch (error) {
      return { success: false, errors: ['Yönetici atanamadı: ' + (error as Error).message] }
    }
  })

  // İsme göre departman ara
  ipcMain.handle('department-find-by-name', async (_event, name: string) => {
    try {
      return await departmentController!.findByName(name)
    } catch (error) {
      return { success: false, errors: ['Departman aranamadı: ' + (error as Error).message] }
    }
  })

  // Cost center code ile departman bul
  ipcMain.handle('department-find-by-cost-center', async (_event, costCenterCode: string) => {
    try {
      return await departmentController!.findByCostCenterCode(costCenterCode)
    } catch (error) {
      return { success: false, errors: ['Departman bulunamadı: ' + (error as Error).message] }
    }
  })
}
