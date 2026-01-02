// Jest test setup dosyası
// Global test konfigürasyonları burada yapılır

// Test timeout'unu artır (Electron testleri için)
jest.setTimeout(30000);

// Electron mock'ları
const mockApp = {
  getPath: jest.fn().mockReturnValue(require('os').tmpdir()),
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  quit: jest.fn(),
  whenReady: jest.fn().mockResolvedValue(undefined),
  on: jest.fn()
};

const mockBrowserWindow = {
  getFocusedWindow: jest.fn().mockReturnValue({
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    isMaximized: jest.fn().mockReturnValue(false)
  }),
  getAllWindows: jest.fn().mockReturnValue([])
};

const mockIpcMain = {
  handle: jest.fn()
};

// Electron modülünü mock'la
jest.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
  screen: {
    getPrimaryDisplay: jest.fn().mockReturnValue({
      workAreaSize: { width: 1920, height: 1080 }
    })
  }
}));

// Global test utilities
(global as any).testUtils = {
  mockApp,
  mockBrowserWindow,
  mockIpcMain
};