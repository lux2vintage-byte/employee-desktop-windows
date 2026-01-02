/**
 * Development Environment Testleri
 * Gereksinim 4.2: DevTools erişimi ve development/production mode ayırımı
 */

import * as fs from 'fs'
import * as path from 'path'

describe('Development Environment', () => {
  describe('DevTools Konfigürasyonu', () => {
    it('should have isDev and isProduction exports in main.ts', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      // isDev ve isProduction değişkenlerinin tanımlı olduğunu kontrol et
      expect(content).toContain('const isDev')
      expect(content).toContain('const isProduction')
      expect(content).toContain('export { mainWindow, createMainWindow, isDev, isProduction }')
    })

    it('should configure DevTools based on environment', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      // DevTools'un isDev'e bağlı olduğunu kontrol et
      expect(content).toContain('devTools: isDev')
      expect(content).toContain('openDevTools()')
    })

    it('should have setupDebugConfiguration function', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      // Debug konfigürasyon fonksiyonunun varlığını kontrol et
      expect(content).toContain('function setupDebugConfiguration()')
      expect(content).toContain('setupDebugConfiguration()')
    })

    it('should check NODE_ENV or ELECTRON_ENV for development mode', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      // Environment değişkenlerinin kontrol edildiğini doğrula
      expect(content).toContain("process.env.NODE_ENV === 'development'")
      expect(content).toContain("process.env.ELECTRON_ENV === 'development'")
    })
  })

  describe('Development/Production Mode Ayırımı', () => {
    it('should load from dev server in development mode', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      // Development modunda dev server'dan yükleme
      expect(content).toContain("loadURL('http://localhost:5173')")
    })

    it('should load from file in production mode', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      // Production modunda dosyadan yükleme
      expect(content).toContain('loadFile')
      expect(content).toContain('renderer/index.html')
    })

    it('should have conditional DevTools opening', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      // DevTools'un koşullu açılması
      expect(content).toContain('if (isDev)')
      expect(content).toContain('openDevTools()')
    })
  })

  describe('Hot Reload Konfigürasyonu', () => {
    it('should have nodemon configuration for hot reload', () => {
      const nodemonPath = path.join(__dirname, '../../nodemon.json')
      
      expect(fs.existsSync(nodemonPath)).toBe(true)
      
      const nodemonConfig = JSON.parse(fs.readFileSync(nodemonPath, 'utf-8'))
      
      // Nodemon'un src/main dizinini izlediğini kontrol et
      expect(nodemonConfig.watch).toContain('src/main')
      expect(nodemonConfig.ext).toContain('ts')
    })

    it('should have concurrently script for parallel dev servers', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      // Dev script'inin concurrently kullandığını kontrol et
      expect(packageJson.scripts.dev).toContain('concurrently')
      expect(packageJson.scripts['dev:renderer']).toBeDefined()
      expect(packageJson.scripts['dev:main']).toBeDefined()
    })

    it('should have Vite dev server configuration', () => {
      const viteConfigPath = path.join(__dirname, '../../src/renderer/vite.config.ts')
      
      expect(fs.existsSync(viteConfigPath)).toBe(true)
      
      const content = fs.readFileSync(viteConfigPath, 'utf-8')
      
      // Vite konfigürasyonunun varlığını kontrol et
      expect(content).toContain('defineConfig')
    })
  })

  describe('Error Handling', () => {
    it('should have uncaughtException handler', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      expect(content).toContain("process.on('uncaughtException'")
    })

    it('should have unhandledRejection handler', () => {
      const mainTsPath = path.join(__dirname, '../../src/main/main.ts')
      const content = fs.readFileSync(mainTsPath, 'utf-8')
      
      expect(content).toContain("process.on('unhandledRejection'")
    })
  })

  describe('Package.json Scripts', () => {
    it('should have all required development scripts', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      // Gerekli script'lerin varlığını kontrol et
      expect(packageJson.scripts.dev).toBeDefined()
      expect(packageJson.scripts['dev:renderer']).toBeDefined()
      expect(packageJson.scripts['dev:main']).toBeDefined()
      expect(packageJson.scripts.build).toBeDefined()
      expect(packageJson.scripts['build:main']).toBeDefined()
      expect(packageJson.scripts['build:renderer']).toBeDefined()
      expect(packageJson.scripts.test).toBeDefined()
    })

    it('should have required devDependencies', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      // Gerekli devDependencies'lerin varlığını kontrol et
      expect(packageJson.devDependencies.electron).toBeDefined()
      expect(packageJson.devDependencies.typescript).toBeDefined()
      expect(packageJson.devDependencies.jest).toBeDefined()
      expect(packageJson.devDependencies.concurrently).toBeDefined()
      expect(packageJson.devDependencies.nodemon).toBeDefined()
    })
  })
})
