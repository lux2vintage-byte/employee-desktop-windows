import { ipcMain } from 'electron'
import { PaymentHistoryController } from '../controllers/PaymentHistoryController'

let controller: PaymentHistoryController | null = null

export function initializePaymentHistoryController(): void {
  if (!controller) {
    controller = new PaymentHistoryController()
  }
}

export function setupPaymentHistoryHandlers(): void {
  initializePaymentHistoryController()

  // Tüm ödeme geçmişini getir
  ipcMain.handle('payment-history-get-all', async (_event, options) => {
    try {
      return await controller!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Ödeme geçmişi getirilemedi: ' + (error as Error).message] }
    }
  })

  // ID ile ödeme kaydı getir
  ipcMain.handle('payment-history-get-by-id', async (_event, id: number) => {
    try {
      return await controller!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Ödeme kaydı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personele göre ödeme geçmişi getir
  ipcMain.handle('payment-history-get-by-employee', async (_event, employeeId: number, year?: number) => {
    try {
      return await controller!.getByEmployee(employeeId, year)
    } catch (error) {
      return { success: false, errors: ['Ödeme geçmişi getirilemedi: ' + (error as Error).message] }
    }
  })

  // Ödeme kaydı oluştur
  ipcMain.handle('payment-history-create', async (_event, data, userId?: number) => {
    try {
      return await controller!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Ödeme kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Ödeme kaydı güncelle
  ipcMain.handle('payment-history-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await controller!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Ödeme kaydı güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Ödeme kaydı sil
  ipcMain.handle('payment-history-delete', async (_event, id: number, userId?: number) => {
    try {
      return await controller!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Ödeme kaydı silinemedi: ' + (error as Error).message] }
    }
  })

  // Ödeme iptal et
  ipcMain.handle('payment-history-cancel', async (_event, id: number, userId?: number) => {
    try {
      return await controller!.cancel(id, userId)
    } catch (error) {
      return { success: false, errors: ['Ödeme iptal edilemedi: ' + (error as Error).message] }
    }
  })

  // İstatistikleri getir
  ipcMain.handle('payment-history-get-statistics', async (_event, startDate?: string, endDate?: string) => {
    try {
      return await controller!.getStatistics(startDate, endDate)
    } catch (error) {
      return { success: false, errors: ['İstatistikler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ödeme özeti getir
  ipcMain.handle('payment-history-get-employee-summary', async (_event, employeeId: number, year: number) => {
    try {
      return await controller!.getEmployeePaymentSummary(employeeId, year)
    } catch (error) {
      return { success: false, errors: ['Ödeme özeti getirilemedi: ' + (error as Error).message] }
    }
  })

  // Maaş ödemesi kaydet
  ipcMain.handle('payment-history-record-salary', async (_event, employeeId: number, payrollId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number) => {
    try {
      return await controller!.recordSalaryPayment(employeeId, payrollId, amount, paymentMethod, bankDetails, userId)
    } catch (error) {
      return { success: false, errors: ['Maaş ödemesi kaydedilemedi: ' + (error as Error).message] }
    }
  })

  // Avans ödemesi kaydet
  ipcMain.handle('payment-history-record-advance', async (_event, employeeId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number) => {
    try {
      return await controller!.recordAdvancePayment(employeeId, amount, paymentMethod, bankDetails, userId)
    } catch (error) {
      return { success: false, errors: ['Avans ödemesi kaydedilemedi: ' + (error as Error).message] }
    }
  })
}
