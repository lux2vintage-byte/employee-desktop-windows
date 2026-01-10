import { ipcMain } from 'electron'
import { EmployeeSalaryController } from '../controllers/EmployeeSalaryController'

let employeeSalaryController: EmployeeSalaryController | null = null

/**
 * EmployeeSalary Controller'ı başlat
 */
export function initializeEmployeeSalaryController(): void {
    if (!employeeSalaryController) {
        employeeSalaryController = new EmployeeSalaryController()
    }
}

/**
 * EmployeeSalary IPC Handler'ları
 * Personel ücret kayıtları için IPC handler'ları
 */
export function setupEmployeeSalaryHandlers(): void {
    initializeEmployeeSalaryController()

    // Tüm ücret kayıtlarını getir
    ipcMain.handle('employee-salary:get-all', async (_event, options) => {
        try {
            return await employeeSalaryController!.getAll(options)
        } catch (error) {
            return { success: false, errors: ['Ücret kayıtları getirilemedi: ' + (error as Error).message] }
        }
    })

    // ID ile ücret kaydını getir
    ipcMain.handle('employee-salary:get-by-id', async (_event, id: number) => {
        try {
            return await employeeSalaryController!.getById(id)
        } catch (error) {
            return { success: false, errors: ['Ücret kaydı getirilemedi: ' + (error as Error).message] }
        }
    })

    // Personelin tüm ücret geçmişini getir
    ipcMain.handle('employee-salary:get-by-employee', async (_event, employeeId: number) => {
        try {
            return await employeeSalaryController!.getByEmployee(employeeId)
        } catch (error) {
            return { success: false, errors: ['Personel ücret geçmişi getirilemedi: ' + (error as Error).message] }
        }
    })

    // Belirli yıla ait ücret kayıtlarını getir
    ipcMain.handle('employee-salary:get-by-year', async (_event, year: number) => {
        try {
            return await employeeSalaryController!.getByYear(year)
        } catch (error) {
            return { success: false, errors: ['Yıla göre ücret kayıtları getirilemedi: ' + (error as Error).message] }
        }
    })

    // Personel ve yıla göre ücret kaydını getir
    ipcMain.handle('employee-salary:get-by-employee-and-year', async (_event, employeeId: number, year: number) => {
        try {
            return await employeeSalaryController!.getByEmployeeAndYear(employeeId, year)
        } catch (error) {
            return { success: false, errors: ['Ücret kaydı getirilemedi: ' + (error as Error).message] }
        }
    })

    // Yeni ücret kaydı oluştur
    ipcMain.handle('employee-salary:create', async (_event, data, userId?: number) => {
        try {
            return await employeeSalaryController!.create(data, userId)
        } catch (error) {
            return { success: false, errors: ['Ücret kaydı oluşturulamadı: ' + (error as Error).message] }
        }
    })

    // Ücret kaydını güncelle
    ipcMain.handle('employee-salary:update', async (_event, id: number, data, userId?: number) => {
        try {
            return await employeeSalaryController!.update(id, data, userId)
        } catch (error) {
            return { success: false, errors: ['Ücret kaydı güncellenemedi: ' + (error as Error).message] }
        }
    })

    // Ücret kaydını sil
    ipcMain.handle('employee-salary:delete', async (_event, id: number, userId?: number) => {
        try {
            return await employeeSalaryController!.delete(id, userId)
        } catch (error) {
            return { success: false, errors: ['Ücret kaydı silinemedi: ' + (error as Error).message] }
        }
    })

    // Ücret kaydını geri yükle
    ipcMain.handle('employee-salary:restore', async (_event, id: number, userId?: number) => {
        try {
            return await employeeSalaryController!.restore(id, userId)
        } catch (error) {
            return { success: false, errors: ['Ücret kaydı geri yüklenemedi: ' + (error as Error).message] }
        }
    })

    // Tüm yılların listesini getir
    ipcMain.handle('employee-salary:get-years', async (_event) => {
        try {
            return await employeeSalaryController!.getDistinctYears()
        } catch (error) {
            return { success: false, errors: ['Yıl listesi getirilemedi: ' + (error as Error).message] }
        }
    })
}
