import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app'

// Mock window.electronAPI
const mockElectronAPI = {
  healthCheck: vi.fn(),
  getAppVersion: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('App Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useAppStore()
      
      expect(store.isLoading).toBe(false)
      expect(store.currentUser).toBe(null)
      expect(store.isInitialized).toBe(false)
      expect(store.error).toBe(null)
      expect(store.isAuthenticated).toBe(false)
      expect(store.hasError).toBe(false)
      expect(store.canProceed).toBe(false)
    })
  })

  describe('Actions', () => {
    it('should set loading state', () => {
      const store = useAppStore()
      
      store.setLoading(true)
      expect(store.isLoading).toBe(true)
      
      store.setLoading(false)
      expect(store.isLoading).toBe(false)
    })

    it('should set and clear error', () => {
      const store = useAppStore()
      
      store.setError('Test error')
      expect(store.error).toBe('Test error')
      expect(store.hasError).toBe(true)
      
      store.clearError()
      expect(store.error).toBe(null)
      expect(store.hasError).toBe(false)
    })

    it('should set current user', () => {
      const store = useAppStore()
      const testUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      }
      
      store.setCurrentUser(testUser)
      expect(store.currentUser).toEqual(testUser)
      expect(store.isAuthenticated).toBe(true)
    })

    it('should logout user', () => {
      const store = useAppStore()
      const testUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      }
      
      store.setCurrentUser(testUser)
      store.setError('Some error')
      
      store.logout()
      expect(store.currentUser).toBe(null)
      expect(store.error).toBe(null)
      expect(store.isAuthenticated).toBe(false)
    })

    it('should reset store', () => {
      const store = useAppStore()
      
      // Set some state
      store.setLoading(true)
      store.setCurrentUser({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      })
      store.setError('Test error')
      store.isInitialized = true
      
      // Reset
      store.reset()
      
      expect(store.isLoading).toBe(false)
      expect(store.currentUser).toBe(null)
      expect(store.isInitialized).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('Initialize App', () => {
    it('should initialize app successfully', async () => {
      const store = useAppStore()
      mockElectronAPI.healthCheck.mockResolvedValue(true)
      
      await store.initializeApp()
      
      expect(store.isInitialized).toBe(true)
      expect(store.currentUser).not.toBe(null)
      expect(store.error).toBe(null)
      expect(store.isLoading).toBe(false)
      expect(mockElectronAPI.healthCheck).toHaveBeenCalled()
    })

    it('should handle initialization error when electronAPI is not available', async () => {
      const store = useAppStore()
      
      // Temporarily set electronAPI to undefined
      const originalAPI = window.electronAPI
      ;(window as any).electronAPI = undefined
      
      await store.initializeApp()
      
      expect(store.isInitialized).toBe(false)
      expect(store.currentUser).toBe(null)
      expect(store.error).toContain('Electron API mevcut değil')
      expect(store.isLoading).toBe(false)
      
      // Restore electronAPI
      window.electronAPI = originalAPI
    })

    it('should handle initialization error when health check fails', async () => {
      const store = useAppStore()
      mockElectronAPI.healthCheck.mockResolvedValue(false)
      
      await store.initializeApp()
      
      expect(store.isInitialized).toBe(false)
      expect(store.currentUser).toBe(null)
      expect(store.error).toContain('sağlık kontrolü başarısız')
      expect(store.isLoading).toBe(false)
    })

    it('should handle initialization error when health check throws', async () => {
      const store = useAppStore()
      mockElectronAPI.healthCheck.mockRejectedValue(new Error('Network error'))
      
      await store.initializeApp()
      
      expect(store.isInitialized).toBe(false)
      expect(store.currentUser).toBe(null)
      expect(store.error).toContain('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should compute canProceed correctly', () => {
      const store = useAppStore()
      
      // Initially false
      expect(store.canProceed).toBe(false)
      
      // Still false when only initialized
      store.isInitialized = true
      expect(store.canProceed).toBe(true)
      
      // False when loading
      store.setLoading(true)
      expect(store.canProceed).toBe(false)
      
      // True when initialized and not loading
      store.setLoading(false)
      expect(store.canProceed).toBe(true)
    })
  })
})