import { ipcMain, app, BrowserWindow } from 'electron'

/**
 * Uygulama IPC Handler'ları
 */
export function setupAppHandlers() {
  // Uygulama versiyonu
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // Uygulamayı kapat
  ipcMain.handle('close-app', () => {
    app.quit()
  })

  // Uygulamayı minimize et
  ipcMain.handle('minimize-app', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.minimize()
    }
  })

  // Uygulamayı maximize et
  ipcMain.handle('maximize-app', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  console.log('Uygulama IPC handler\'ları kuruldu')
}