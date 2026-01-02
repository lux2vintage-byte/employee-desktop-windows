import { ipcMain } from 'electron'
import { PayrollController } from '../controllers/PayrollController'

let payrollController: PayrollController | null = null

/**
 * Payroll Controller'ı başlat
 */
export function initializePayrollController(): void {
  if (!payrollController) {
    payrollController = new PayrollController()
  }
}

/**
 * Payroll IPC Handler'ları
 * Requirements: 13.1-13.8, 14.1-14.7
 */
export function setupPayrollHandlers(): void {
  initializePayrollController()

  // Bordro oluştur
  ipcMain.handle('payroll-generate', async (_event, employeeId: number, periodMonth: number, periodYear: number, userId?: number) => {
    try {
      return await payrollController!.generate(employeeId, periodMonth, periodYear, userId)
    } catch (error) {
      return { success: false, errors: ['Bordro oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Toplu bordro oluştur
  ipcMain.handle('payroll-generate-bulk', async (_event, periodMonth: number, periodYear: number, userId?: number) => {
    try {
      return await payrollController!.generateBulk(periodMonth, periodYear, userId)
    } catch (error) {
      return { success: false, errors: ['Toplu bordro oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Bordro getir (ID ile)
  ipcMain.handle('payroll-get-by-id', async (_event, id: number) => {
    try {
      return await payrollController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Bordro getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ve dönem ile bordro getir
  ipcMain.handle('payroll-get-by-employee-period', async (_event, employeeId: number, periodMonth: number, periodYear: number) => {
    try {
      return await payrollController!.getByEmployeeAndPeriod(employeeId, periodMonth, periodYear)
    } catch (error) {
      return { success: false, errors: ['Bordro getirilemedi: ' + (error as Error).message] }
    }
  })


  // Tüm bordroları getir
  ipcMain.handle('payroll-get-all', async (_event, options) => {
    try {
      return await payrollController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Bordro listesi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı bordroları getir
  ipcMain.handle('payroll-get-by-employee', async (_event, employeeId: number, year?: number) => {
    try {
      return await payrollController!.getByEmployee(employeeId, year)
    } catch (error) {
      return { success: false, errors: ['Personel bordroları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Dönem bazlı bordroları getir
  ipcMain.handle('payroll-get-by-period', async (_event, periodMonth: number, periodYear: number) => {
    try {
      return await payrollController!.getByPeriod(periodMonth, periodYear)
    } catch (error) {
      return { success: false, errors: ['Dönem bordroları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Bordroyu kesinleştir
  ipcMain.handle('payroll-finalize', async (_event, payrollId: number, userId?: number) => {
    try {
      return await payrollController!.finalize(payrollId, userId)
    } catch (error) {
      return { success: false, errors: ['Bordro kesinleştirilemedi: ' + (error as Error).message] }
    }
  })

  // Bordro kalemi ekle
  ipcMain.handle('payroll-add-item', async (_event, payrollId: number, item, userId?: number) => {
    try {
      return await payrollController!.addItem(payrollId, item, userId)
    } catch (error) {
      return { success: false, errors: ['Bordro kalemi eklenemedi: ' + (error as Error).message] }
    }
  })

  // Bordro kalemini sil
  ipcMain.handle('payroll-remove-item', async (_event, itemId: number, userId?: number) => {
    try {
      return await payrollController!.removeItem(itemId, userId)
    } catch (error) {
      return { success: false, errors: ['Bordro kalemi silinemedi: ' + (error as Error).message] }
    }
  })

  // Bordro kalemlerini getir
  ipcMain.handle('payroll-get-items', async (_event, payrollId: number) => {
    try {
      return await payrollController!.getItems(payrollId)
    } catch (error) {
      return { success: false, errors: ['Bordro kalemleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Dönem istatistiklerini getir
  ipcMain.handle('payroll-get-period-statistics', async (_event, periodMonth: number, periodYear: number) => {
    try {
      return await payrollController!.getPeriodStatistics(periodMonth, periodYear)
    } catch (error) {
      return { success: false, errors: ['Dönem istatistikleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Net maaş hesapla
  ipcMain.handle('payroll-calculate-net-salary', async (_event, baseSalary: number, totalAdditions: number, totalDeductions: number) => {
    try {
      return await payrollController!.calculateNetSalary(baseSalary, totalAdditions, totalDeductions)
    } catch (error) {
      return { success: false, errors: ['Net maaş hesaplanamadı: ' + (error as Error).message] }
    }
  })
}
