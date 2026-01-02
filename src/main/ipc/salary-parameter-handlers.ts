import { ipcMain } from 'electron'
import { SalaryParameterController } from '../controllers/SalaryParameterController'

let controller: SalaryParameterController | null = null

export function initializeSalaryParameterController(): void {
  if (!controller) {
    controller = new SalaryParameterController()
  }
}

export function setupSalaryParameterHandlers(): void {
  initializeSalaryParameterController()

  // Tüm parametreleri getir
  ipcMain.handle('salary-parameter-get-all', async (_event, options) => {
    try {
      return await controller!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Parametreler getirilemedi: ' + (error as Error).message] }
    }
  })

  // ID ile parametre getir
  ipcMain.handle('salary-parameter-get-by-id', async (_event, id: number) => {
    try {
      return await controller!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Parametre getirilemedi: ' + (error as Error).message] }
    }
  })

  // Yıl ve tipe göre parametreleri getir
  ipcMain.handle('salary-parameter-get-by-year-type', async (_event, year: number, parameterType: string, month?: number) => {
    try {
      return await controller!.getByYearAndType(year, parameterType, month)
    } catch (error) {
      return { success: false, errors: ['Parametreler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Parametre oluştur
  ipcMain.handle('salary-parameter-create', async (_event, data, userId?: number) => {
    try {
      return await controller!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Parametre oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Parametre güncelle
  ipcMain.handle('salary-parameter-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await controller!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Parametre güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Parametre sil
  ipcMain.handle('salary-parameter-delete', async (_event, id: number, userId?: number) => {
    try {
      return await controller!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Parametre silinemedi: ' + (error as Error).message] }
    }
  })

  // Asgari ücret getir
  ipcMain.handle('salary-parameter-get-minimum-wage', async (_event, year: number, month?: number) => {
    try {
      return await controller!.getMinimumWage(year, month)
    } catch (error) {
      return { success: false, errors: ['Asgari ücret getirilemedi: ' + (error as Error).message] }
    }
  })

  // Vergi dilimleri getir
  ipcMain.handle('salary-parameter-get-tax-brackets', async (_event, year: number) => {
    try {
      return await controller!.getTaxBrackets(year)
    } catch (error) {
      return { success: false, errors: ['Vergi dilimleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // SGK oranları getir
  ipcMain.handle('salary-parameter-get-sgk-rates', async (_event, year: number) => {
    try {
      return await controller!.getSGKRates(year)
    } catch (error) {
      return { success: false, errors: ['SGK oranları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Varsayılan parametreleri oluştur
  ipcMain.handle('salary-parameter-seed-defaults', async (_event, year: number, userId?: number) => {
    try {
      return await controller!.seedDefaults(year, userId)
    } catch (error) {
      return { success: false, errors: ['Varsayılan parametreler oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Yıldan yıla kopyala
  ipcMain.handle('salary-parameter-copy-from-year', async (_event, sourceYear: number, targetYear: number, userId?: number) => {
    try {
      return await controller!.copyFromYear(sourceYear, targetYear, userId)
    } catch (error) {
      return { success: false, errors: ['Parametreler kopyalanamadı: ' + (error as Error).message] }
    }
  })
}
