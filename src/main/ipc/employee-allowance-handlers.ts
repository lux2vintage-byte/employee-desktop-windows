import { ipcMain } from 'electron'
import { EmployeeAllowanceController } from '../controllers/EmployeeAllowanceController'

let controller: EmployeeAllowanceController | null = null

export function initializeEmployeeAllowanceController(): void {
  if (!controller) {
    controller = new EmployeeAllowanceController()
  }
}

export function setupEmployeeAllowanceHandlers(): void {
  initializeEmployeeAllowanceController()

  // Tüm ek ödemeleri/kesintileri getir
  ipcMain.handle('employee-allowance-get-all', async (_event, options) => {
    try {
      return await controller!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Kayıtlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // ID ile kayıt getir
  ipcMain.handle('employee-allowance-get-by-id', async (_event, id: number) => {
    try {
      return await controller!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Kayıt getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personele göre kayıtları getir
  ipcMain.handle('employee-allowance-get-by-employee', async (_event, employeeId: number, activeOnly?: boolean) => {
    try {
      return await controller!.getByEmployee(employeeId, activeOnly)
    } catch (error) {
      return { success: false, errors: ['Kayıtlar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Kayıt oluştur
  ipcMain.handle('employee-allowance-create', async (_event, data, userId?: number) => {
    try {
      return await controller!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Kayıt oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Kayıt güncelle
  ipcMain.handle('employee-allowance-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await controller!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Kayıt güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Kayıt sil
  ipcMain.handle('employee-allowance-delete', async (_event, id: number, userId?: number) => {
    try {
      return await controller!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Kayıt silinemedi: ' + (error as Error).message] }
    }
  })

  // Aktif/Pasif durumu değiştir
  ipcMain.handle('employee-allowance-toggle-active', async (_event, id: number, userId?: number) => {
    try {
      return await controller!.toggleActive(id, userId)
    } catch (error) {
      return { success: false, errors: ['Durum değiştirilemedi: ' + (error as Error).message] }
    }
  })

  // Toplamları hesapla
  ipcMain.handle('employee-allowance-calculate-totals', async (_event, employeeId: number, baseSalary: number) => {
    try {
      return await controller!.calculateTotals(employeeId, baseSalary)
    } catch (error) {
      return { success: false, errors: ['Toplamlar hesaplanamadı: ' + (error as Error).message] }
    }
  })
}
