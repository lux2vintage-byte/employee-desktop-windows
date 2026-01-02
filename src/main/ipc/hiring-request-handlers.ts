import { ipcMain } from 'electron'
import { HiringRequestController } from '../controllers/HiringRequestController'

let controller: HiringRequestController | null = null

export function initializeHiringRequestController(): void {
  if (!controller) controller = new HiringRequestController()
}

export function setupHiringRequestHandlers(): void {
  initializeHiringRequestController()

  ipcMain.handle('hiring-request-get-all', async (_event, options) => {
    try { return await controller!.getAll(options) }
    catch (error) { return { success: false, errors: ['İşe alım talepleri getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-get-by-id', async (_event, id: number) => {
    try { return await controller!.getById(id) }
    catch (error) { return { success: false, errors: ['İşe alım talebi getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-get-by-status', async (_event, status: string) => {
    try { return await controller!.getByStatus(status) }
    catch (error) { return { success: false, errors: ['İşe alım talepleri getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-get-by-department', async (_event, departmentId: number) => {
    try { return await controller!.getByDepartment(departmentId) }
    catch (error) { return { success: false, errors: ['İşe alım talepleri getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-create', async (_event, data, userId?: number) => {
    try { return await controller!.create(data, userId) }
    catch (error) { return { success: false, errors: ['İşe alım talebi oluşturulamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-update', async (_event, id: number, data, userId?: number) => {
    try { return await controller!.update(id, data, userId) }
    catch (error) { return { success: false, errors: ['İşe alım talebi güncellenemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-approve', async (_event, id: number, approverId: number, userId?: number) => {
    try { return await controller!.approve(id, approverId, userId) }
    catch (error) { return { success: false, errors: ['İşe alım talebi onaylanamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-reject', async (_event, id: number, approverId: number, userId?: number) => {
    try { return await controller!.reject(id, approverId, userId) }
    catch (error) { return { success: false, errors: ['İşe alım talebi reddedilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-start', async (_event, id: number, userId?: number) => {
    try { return await controller!.startProcess(id, userId) }
    catch (error) { return { success: false, errors: ['İşe alım süreci başlatılamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-complete', async (_event, id: number, userId?: number) => {
    try { return await controller!.complete(id, userId) }
    catch (error) { return { success: false, errors: ['İşe alım talebi tamamlanamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-cancel', async (_event, id: number, userId?: number) => {
    try { return await controller!.cancel(id, userId) }
    catch (error) { return { success: false, errors: ['İşe alım talebi iptal edilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-delete', async (_event, id: number, userId?: number) => {
    try { return await controller!.delete(id, userId) }
    catch (error) { return { success: false, errors: ['İşe alım talebi silinemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('hiring-request-get-stats', async () => {
    try { return await controller!.getStats() }
    catch (error) { return { success: false, errors: ['İstatistikler getirilemedi: ' + (error as Error).message] } }
  })
}
