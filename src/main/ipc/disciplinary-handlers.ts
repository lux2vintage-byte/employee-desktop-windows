import { ipcMain } from 'electron'
import { DisciplinaryController } from '../controllers/DisciplinaryController'
import { ViolationType, ActionTakenType } from '../repositories/DisciplinaryRepository'

let disciplinaryController: DisciplinaryController | null = null

/**
 * Disciplinary Controller'ı başlat
 */
export function initializeDisciplinaryController(): void {
  if (!disciplinaryController) {
    disciplinaryController = new DisciplinaryController()
  }
}

/**
 * Disciplinary IPC Handler'ları
 * Requirements: 18.1-18.6
 */
export function setupDisciplinaryHandlers(): void {
  initializeDisciplinaryController()

  // Disiplin kaydı oluştur
  ipcMain.handle('disciplinary-create', async (_event, data, userId?: number) => {
    try {
      return await disciplinaryController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Disiplin kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Disiplin kaydı güncelle
  ipcMain.handle('disciplinary-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await disciplinaryController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Disiplin kaydı güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Disiplin kaydı sil
  ipcMain.handle('disciplinary-delete', async (_event, id: number, userId?: number) => {
    try {
      return await disciplinaryController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Disiplin kaydı silinemedi: ' + (error as Error).message] }
    }
  })

  // Disiplin kaydı getir (ID ile)
  ipcMain.handle('disciplinary-get-by-id', async (_event, id: number) => {
    try {
      return await disciplinaryController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Disiplin kaydı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm disiplin kayıtlarını getir
  ipcMain.handle('disciplinary-get-all', async (_event, options) => {
    try {
      return await disciplinaryController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Disiplin kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı disiplin kayıtlarını getir
  ipcMain.handle('disciplinary-get-by-employee', async (_event, employeeId: number) => {
    try {
      return await disciplinaryController!.getByEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel disiplin kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // İhlal tipi bazlı disiplin kayıtlarını getir
  ipcMain.handle('disciplinary-get-by-violation-type', async (_event, violationType: ViolationType) => {
    try {
      return await disciplinaryController!.getByViolationType(violationType)
    } catch (error) {
      return { success: false, errors: ['İhlal tipi disiplin kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Alınan aksiyon bazlı disiplin kayıtlarını getir
  ipcMain.handle('disciplinary-get-by-action-taken', async (_event, actionTaken: ActionTakenType) => {
    try {
      return await disciplinaryController!.getByActionTaken(actionTaken)
    } catch (error) {
      return { success: false, errors: ['Aksiyon tipi disiplin kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tarih aralığında disiplin kayıtlarını getir
  ipcMain.handle('disciplinary-get-by-date-range', async (_event, startDate: string, endDate: string) => {
    try {
      return await disciplinaryController!.getByDateRange(startDate, endDate)
    } catch (error) {
      return { success: false, errors: ['Tarih aralığı disiplin kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Maaş kesintisi olan disiplin kayıtlarını getir
  ipcMain.handle('disciplinary-get-salary-deductions', async (_event) => {
    try {
      return await disciplinaryController!.getSalaryDeductions()
    } catch (error) {
      return { success: false, errors: ['Maaş kesintisi disiplin kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personelin disiplin kaydı sayısını getir
  ipcMain.handle('disciplinary-get-count-by-employee', async (_event, employeeId: number) => {
    try {
      return await disciplinaryController!.getCountByEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel disiplin kaydı sayısı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personelin belirli ihlal tipindeki kayıt sayısını getir
  ipcMain.handle('disciplinary-get-count-by-employee-violation', async (_event, employeeId: number, violationType: ViolationType) => {
    try {
      return await disciplinaryController!.getCountByEmployeeAndViolationType(employeeId, violationType)
    } catch (error) {
      return { success: false, errors: ['Personel ihlal tipi kayıt sayısı getirilemedi: ' + (error as Error).message] }
    }
  })
}
