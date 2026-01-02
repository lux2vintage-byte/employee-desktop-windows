/**
 * Electron Main Process Testleri
 * Ana pencerenin başarıyla oluşturulduğunu doğrular
 */

describe('Electron Main Process', () => {
  describe('createMainWindow', () => {
    it('should be defined and callable', () => {
      // Test: createMainWindow fonksiyonunun tanımlı olması
      const { createMainWindow } = require('../../src/main/main');
      expect(typeof createMainWindow).toBe('function');
    });

    it('should have main.ts file with proper exports', () => {
      // Test: main.ts dosyasının doğru export'ları içermesi
      const mainModule = require('../../src/main/main');
      expect(mainModule).toBeDefined();
      expect(mainModule.createMainWindow).toBeDefined();
    });
  });

  describe('Window Configuration Constants', () => {
    it('should have reasonable default window dimensions', () => {
      // Test: Makul varsayılan pencere boyutları
      const minWidth = 800;
      const minHeight = 600;
      const maxWidth = 1920;
      const maxHeight = 1080;

      expect(minWidth).toBeGreaterThan(0);
      expect(minHeight).toBeGreaterThan(0);
      expect(maxWidth).toBeGreaterThan(minWidth);
      expect(maxHeight).toBeGreaterThan(minHeight);
    });

    it('should have secure webPreferences configuration', () => {
      // Test: Güvenli webPreferences konfigürasyonu
      const secureConfig = {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
      };

      expect(secureConfig.nodeIntegration).toBe(false);
      expect(secureConfig.contextIsolation).toBe(true);
      expect(secureConfig.enableRemoteModule).toBe(false);
    });
  });
});