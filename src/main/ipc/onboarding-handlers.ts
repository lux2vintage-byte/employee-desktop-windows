import { ipcMain } from 'electron'
import { OnboardingController } from '../controllers/OnboardingController'

let controller: OnboardingController | null = null

export function initializeOnboardingController(): void {
  if (!controller) controller = new OnboardingController()
}

export function setupOnboardingHandlers(): void {
  initializeOnboardingController()

  ipcMain.handle('onboarding-get-all', async (_event, options) => {
    try { return await controller!.getAll(options) }
    catch (error) { return { success: false, errors: ['Oryantasyon kayıtları getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-get-by-id', async (_event, id: number) => {
    try { return await controller!.getById(id) }
    catch (error) { return { success: false, errors: ['Oryantasyon kaydı getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-get-by-employee', async (_event, employeeId: number) => {
    try { return await controller!.getByEmployee(employeeId) }
    catch (error) { return { success: false, errors: ['Oryantasyon kaydı getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-get-by-status', async (_event, status: string) => {
    try { return await controller!.getByStatus(status) }
    catch (error) { return { success: false, errors: ['Oryantasyon kayıtları getirilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-create', async (_event, data, userId?: number) => {
    try { return await controller!.create(data, userId) }
    catch (error) { return { success: false, errors: ['Oryantasyon kaydı oluşturulamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-create-with-tasks', async (_event, data, userId?: number) => {
    try { return await controller!.createWithDefaultTasks(data, userId) }
    catch (error) { return { success: false, errors: ['Oryantasyon kaydı oluşturulamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-update', async (_event, id: number, data, userId?: number) => {
    try { return await controller!.update(id, data, userId) }
    catch (error) { return { success: false, errors: ['Oryantasyon kaydı güncellenemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-start', async (_event, id: number, userId?: number) => {
    try { return await controller!.start(id, userId) }
    catch (error) { return { success: false, errors: ['Oryantasyon başlatılamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-complete', async (_event, id: number, userId?: number) => {
    try { return await controller!.complete(id, userId) }
    catch (error) { return { success: false, errors: ['Oryantasyon tamamlanamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-cancel', async (_event, id: number, userId?: number) => {
    try { return await controller!.cancel(id, userId) }
    catch (error) { return { success: false, errors: ['Oryantasyon iptal edilemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-delete', async (_event, id: number, userId?: number) => {
    try { return await controller!.delete(id, userId) }
    catch (error) { return { success: false, errors: ['Oryantasyon kaydı silinemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-add-task', async (_event, onboardingId: number, data) => {
    try { return await controller!.addTask(onboardingId, data) }
    catch (error) { return { success: false, errors: ['Görev eklenemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-update-task', async (_event, taskId: number, data) => {
    try { return await controller!.updateTask(taskId, data) }
    catch (error) { return { success: false, errors: ['Görev güncellenemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-complete-task', async (_event, taskId: number) => {
    try { return await controller!.completeTask(taskId) }
    catch (error) { return { success: false, errors: ['Görev tamamlanamadı: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-delete-task', async (_event, taskId: number) => {
    try { return await controller!.deleteTask(taskId) }
    catch (error) { return { success: false, errors: ['Görev silinemedi: ' + (error as Error).message] } }
  })

  ipcMain.handle('onboarding-get-stats', async () => {
    try { return await controller!.getStats() }
    catch (error) { return { success: false, errors: ['İstatistikler getirilemedi: ' + (error as Error).message] } }
  })
}
