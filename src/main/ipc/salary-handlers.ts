import { ipcMain } from 'electron'
import { SalaryController } from '../controllers/SalaryController'

let salaryController: SalaryController | null = null

/**
 * Salary Controller'ı başlat
 */
export function initializeSalaryController(): void {
  if (!salaryController) {
    salaryController = new SalaryController()
  }
}

/**
 * Salary IPC Handler'ları
 * Requirements: 12.1-12.8
 */
export function setupSalaryHandlers(): void {
  initializeSalaryController()

  // Maaş kaydı oluştur
  ipcMain.handle('salary-create', async (_event, employeeId: number, data, userId?: number) => {
    try {
      return await salaryController!.create(employeeId, data, userId)
    } catch (error) {
      return { success: false, errors: ['Maaş kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Maaş kaydı getir (ID ile)
  ipcMain.handle('salary-get-by-id', async (_event, id: number) => {
    try {
      return await salaryController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Maaş kaydı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personelin güncel maaşını getir
  ipcMain.handle('salary-get-current', async (_event, employeeId: number) => {
    try {
      return await salaryController!.getCurrentSalary(employeeId)
    } catch (error) {
      return { success: false, errors: ['Güncel maaş getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personelin maaş geçmişini getir
  ipcMain.handle('salary-get-history', async (_event, employeeId: number) => {
    try {
      return await salaryController!.getHistory(employeeId)
    } catch (error) {
      return { success: false, errors: ['Maaş geçmişi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm maaş kayıtlarını getir
  ipcMain.handle('salary-get-all', async (_event, options) => {
    try {
      return await salaryController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Maaş kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Maaş güncelle
  ipcMain.handle('salary-update', async (_event, employeeId: number, newAmount: number, effectiveDate: string, userId?: number) => {
    try {
      return await salaryController!.updateSalary(employeeId, newAmount, new Date(effectiveDate), userId)
    } catch (error) {
      return { success: false, errors: ['Maaş güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Belirli bir tarihteki maaşı getir
  ipcMain.handle('salary-get-at-date', async (_event, employeeId: number, date: string) => {
    try {
      return await salaryController!.getSalaryAtDate(employeeId, new Date(date))
    } catch (error) {
      return { success: false, errors: ['Tarihe göre maaş getirilemedi: ' + (error as Error).message] }
    }
  })

  // Saatlik ücreti hesapla
  ipcMain.handle('salary-calculate-hourly-rate', async (_event, monthlySalary: number, workingDaysPerMonth?: number, hoursPerDay?: number) => {
    try {
      return await salaryController!.calculateHourlyRate(monthlySalary, workingDaysPerMonth, hoursPerDay)
    } catch (error) {
      return { success: false, errors: ['Saatlik ücret hesaplanamadı: ' + (error as Error).message] }
    }
  })

  // Günlük ücreti hesapla
  ipcMain.handle('salary-calculate-daily-rate', async (_event, monthlySalary: number, daysPerMonth?: number) => {
    try {
      return await salaryController!.calculateDailyRate(monthlySalary, daysPerMonth)
    } catch (error) {
      return { success: false, errors: ['Günlük ücret hesaplanamadı: ' + (error as Error).message] }
    }
  })
}
