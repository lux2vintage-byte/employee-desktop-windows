import { app, BrowserWindow, screen, Menu } from 'electron'
import * as path from 'path'
import { initializeDatabaseManager, setupDatabaseHandlers, closeDatabaseManager } from './ipc/database-handlers'
import { setupAppHandlers } from './ipc/app-handlers'
import { setupUserHandlers } from './ipc/user-handlers'
import { setupCompanyInfoHandlers } from './ipc/company-info-handlers'
import { setupEmailConfigHandlers } from './ipc/email-config-handlers'
import { setupLeaveTypeHandlers } from './ipc/leave-type-handlers'
import { setupLeaveRequestHandlers } from './ipc/leave-request-handlers'
import { setupLeaveBalanceHandlers } from './ipc/leave-balance-handlers'
import { setupDepartmentHandlers } from './ipc/department-handlers'
import { setupPositionHandlers } from './ipc/position-handlers'
import { setupEmployeeHandlers } from './ipc/employee-handlers'
import { setupEmployeeDetailsHandlers } from './ipc/employee-details-handlers'
import { setupEmployeeDocumentsHandlers } from './ipc/employee-documents-handlers'
import { setupHiringRequestHandlers } from './ipc/hiring-request-handlers'
import { setupOnboardingHandlers } from './ipc/onboarding-handlers'
import { setupAttendanceHandlers } from './ipc/attendance-handlers'
import { setupOvertimeHandlers } from './ipc/overtime-handlers'
import { setupSalaryHandlers } from './ipc/salary-handlers'
import { setupPayrollHandlers } from './ipc/payroll-handlers'
import { setupAdvanceHandlers } from './ipc/advance-handlers'
import { setupPerformanceHandlers } from './ipc/performance-handlers'
import { setupTrainingHandlers } from './ipc/training-handlers'
import { setupDisciplinaryHandlers } from './ipc/disciplinary-handlers'
import { setupOffboardingHandlers } from './ipc/offboarding-handlers'
import { setupSettingsHandlers } from './ipc/settings-handlers'
import { setupSalaryParameterHandlers } from './ipc/salary-parameter-handlers'
import { setupEmployeeAllowanceHandlers } from './ipc/employee-allowance-handlers'
import { setupPaymentHistoryHandlers } from './ipc/payment-history-handlers'
import { setupReportHandlers } from './ipc/report-handlers'
import { setupDayTypeHandlers } from './ipc/day-type-handlers'
import { setupCalendarHandlers } from './ipc/calendar-handlers'

// GPU hatalarını önlemek için GPU'yu devre dışı bırak
app.disableHardwareAcceleration()

// GPU process hatalarını önlemek için ek ayarlar
app.commandLine.appendSwitch('disable-software-rasterizer')

// Geliştirme modu kontrolü - NODE_ENV veya ELECTRON_ENV'den oku
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_ENV === 'development'
const isProduction = !isDev

// Ana pencere referansı
let mainWindow: BrowserWindow | null = null

/**
 * Debug konfigürasyonunu kur
 */
function setupDebugConfiguration(): void {
  // Sessiz başlatma
}

/**
 * Ana pencere oluşturma fonksiyonu
 */
async function createMainWindow(): Promise<BrowserWindow> {
  // Ekran boyutlarını al
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  
  // Ana pencere konfigürasyonu
  const windowOptions = {
    width: width,
    height: height,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Varsayılan pencere çerçevesini kaldır
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../preload/preload.js'),
      devTools: isDev,
    },
    show: false,
    icon: isProduction ? path.join(__dirname, '../assets/icon.png') : undefined,
  }

  // Ana pencereyi oluştur
  mainWindow = new BrowserWindow(windowOptions)

  // Pencere event handler'larını kur
  setupWindowEventHandlers(mainWindow)

  // İçeriği yükle
  if (isDev) {
    // Geliştirme modunda Vue dev server'dan yükle
    // Vite dev server'ın başlaması için biraz bekle
    let loaded = false
    let attempts = 0
    const maxAttempts = 30 // 30 saniye kadar bekle

    while (!loaded && attempts < maxAttempts) {
      try {
        await mainWindow.loadURL('http://localhost:5173')
        loaded = true
      } catch (error) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!loaded) {
      console.error('Vue dev server\'a bağlanılamadı')
      throw new Error('Vue dev server bağlantı hatası')
    }

    // DevTools'u aç
    mainWindow.webContents.openDevTools()
  } else {
    // Production modunda build edilmiş dosyaları yükle
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Pencereyi göster
  mainWindow.show()

  return mainWindow
}

/**
 * Pencere event handler'larını kur
 */
function setupWindowEventHandlers(window: BrowserWindow): void {
  // Pencere hazır olduğunda
  window.once('ready-to-show', () => {
    window.show()
    
    if (isDev) {
      window.webContents.openDevTools()
    }
  })

  // Pencere kapatıldığında
  window.on('closed', () => {
    mainWindow = null
  })

  // Pencere minimize edildiğinde (macOS için)
  window.on('minimize', () => {
    // Sessiz
  })

  // Pencere restore edildiğinde (macOS için)
  window.on('restore', () => {
    // Sessiz
  })
}

/**
 * IPC handler'ları kur
 */
function setupIPCHandlers(): void {
  setupDatabaseHandlers()
  setupAppHandlers()
  setupUserHandlers()
  setupCompanyInfoHandlers()
  setupEmailConfigHandlers()
  setupLeaveTypeHandlers()
  setupLeaveRequestHandlers()
  setupLeaveBalanceHandlers()
  setupDepartmentHandlers()
  setupPositionHandlers()
  setupEmployeeHandlers()
  setupEmployeeDetailsHandlers()
  setupEmployeeDocumentsHandlers()
  setupHiringRequestHandlers()
  setupOnboardingHandlers()
  setupAttendanceHandlers()
  setupOvertimeHandlers()
  setupSalaryHandlers()
  setupPayrollHandlers()
  setupAdvanceHandlers()
  setupPerformanceHandlers()
  setupTrainingHandlers()
  setupDisciplinaryHandlers()
  setupOffboardingHandlers()
  setupSettingsHandlers()
  setupSalaryParameterHandlers()
  setupEmployeeAllowanceHandlers()
  setupPaymentHistoryHandlers()
  setupDayTypeHandlers()
  setupCalendarHandlers()
  setupReportHandlers()
}

/**
 * Uygulama hazır olduğunda
 */
app.whenReady().then(async () => {
  // Varsayılan menüyü kaldır
  Menu.setApplicationMenu(null)
  
  // Debug konfigürasyonunu kur
  setupDebugConfiguration()
  
  try {
    // Önce veritabanını başlat
    await initializeDatabaseManager()
    
    // IPC handler'ları kur
    setupIPCHandlers()
    
    // Sonra ana pencereyi oluştur
    await createMainWindow()
  } catch (error) {
    console.error('Uygulama başlatılırken hata oluştu:', error)
    app.quit()
  }

  // macOS için: Dock'ta tıklandığında pencere yoksa yeni pencere oluştur
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    }
  })
})

/**
 * Tüm pencereler kapatıldığında
 */
app.on('window-all-closed', async () => {
  // Veritabanı bağlantısını kapat
  try {
    await closeDatabaseManager()
  } catch (error) {
    // Sessizce devam et
  }

  // macOS dışında uygulamayı kapat
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * Uygulama kapatılmadan önce
 */
app.on('before-quit', async (event) => {
  // Veritabanı bağlantısını güvenli şekilde kapat
  try {
    await closeDatabaseManager()
  } catch (error) {
    // Sessizce devam et
  }
})

/**
 * Uygulama tamamen kapatıldığında
 */
app.on('will-quit', (event) => {
  // Uygulama kapatılıyor
})

/**
 * Yakalanmamış hata durumları
 */
process.on('uncaughtException', (error) => {
  // Kritik hata - sessizce devam et
})

process.on('unhandledRejection', (reason, promise) => {
  // Kritik hata - sessizce devam et
})

// Ana pencereyi dışa aktar (test amaçlı)
export { mainWindow, createMainWindow, isDev, isProduction }