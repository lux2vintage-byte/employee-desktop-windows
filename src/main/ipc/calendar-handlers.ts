import { ipcMain } from 'electron'
import { 
  getHolidaysForMonth, 
  getAllHolidaysForYear, 
  getHolidayTypeForDate, 
  getDayTypeMapForMonth, 
  getWorkingDaysInMonth,
  getHolidaysInRange,
  HolidayInfo 
} from '../utils/turkishHolidays'

/**
 * Takvim/Tatil IPC Handler'ları
 */
export function setupCalendarHandlers(): void {
  // Belirli bir ay için tüm tatilleri getir
  ipcMain.handle('calendar-get-holidays-for-month', async (_event, year: number, month: number) => {
    try {
      const holidays = getHolidaysForMonth(year, month)
      return { success: true, data: holidays }
    } catch (error) {
      return { success: false, errors: ['Tatil günleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Belirli bir yıl için tüm tatilleri getir
  ipcMain.handle('calendar-get-holidays-for-year', async (_event, year: number) => {
    try {
      const holidays = getAllHolidaysForYear(year)
      return { success: true, data: holidays }
    } catch (error) {
      return { success: false, errors: ['Tatil günleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Belirli bir tarih için gün türünü getir
  ipcMain.handle('calendar-get-day-type', async (_event, year: number, month: number, day: number) => {
    try {
      const holidayInfo = getHolidayTypeForDate(year, month, day)
      return { success: true, data: holidayInfo }
    } catch (error) {
      return { success: false, errors: ['Gün türü getirilemedi: ' + (error as Error).message] }
    }
  })

  // Bir ay için gün türü haritasını getir
  ipcMain.handle('calendar-get-day-type-map', async (_event, year: number, month: number) => {
    try {
      const dayTypeMap = getDayTypeMapForMonth(year, month)
      return { success: true, data: dayTypeMap }
    } catch (error) {
      return { success: false, errors: ['Gün türü haritası getirilemedi: ' + (error as Error).message] }
    }
  })

  // Bir aydaki iş günü sayısını getir
  ipcMain.handle('calendar-get-working-days', async (_event, year: number, month: number) => {
    try {
      const workingDays = getWorkingDaysInMonth(year, month)
      return { success: true, data: workingDays }
    } catch (error) {
      return { success: false, errors: ['İş günü sayısı hesaplanamadı: ' + (error as Error).message] }
    }
  })

  // Tarih aralığındaki tatilleri getir
  ipcMain.handle('calendar-get-holidays-in-range', async (_event, startDate: string, endDate: string) => {
    try {
      const holidays = getHolidaysInRange(new Date(startDate), new Date(endDate))
      return { success: true, data: holidays }
    } catch (error) {
      return { success: false, errors: ['Tatil günleri getirilemedi: ' + (error as Error).message] }
    }
  })
}
