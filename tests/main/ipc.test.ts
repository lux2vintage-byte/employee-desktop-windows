/**
 * IPC İletişim Testleri
 * Renderer ve Main process arası iletişimi test eder
 */

describe('IPC Communication', () => {
  describe('IPC Files Existence', () => {
    it('should have database handlers file', () => {
      // Test: Veritabanı handler dosyasının varlığı
      const fs = require('fs');
      const path = require('path');
      
      const handlersPath = path.join(__dirname, '../../src/main/ipc/database-handlers.ts');
      expect(fs.existsSync(handlersPath)).toBe(true);
    });

    it('should have app handlers file', () => {
      // Test: Uygulama handler dosyasının varlığı
      const fs = require('fs');
      const path = require('path');
      
      const appHandlersPath = path.join(__dirname, '../../src/main/ipc/app-handlers.ts');
      expect(fs.existsSync(appHandlersPath)).toBe(true);
    });

    it('should have preload script file', () => {
      // Test: Preload script dosyasının varlığı
      const fs = require('fs');
      const path = require('path');
      
      const preloadPath = path.join(__dirname, '../../src/preload/preload.ts');
      expect(fs.existsSync(preloadPath)).toBe(true);
    });

    it('should have main IPC index file', () => {
      // Test: Ana IPC index dosyasının varlığı
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.join(__dirname, '../../src/main/ipc/index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });

  describe('IPC Channel Names', () => {
    it('should have correct database IPC channels', () => {
      // Test: Doğru veritabanı IPC kanalları
      const fs = require('fs');
      const path = require('path');
      
      const handlersPath = path.join(__dirname, '../../src/main/ipc/database-handlers.ts');
      const content = fs.readFileSync(handlersPath, 'utf8');
      
      expect(content).toContain('db:getAllEmployees');
      expect(content).toContain('db:createEmployee');
      expect(content).toContain('db:getStats');
    });

    it('should have correct app IPC channels', () => {
      // Test: Doğru uygulama IPC kanalları
      const fs = require('fs');
      const path = require('path');
      
      const appHandlersPath = path.join(__dirname, '../../src/main/ipc/app-handlers.ts');
      const content = fs.readFileSync(appHandlersPath, 'utf8');
      
      expect(content).toContain('app:getVersion');
      expect(content).toContain('app:close');
    });
  });

  describe('Preload Security', () => {
    it('should use contextBridge for security', () => {
      // Test: Güvenlik için contextBridge kullanımı
      const fs = require('fs');
      const path = require('path');
      
      const preloadPath = path.join(__dirname, '../../src/preload/preload.ts');
      const content = fs.readFileSync(preloadPath, 'utf8');
      
      expect(content).toContain('contextBridge');
      expect(content).toContain('exposeInMainWorld');
      expect(content).toContain('electronAPI');
    });

    it('should use secure IPC invoke pattern', () => {
      // Test: Güvenli IPC invoke pattern kullanımı
      const fs = require('fs');
      const path = require('path');
      
      const preloadPath = path.join(__dirname, '../../src/preload/preload.ts');
      const content = fs.readFileSync(preloadPath, 'utf8');
      
      expect(content).toContain('ipcRenderer.invoke');
      expect(content).not.toContain('ipcRenderer.send');
    });
  });
});