import { ipcMain } from 'electron'
import { TrainingController } from '../controllers/TrainingController'

let trainingController: TrainingController | null = null

/**
 * Training Controller'ı başlat
 */
export function initializeTrainingController(): void {
  if (!trainingController) {
    trainingController = new TrainingController()
  }
}

/**
 * Training IPC Handler'ları
 * Requirements: 17.1-17.7
 */
export function setupTrainingHandlers(): void {
  initializeTrainingController()

  // ==================== TRAINING CATALOG ====================

  // Eğitim oluştur
  ipcMain.handle('training-create', async (_event, data, userId?: number) => {
    try {
      return await trainingController!.createTraining(data, userId)
    } catch (error) {
      return { success: false, errors: ['Eğitim oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Eğitim güncelle
  ipcMain.handle('training-update', async (_event, id: number, data, userId?: number) => {
    try {
      return await trainingController!.updateTraining(id, data, userId)
    } catch (error) {
      return { success: false, errors: ['Eğitim güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Eğitim sil
  ipcMain.handle('training-delete', async (_event, id: number, userId?: number) => {
    try {
      return await trainingController!.deleteTraining(id, userId)
    } catch (error) {
      return { success: false, errors: ['Eğitim silinemedi: ' + (error as Error).message] }
    }
  })

  // Eğitim getir (ID ile)
  ipcMain.handle('training-get-by-id', async (_event, id: number) => {
    try {
      return await trainingController!.getTrainingById(id)
    } catch (error) {
      return { success: false, errors: ['Eğitim getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm eğitimleri getir
  ipcMain.handle('training-get-all', async (_event, options) => {
    try {
      return await trainingController!.getAllTrainings(options)
    } catch (error) {
      return { success: false, errors: ['Eğitimler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Kategori bazlı eğitimleri getir
  ipcMain.handle('training-get-by-category', async (_event, category: string) => {
    try {
      return await trainingController!.getTrainingsByCategory(category)
    } catch (error) {
      return { success: false, errors: ['Kategori eğitimleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Sağlayıcı bazlı eğitimleri getir
  ipcMain.handle('training-get-by-provider', async (_event, provider: string) => {
    try {
      return await trainingController!.getTrainingsByProvider(provider)
    } catch (error) {
      return { success: false, errors: ['Sağlayıcı eğitimleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm kategorileri getir
  ipcMain.handle('training-get-categories', async (_event) => {
    try {
      return await trainingController!.getAllCategories()
    } catch (error) {
      return { success: false, errors: ['Kategoriler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm sağlayıcıları getir
  ipcMain.handle('training-get-providers', async (_event) => {
    try {
      return await trainingController!.getAllProviders()
    } catch (error) {
      return { success: false, errors: ['Sağlayıcılar getirilemedi: ' + (error as Error).message] }
    }
  })

  // ==================== EMPLOYEE TRAINING ====================

  // Personeli eğitime ata
  ipcMain.handle('employee-training-assign', async (_event, trainingId: number, employeeId: number, userId?: number) => {
    try {
      return await trainingController!.assignEmployee(trainingId, employeeId, userId)
    } catch (error) {
      return { success: false, errors: ['Personel eğitime atanamadı: ' + (error as Error).message] }
    }
  })

  // Eğitimi tamamla
  ipcMain.handle('employee-training-complete', async (_event, employeeTrainingId: number, certificateUrl?: string, userId?: number) => {
    try {
      return await trainingController!.completeTraining(employeeTrainingId, certificateUrl, userId)
    } catch (error) {
      return { success: false, errors: ['Eğitim tamamlanamadı: ' + (error as Error).message] }
    }
  })

  // Eğitimi başarısız olarak işaretle
  ipcMain.handle('employee-training-fail', async (_event, employeeTrainingId: number, userId?: number) => {
    try {
      return await trainingController!.failTraining(employeeTrainingId, userId)
    } catch (error) {
      return { success: false, errors: ['Eğitim başarısız işaretlenemedi: ' + (error as Error).message] }
    }
  })

  // Personeli eğitimden çıkar
  ipcMain.handle('employee-training-remove', async (_event, employeeTrainingId: number, userId?: number) => {
    try {
      return await trainingController!.removeEmployeeFromTraining(employeeTrainingId, userId)
    } catch (error) {
      return { success: false, errors: ['Personel eğitimden çıkarılamadı: ' + (error as Error).message] }
    }
  })

  // Personel eğitim kaydı getir (ID ile)
  ipcMain.handle('employee-training-get-by-id', async (_event, id: number) => {
    try {
      return await trainingController!.getEmployeeTrainingById(id)
    } catch (error) {
      return { success: false, errors: ['Personel eğitim kaydı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm personel eğitim kayıtlarını getir
  ipcMain.handle('employee-training-get-all', async (_event, options) => {
    try {
      return await trainingController!.getAllEmployeeTrainings(options)
    } catch (error) {
      return { success: false, errors: ['Personel eğitim kayıtları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel bazlı eğitim kayıtlarını getir
  ipcMain.handle('employee-training-get-by-employee', async (_event, employeeId: number) => {
    try {
      return await trainingController!.getEmployeeTrainings(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel eğitimleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Eğitim katılımcılarını getir
  ipcMain.handle('employee-training-get-participants', async (_event, trainingId: number) => {
    try {
      return await trainingController!.getTrainingParticipants(trainingId)
    } catch (error) {
      return { success: false, errors: ['Eğitim katılımcıları getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personelin tamamlanmış eğitim sayısını getir
  ipcMain.handle('employee-training-completed-count', async (_event, employeeId: number) => {
    try {
      return await trainingController!.getCompletedTrainingCount(employeeId)
    } catch (error) {
      return { success: false, errors: ['Tamamlanmış eğitim sayısı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personelin planlanan eğitim sayısını getir
  ipcMain.handle('employee-training-planned-count', async (_event, employeeId: number) => {
    try {
      return await trainingController!.getPlannedTrainingCount(employeeId)
    } catch (error) {
      return { success: false, errors: ['Planlanan eğitim sayısı getirilemedi: ' + (error as Error).message] }
    }
  })
}
