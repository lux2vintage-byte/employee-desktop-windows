import { ipcMain } from 'electron'
import { PayrollColumnMappingController } from '../controllers/PayrollColumnMappingController'
import { PayrollColumnMappingService } from '../services/PayrollColumnMappingService'
import { PayrollColumnMappingRepository } from '../repositories/PayrollColumnMappingRepository'
import { getPrismaClient } from '../database/prisma-manager'

let controller: PayrollColumnMappingController | null = null

export function initializePayrollColumnMappingController(): void {
  if (!controller) {
    const prisma = getPrismaClient()
    const repository = new PayrollColumnMappingRepository(prisma)
    const service = new PayrollColumnMappingService(repository)
    controller = new PayrollColumnMappingController(service)
  }
}

export function setupPayrollColumnMappingHandlers(): void {
  initializePayrollColumnMappingController()

  // Tüm eşleştirmeleri getir
  ipcMain.handle('payroll-column-mapping-get-all', async (_event, options) => {
    try {
      return await controller!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Eşleştirmeler getirilemedi: ' + (error as Error).message] }
    }
  })

  // ID ile eşleştirme getir
  ipcMain.handle('payroll-column-mapping-get-by-id', async (_event, id: number) => {
    try {
      return await controller!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Eşleştirme getirilemedi: ' + (error as Error).message] }
    }
  })

  // Sütun kodu ile eşleştirme getir
  ipcMain.handle('payroll-column-mapping-get-by-code', async (_event, columnCode: string) => {
    try {
      return await controller!.getByColumnCode(columnCode)
    } catch (error) {
      return { success: false, errors: ['Eşleştirme getirilemedi: ' + (error as Error).message] }
    }
  })

  // Aktif eşleştirmeleri getir
  ipcMain.handle('payroll-column-mapping-get-active', async () => {
    try {
      return await controller!.getActive()
    } catch (error) {
      return { success: false, errors: ['Aktif eşleştirmeler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tipe göre eşleştirmeleri getir
  ipcMain.handle('payroll-column-mapping-get-by-type', async (_event, columnType: 'income' | 'deduction' | 'info') => {
    try {
      return await controller!.getByType(columnType)
    } catch (error) {
      return { success: false, errors: ['Eşleştirmeler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Eşleştirme oluştur
  ipcMain.handle('payroll-column-mapping-create', async (_event, data, userId?: number) => {
    try {
      return await controller!.create(data, userId)
    } catch (error) {
      return { success: false, errors: ['Eşleştirme oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Eşleştirme güncelle
  ipcMain.handle('payroll-column-mapping-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await controller!.update(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Eşleştirme güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Eşleştirme sil
  ipcMain.handle('payroll-column-mapping-delete', async (_event, id: number, userId?: number) => {
    try {
      return await controller!.delete(id, userId)
    } catch (error) {
      return { success: false, errors: ['Eşleştirme silinemedi: ' + (error as Error).message] }
    }
  })

  // Varsayılan eşleştirmeleri oluştur
  ipcMain.handle('payroll-column-mapping-seed-defaults', async (_event, userId?: number) => {
    try {
      return await controller!.seedDefaults(userId)
    } catch (error) {
      return { success: false, errors: ['Varsayılan eşleştirmeler oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Formül doğrula
  ipcMain.handle('payroll-column-mapping-validate-formula', async (_event, formula: string) => {
    try {
      return await controller!.validateFormula(formula)
    } catch (error) {
      return { success: false, errors: ['Formül doğrulanamadı: ' + (error as Error).message] }
    }
  })
}

export function getPayrollColumnMappingController(): PayrollColumnMappingController | null {
  return controller
}
