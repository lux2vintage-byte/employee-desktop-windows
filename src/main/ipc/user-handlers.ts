import { ipcMain } from 'electron'
import { UserController } from '../controllers/UserController'

let userController: UserController | null = null

/**
 * User Controller'ı başlat
 */
export function initializeUserController(): void {
  if (!userController) {
    userController = new UserController()
  }
}

/**
 * Kullanıcı IPC Handler'ları
 */
export function setupUserHandlers(): void {
  initializeUserController()

  // Tüm kullanıcıları getir
  ipcMain.handle('user-get-all', async (event, options) => {
    try {
      return await userController!.getAll(options)
    } catch (error) {
      return { success: false, errors: ['Kullanıcılar getirilemedi: ' + (error as Error).message] }
    }
  })

  // Kullanıcı getir
  ipcMain.handle('user-get-by-id', async (event, id: number) => {
    try {
      return await userController!.getById(id)
    } catch (error) {
      return { success: false, errors: ['Kullanıcı getirilemedi: ' + (error as Error).message] }
    }
  })

  // Kullanıcı oluştur
  ipcMain.handle('user-create', async (event, userData) => {
    try {
      return await userController!.create(userData)
    } catch (error) {
      return { success: false, errors: ['Kullanıcı oluşturulamadı: ' + (error as Error).message] }
    }
  })

  // Kullanıcı güncelle
  ipcMain.handle('user-update', async (event, id: number, userData) => {
    try {
      return await userController!.update(id, userData)
    } catch (error) {
      return { success: false, errors: ['Kullanıcı güncellenemedi: ' + (error as Error).message] }
    }
  })

  // Kullanıcı sil
  ipcMain.handle('user-delete', async (event, id: number) => {
    try {
      return await userController!.delete(id)
    } catch (error) {
      return { success: false, errors: ['Kullanıcı silinemedi: ' + (error as Error).message] }
    }
  })

  // Giriş yap
  ipcMain.handle('user-login', async (event, email: string, password: string) => {
    try {
      return await userController!.login(email, password)
    } catch (error) {
      return { success: false, errors: ['Giriş yapılamadı: ' + (error as Error).message] }
    }
  })

  // Şifremi unuttum
  ipcMain.handle('user-forgot-password', async (event, email: string) => {
    try {
      return await userController!.forgotPassword(email)
    } catch (error) {
      return { success: false, errors: ['Şifre sıfırlama işlemi başarısız: ' + (error as Error).message] }
    }
  })

  // Şifre değiştir
  ipcMain.handle('user-change-password', async (event, id: number, currentPassword: string, newPassword: string) => {
    try {
      return await userController!.changePassword(id, currentPassword, newPassword)
    } catch (error) {
      return { success: false, errors: ['Şifre değiştirilemedi: ' + (error as Error).message] }
    }
  })
}
