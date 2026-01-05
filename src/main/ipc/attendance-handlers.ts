import { ipcMain } from 'electron'
import { AttendanceController } from '../controllers/AttendanceController'

let attendanceController: AttendanceController | null = null

/**
 * Attendance Controller'ı başlat
 */
export function initializeAttendanceController(): void {
  if (!attendanceController) {
    attendanceController = new AttendanceController()
  }
}

/**
 * Attendance IPC Handler'ları
 * Requirements: 7.1-7.7
 */
export function setupAttendanceHandlers(): void {
  initializeAttendanceController()

  // Tüm puantaj kayıtlarını getir
  ipcMain.handle('attendance-get-all', async (_event, options) => {
    try {
      return await attendanceController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Puantaj kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Puantaj kaydı getir
  ipcMain.handle('attendance-get-by-id', async (_event, id: number) => {
    try {
      return await attendanceController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Puantaj kaydı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı puantaj kayıtlarını getir
  ipcMain.handle('attendance-get-by-employee', async (_event, employeeId: number, startDate?: Date, endDate?: Date) => {
    try {
      return await attendanceController!.getByEmployee(employeeId, startDate, endDate)
    } catch (error) {
      return { success: false, errors: ['Personel puantaj kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tarih bazlı puantaj kayıtlarını getir
  ipcMain.handle('attendance-get-by-date', async (_event, date: Date) => {
    try {
      return await attendanceController!.getByDate(date)
    } catch (error) {
      return { success: false, errors: ['Tarih bazlı puantaj kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Puantaj kaydı oluştur
  ipcMain.handle('attendance-create', async (_event, data, userId?: number) => {
    try {
      return await attendanceController!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Puantaj kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Puantaj kaydı güncelle
  ipcMain.handle('attendance-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await attendanceController!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Puantaj kaydı güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Puantaj kaydı sil
  ipcMain.handle('attendance-delete', async (_event, id: number, userId?: number) => {
    try {
      return await attendanceController!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Puantaj kaydı silinemedi: ' + (error as Error).message] }
    }
  })

  // Check-in işlemi
  ipcMain.handle('attendance-check-in', async (_event, employeeId: number, time?: Date, userId?: number) => {
    try {
      return await attendanceController!.checkIn(employeeId, time, userId)
    } catch (error) {
      return { success: false, errors: ['Giriş kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Check-out işlemi
  ipcMain.handle('attendance-check-out', async (_event, employeeId: number, time?: Date, userId?: number) => {
    try {
      return await attendanceController!.checkOut(employeeId, time, userId)
    } catch (error) {
      return { success: false, errors: ['Çıkış kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Mola süresi ayarla
  ipcMain.handle('attendance-set-break-duration', async (_event, logId: number, minutes: number, userId?: number) => {
    try {
      return await attendanceController!.setBreakDuration(logId, minutes, userId)
    } catch (error) {
      return { success: false, errors: ['Mola süresi güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Durum ayarla
  ipcMain.handle('attendance-set-status', async (_event, logId: number, status: string, leaveTypeId?: number | null, userId?: number) => {
    try {
      return await attendanceController!.setStatus(logId, status, leaveTypeId, userId)
    } catch (error) {
      return { success: false, errors: ['Durum güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Toplu puantaj kaydı oluştur
  ipcMain.handle('attendance-bulk-create', async (_event, records, userId?: number) => {
    try {
      return await attendanceController!.bulkCreate(records, userId)
    } catch (error) {
      return { success: false, errors: ['Toplu puantaj kaydı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Aylık rapor getir
  ipcMain.handle('attendance-get-monthly-report', async (_event, employeeId: number, month: number, year: number) => {
    try {
      return await attendanceController!.getMonthlyReport(employeeId, month, year)
    } catch (error) {
      return { success: false, errors: ['Aylık rapor getirilemedi: ' + (error as Error).message] }
    }
  })

  // Çalışma saati hesapla
  ipcMain.handle('attendance-calculate-working-hours', async (_event, id: number) => {
    try {
      return await attendanceController!.calculateWorkingHours(id)
    } catch (error) {
      return { success: false, errors: ['Çalışma saati hesaplanamadı: ' + (error as Error).message] }
    }
  })
}
