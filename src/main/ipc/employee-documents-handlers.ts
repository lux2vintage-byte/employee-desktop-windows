import { ipcMain } from 'electron'
import { EmployeeDocumentsController } from '../controllers/EmployeeDocumentsController'

let employeeDocumentsController: EmployeeDocumentsController | null = null

/**
 * EmployeeDocuments Controller'ı başlat
 */
export function initializeEmployeeDocumentsController(): void {
  if (!employeeDocumentsController) {
    employeeDocumentsController = new EmployeeDocumentsController()
  }
}

/**
 * EmployeeDocuments IPC Handler'ları
 * Requirements: 6.1-6.6
 */
export function setupEmployeeDocumentsHandlers(): void {
  initializeEmployeeDocumentsController()

  // Belge yükle
  ipcMain.handle('employee-documents-upload', async (_event, data, userId?: number) => {
    try {
      return await employeeDocumentsController!.upload(data, userId)
    } catch (error) {
      return { success: false, errors: ['Belge yüklenemedi: ' + (error as Error).message] }
    }
  })

  // ID ile belge getir
  ipcMain.handle('employee-documents-get-by-id', async (_event, documentId: number) => {
    try {
      return await employeeDocumentsController!.getById(documentId)
    } catch (error) {
      return { success: false, errors: ['Belge getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ID ile belgeleri getir
  ipcMain.handle('employee-documents-get-by-employee-id', async (_event, employeeId: number) => {
    try {
      return await employeeDocumentsController!.getByEmployeeId(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel belgeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ID ile belgeleri personel bilgileriyle birlikte getir
  ipcMain.handle('employee-documents-get-by-employee-id-with-employee', async (_event, employeeId: number) => {
    try {
      return await employeeDocumentsController!.getByEmployeeIdWithEmployee(employeeId)
    } catch (error) {
      return { success: false, errors: ['Personel belgeleri getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personel ID ve belge tipine göre belgeleri getir
  ipcMain.handle('employee-documents-get-by-type', async (_event, employeeId: number, documentType) => {
    try {
      return await employeeDocumentsController!.getByType(employeeId, documentType)
    } catch (error) {
      return { success: false, errors: ['Belge tipine göre belgeler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tüm belgeleri filtrelerle getir
  ipcMain.handle('employee-documents-get-all', async (_event, options) => {
    try {
      return await employeeDocumentsController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Belgeler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Belge tipine göre tüm belgeleri getir
  ipcMain.handle('employee-documents-get-by-document-type', async (_event, documentType) => {
    try {
      return await employeeDocumentsController!.getByDocumentType(documentType)
    } catch (error) {
      return { success: false, errors: ['Belge tipine göre belgeler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Belge sil (soft delete)
  ipcMain.handle('employee-documents-delete', async (_event, documentId: number, userId?: number) => {
    try {
      return await employeeDocumentsController!.delete(documentId, userId)
    } catch (error) {
      return { success: false, errors: ['Belge silinemedi: ' + (error as Error).message] }
    }
  })

  // Belgeyi geri yükle
  ipcMain.handle('employee-documents-restore', async (_event, documentId: number, userId?: number) => {
    try {
      return await employeeDocumentsController!.restore(documentId, userId)
    } catch (error) {
      return { success: false, errors: ['Belge geri yüklenemedi: ' + (error as Error).message] }
    }
  })

  // Belgeyi kalıcı olarak sil
  ipcMain.handle('employee-documents-hard-delete', async (_event, documentId: number, userId?: number) => {
    try {
      return await employeeDocumentsController!.hardDelete(documentId, userId)
    } catch (error) {
      return { success: false, errors: ['Belge kalıcı olarak silinemedi: ' + (error as Error).message] }
    }
  })

  // Personelin belge sayısını getir
  ipcMain.handle('employee-documents-count-by-employee-id', async (_event, employeeId: number) => {
    try {
      return await employeeDocumentsController!.countByEmployeeId(employeeId)
    } catch (error) {
      return { success: false, errors: ['Belge sayısı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Personelin belirli tipteki belge sayısını getir
  ipcMain.handle('employee-documents-count-by-employee-id-and-type', async (_event, employeeId: number, documentType) => {
    try {
      return await employeeDocumentsController!.countByEmployeeIdAndType(employeeId, documentType)
    } catch (error) {
      return { success: false, errors: ['Belge sayısı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Tarih aralığına göre belgeleri getir
  ipcMain.handle('employee-documents-get-by-date-range', async (_event, startDate: string, endDate: string) => {
    try {
      return await employeeDocumentsController!.getByDateRange(new Date(startDate), new Date(endDate))
    } catch (error) {
      return { success: false, errors: ['Tarih aralığına göre belgeler getirilemedi: ' + (error as Error).message] }
    }
  })

  // Dosya var mı kontrol et
  ipcMain.handle('employee-documents-check-file-exists', async (_event, filePath: string) => {
    try {
      return await employeeDocumentsController!.checkFileExists(filePath)
    } catch (error) {
      return { success: false, errors: ['Dosya kontrolü yapılamadı: ' + (error as Error).message] }
    }
  })

  // Dosya bilgilerini getir
  ipcMain.handle('employee-documents-get-file-info', async (_event, filePath: string) => {
    try {
      return await employeeDocumentsController!.getFileInfo(filePath)
    } catch (error) {
      return { success: false, errors: ['Dosya bilgisi getirilemedi: ' + (error as Error).message] }
    }
  })
}
