/**
 * Masaüstü UI Testleri
 * Özellik 5: Masaüstü Layout Adaptasyonu
 * Özellik 6: Çoklu Panel Görüntüleme
 * Özellik 7: Klavye Kısayolu Tutarlılığı
 * Doğrular: Gereksinim 6.2, 6.3, 6.4, 6.5
 */

import * as fs from 'fs'
import * as path from 'path'

describe('Feature: personel-yonetimi-altyapi, Property 5: Masaüstü Layout Adaptasyonu', () => {
  describe('Responsive Layout Composable', () => {
    it('should have useResponsiveLayout composable', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      expect(fs.existsSync(composablePath)).toBe(true)
    })

    it('should export LayoutConfig interface', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('export interface LayoutConfig')
      expect(content).toContain('sidebarWidth')
      expect(content).toContain('contentPadding')
      expect(content).toContain('gridColumns')
    })

    it('should have breakpoint configuration', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('BreakpointConfig')
      expect(content).toContain('sm:')
      expect(content).toContain('md:')
      expect(content).toContain('lg:')
      expect(content).toContain('xl:')
    })

    it('should have calculateOptimalLayout function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('calculateOptimalLayout')
    })

    it('should have adjustSidebarWidth function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('adjustSidebarWidth')
    })

    it('should have determineGridColumns function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('determineGridColumns')
    })
  })

  describe('Responsive Breakpoints', () => {
    it('should have mobile detection', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('isMobile')
    })

    it('should have tablet detection', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('isTablet')
    })

    it('should have desktop detection', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('isDesktop')
    })
  })
})


describe('Feature: personel-yonetimi-altyapi, Property 7: Klavye Kısayolu Tutarlılığı', () => {
  describe('Keyboard Shortcuts Composable', () => {
    it('should have useKeyboardShortcuts composable', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts')
      expect(fs.existsSync(composablePath)).toBe(true)
    })

    it('should export ShortcutDefinition interface', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('export interface ShortcutDefinition')
      expect(content).toContain('key: string')
      expect(content).toContain('modifiers: string[]')
      expect(content).toContain('action: string')
      expect(content).toContain('description: string')
    })

    it('should have register function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('const register')
    })

    it('should have unregister function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('const unregister')
    })

    it('should have conflict detection', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('hasConflict')
    })

    it('should have default shortcuts registration', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('registerDefaultShortcuts')
    })
  })
})


describe('Feature: personel-yonetimi-altyapi, Property 6: Çoklu Panel Görüntüleme', () => {
  describe('Multi-Panel Display Composable', () => {
    it('should have useMultiPanelDisplay composable', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      expect(fs.existsSync(composablePath)).toBe(true)
    })

    it('should export Panel interface', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('export interface Panel')
      expect(content).toContain('minWidth')
      expect(content).toContain('isVisible')
    })

    it('should export PanelSizes interface', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('export interface PanelSizes')
      expect(content).toContain('sidebar')
      expect(content).toContain('main')
      expect(content).toContain('details')
    })

    it('should have calculatePanelSizes function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('calculatePanelSizes')
    })

    it('should have shouldShowPanel function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('shouldShowPanel')
    })

    it('should have optimizeContentDisplay function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('optimizeContentDisplay')
    })

    it('should have large screen threshold of 1200px', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('LARGE_SCREEN_THRESHOLD = 1200')
    })

    it('should have panel toggle functionality', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('togglePanel')
      expect(content).toContain('showPanel')
      expect(content).toContain('hidePanel')
    })
  })
})


describe('Feature: personel-yonetimi-altyapi, Property 8: Typography ve Spacing Tutarlılığı', () => {
  describe('Typography Composable', () => {
    it('should have useTypography composable', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      expect(fs.existsSync(composablePath)).toBe(true)
    })

    it('should export TypographyConfig interface', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('export interface TypographyConfig')
      expect(content).toContain('baseFontSize')
      expect(content).toContain('headingScale')
      expect(content).toContain('lineHeight')
    })

    it('should export SpacingConfig interface', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('export interface SpacingConfig')
      expect(content).toContain('xs:')
      expect(content).toContain('sm:')
      expect(content).toContain('md:')
      expect(content).toContain('lg:')
      expect(content).toContain('xl:')
    })

    it('should export ResponsiveTypography interface', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('export interface ResponsiveTypography')
      expect(content).toContain('h1:')
      expect(content).toContain('h2:')
      expect(content).toContain('body:')
    })

    it('should have scaleFactor for responsive sizing', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('scaleFactor')
    })

    it('should have responsiveTypography computed', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('responsiveTypography')
    })

    it('should have responsiveSpacing computed', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('responsiveSpacing')
    })

    it('should have getSpacing function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('const getSpacing')
    })

    it('should have generateCSSVariables function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('generateCSSVariables')
    })

    it('should have applyCSSVariables function', () => {
      const composablePath = path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts')
      const content = fs.readFileSync(composablePath, 'utf-8')
      
      expect(content).toContain('applyCSSVariables')
    })
  })
})


describe('Feature: personel-yonetimi-altyapi, Desktop UI Entegrasyon Testleri', () => {
  describe('All Composables Integration', () => {
    const composablesDir = path.join(__dirname, '../../src/renderer/src/composables')

    it('should have all required composables', () => {
      expect(fs.existsSync(path.join(composablesDir, 'useResponsiveLayout.ts'))).toBe(true)
      expect(fs.existsSync(path.join(composablesDir, 'useKeyboardShortcuts.ts'))).toBe(true)
      expect(fs.existsSync(path.join(composablesDir, 'useMultiPanelDisplay.ts'))).toBe(true)
      expect(fs.existsSync(path.join(composablesDir, 'useTypography.ts'))).toBe(true)
    })

    it('should use Vue 3 Composition API in all composables', () => {
      const files = [
        'useResponsiveLayout.ts',
        'useKeyboardShortcuts.ts',
        'useMultiPanelDisplay.ts',
        'useTypography.ts'
      ]

      files.forEach(file => {
        const content = fs.readFileSync(path.join(composablesDir, file), 'utf-8')
        expect(content).toContain("from 'vue'")
        expect(content).toMatch(/import\s*{[^}]*(ref|computed|reactive)[^}]*}\s*from\s*['"]vue['"]/)
      })
    })

    it('should have consistent export pattern', () => {
      const files = [
        'useResponsiveLayout.ts',
        'useKeyboardShortcuts.ts',
        'useMultiPanelDisplay.ts',
        'useTypography.ts'
      ]

      files.forEach(file => {
        const content = fs.readFileSync(path.join(composablesDir, file), 'utf-8')
        expect(content).toMatch(/export function use\w+/)
      })
    })

    it('should handle window resize events', () => {
      const layoutContent = fs.readFileSync(path.join(composablesDir, 'useResponsiveLayout.ts'), 'utf-8')
      const typographyContent = fs.readFileSync(path.join(composablesDir, 'useTypography.ts'), 'utf-8')
      const panelContent = fs.readFileSync(path.join(composablesDir, 'useMultiPanelDisplay.ts'), 'utf-8')

      // Layout ve Typography resize event'lerini dinler
      expect(layoutContent).toContain('addEventListener')
      expect(layoutContent).toContain('removeEventListener')
      expect(typographyContent).toContain('addEventListener')
      expect(typographyContent).toContain('removeEventListener')
      // Panel composable updateAvailableWidth ile manuel güncelleme yapar
      expect(panelContent).toContain('updateAvailableWidth')
    })

    it('should have TypeScript interfaces exported', () => {
      const files = [
        'useResponsiveLayout.ts',
        'useKeyboardShortcuts.ts',
        'useMultiPanelDisplay.ts',
        'useTypography.ts'
      ]

      files.forEach(file => {
        const content = fs.readFileSync(path.join(composablesDir, file), 'utf-8')
        expect(content).toMatch(/export interface \w+/)
      })
    })
  })

  describe('Layout and Panel Integration', () => {
    it('should have compatible breakpoint systems', () => {
      const layoutContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts'), 'utf-8')
      const panelContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts'), 'utf-8')

      // Both should have breakpoint awareness
      expect(layoutContent).toContain('breakpoints')
      expect(panelContent).toContain('LARGE_SCREEN_THRESHOLD')
    })

    it('should have sidebar width management in both layout and panel', () => {
      const layoutContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts'), 'utf-8')
      const panelContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useMultiPanelDisplay.ts'), 'utf-8')

      expect(layoutContent).toContain('sidebarWidth')
      expect(panelContent).toContain('sidebar')
    })
  })

  describe('Typography and Layout Integration', () => {
    it('should have responsive scaling in both', () => {
      const layoutContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts'), 'utf-8')
      const typographyContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts'), 'utf-8')

      expect(layoutContent).toContain('windowWidth')
      expect(typographyContent).toContain('windowWidth')
      expect(typographyContent).toContain('scaleFactor')
    })

    it('should have consistent spacing approach', () => {
      const layoutContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useResponsiveLayout.ts'), 'utf-8')
      const typographyContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useTypography.ts'), 'utf-8')

      expect(layoutContent).toContain('contentPadding')
      expect(typographyContent).toContain('containerPadding')
    })
  })

  describe('Keyboard Shortcuts Integration', () => {
    it('should support panel toggle shortcuts', () => {
      const shortcutsContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts'), 'utf-8')
      
      // Kısayol sistemi register fonksiyonu ile panel toggle için kullanılabilir
      expect(shortcutsContent).toContain('register')
      expect(shortcutsContent).toContain('callback')
    })

    it('should have cleanup on unmount', () => {
      const shortcutsContent = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/composables/useKeyboardShortcuts.ts'), 'utf-8')
      
      expect(shortcutsContent).toContain('onUnmounted')
      expect(shortcutsContent).toContain('removeEventListener')
    })
  })
})
