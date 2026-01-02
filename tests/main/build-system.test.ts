/**
 * Build Sistemi Testleri
 * Özellik 4: Build Sistemi Bundle Optimizasyonu
 * Doğrular: Gereksinim 5.4
 */

import * as fs from 'fs'
import * as path from 'path'

describe('Feature: personel-yonetimi-altyapi, Property 4: Build Sistemi Bundle Optimizasyonu', () => {
  describe('Electron Builder Konfigürasyonu', () => {
    it('should have electron-builder.json configuration file', () => {
      const configPath = path.join(__dirname, '../../electron-builder.json')
      expect(fs.existsSync(configPath)).toBe(true)
    })

    it('should have valid electron-builder configuration', () => {
      const configPath = path.join(__dirname, '../../electron-builder.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      
      expect(config.appId).toBeDefined()
      expect(config.productName).toBeDefined()
      expect(config.directories).toBeDefined()
      expect(config.files).toBeDefined()
    })

    it('should have cross-platform build targets', () => {
      const configPath = path.join(__dirname, '../../electron-builder.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      
      expect(config.win).toBeDefined()
      expect(config.mac).toBeDefined()
      expect(config.linux).toBeDefined()
    })

    it('should have compression enabled for optimization', () => {
      const configPath = path.join(__dirname, '../../electron-builder.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      
      expect(config.compression).toBe('maximum')
      expect(config.asar).toBe(true)
    })
  })

  describe('Package.json Build Scripts', () => {
    it('should have build scripts defined', () => {
      const packagePath = path.join(__dirname, '../../package.json')
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
      
      expect(pkg.scripts.build).toBeDefined()
      expect(pkg.scripts['build:main']).toBeDefined()
      expect(pkg.scripts['build:renderer']).toBeDefined()
      expect(pkg.scripts['build:app']).toBeDefined()
    })

    it('should have platform-specific build scripts', () => {
      const packagePath = path.join(__dirname, '../../package.json')
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
      
      expect(pkg.scripts['build:win']).toBeDefined()
      expect(pkg.scripts['build:mac']).toBeDefined()
      expect(pkg.scripts['build:linux']).toBeDefined()
    })
  })

  describe('TypeScript Konfigürasyonu', () => {
    it('should have main process tsconfig', () => {
      const tsconfigPath = path.join(__dirname, '../../src/main/tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
    })

    it('should have renderer tsconfig', () => {
      const tsconfigPath = path.join(__dirname, '../../src/renderer/tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
    })

    it('should have root tsconfig', () => {
      const tsconfigPath = path.join(__dirname, '../../tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
    })
  })

  describe('Build Output Yapısı', () => {
    it('should have correct output directory configuration', () => {
      const configPath = path.join(__dirname, '../../electron-builder.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      
      expect(config.directories.output).toBe('dist_electron')
    })

    it('should include necessary files in build', () => {
      const configPath = path.join(__dirname, '../../electron-builder.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      
      expect(config.files).toContain('dist/**/*')
      expect(config.files).toContain('node_modules/**/*')
    })

    it('should have extraResources for renderer', () => {
      const configPath = path.join(__dirname, '../../electron-builder.json')
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      
      expect(config.extraResources).toBeDefined()
      expect(Array.isArray(config.extraResources)).toBe(true)
    })
  })

  describe('Vite Build Konfigürasyonu', () => {
    it('should have vite.config.ts for renderer', () => {
      const vitePath = path.join(__dirname, '../../src/renderer/vite.config.ts')
      expect(fs.existsSync(vitePath)).toBe(true)
    })

    it('should have production build configuration', () => {
      const vitePath = path.join(__dirname, '../../src/renderer/vite.config.ts')
      const content = fs.readFileSync(vitePath, 'utf-8')
      
      expect(content).toContain('defineConfig')
    })
  })
})


describe('SQLite Native Module Packaging', () => {
  it('should include better-sqlite3 native module in extraResources', () => {
    const configPath = path.join(__dirname, '../../electron-builder.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    
    const hasNativeModule = config.extraResources.some(
      (res: any) => res.from && res.from.includes('better-sqlite3')
    )
    expect(hasNativeModule).toBe(true)
  })

  it('should have better-sqlite3 as dependency', () => {
    const packagePath = path.join(__dirname, '../../package.json')
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    
    expect(pkg.dependencies['better-sqlite3']).toBeDefined()
  })
})

describe('TypeScript Derleme Süreci', () => {
  it('should have TypeScript compiler configuration', () => {
    const tsconfigPath = path.join(__dirname, '../../tsconfig.json')
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))
    
    expect(tsconfig.compilerOptions).toBeDefined()
  })

  it('should have main process TypeScript configuration', () => {
    const tsconfigPath = path.join(__dirname, '../../src/main/tsconfig.json')
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))
    
    expect(tsconfig.compilerOptions).toBeDefined()
    expect(tsconfig.compilerOptions.outDir).toBeDefined()
  })

  it('should have ts-jest for testing', () => {
    const packagePath = path.join(__dirname, '../../package.json')
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    
    expect(pkg.devDependencies['ts-jest']).toBeDefined()
  })
})
