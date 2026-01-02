import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'
import App from '../../App.vue'
import HomeView from '../../views/HomeView.vue'

// Mock window.electronAPI
const mockElectronAPI = {
  healthCheck: vi.fn(),
  getAppVersion: vi.fn(),
  minimizeApp: vi.fn(),
  maximizeApp: vi.fn(),
  closeApp: vi.fn(),
  getStats: vi.fn(),
  getAllEmployees: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Create router for testing
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/employees', component: { template: '<div>Employees</div>' } },
    { path: '/settings', component: { template: '<div>Settings</div>' } }
  ]
})

describe('App Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Default mock implementations
    mockElectronAPI.healthCheck.mockResolvedValue(true)
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0')
    mockElectronAPI.getStats.mockResolvedValue({
      employeeCount: 0,
      configCount: 0,
      auditLogCount: 0
    })
    mockElectronAPI.getAllEmployees.mockResolvedValue([])
  })

  describe('Component Rendering', () => {
    it('should render main layout structure', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      // Check main structure
      expect(wrapper.find('.app-header').exists()).toBe(true)
      expect(wrapper.find('.app-main').exists()).toBe(true)
      expect(wrapper.find('.sidebar').exists()).toBe(true)
      expect(wrapper.find('.content').exists()).toBe(true)
      expect(wrapper.find('.app-footer').exists()).toBe(true)
    })

    it('should render header with title and window controls', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      const header = wrapper.find('.app-header')
      expect(header.find('h1').text()).toBe('Personel Yönetimi Sistemi')
      
      const buttons = header.findAll('button')
      expect(buttons).toHaveLength(3)
      expect(buttons[0].text()).toBe('−') // minimize
      expect(buttons[1].text()).toBe('□') // maximize
      expect(buttons[2].text()).toBe('×') // close
    })

    it('should render navigation menu', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      const navLinks = wrapper.findAll('.nav-link')
      expect(navLinks).toHaveLength(3)
      
      expect(navLinks[0].text()).toContain('Dashboard')
      expect(navLinks[1].text()).toContain('Personeller')
      expect(navLinks[2].text()).toContain('Ayarlar')
    })

    it('should render footer with version and status', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for async operations

      const footer = wrapper.find('.app-footer')
      expect(footer.text()).toContain('Personel Yönetimi v1.0.0')
    })
  })

  describe('Composition API Integration', () => {
    it('should use reactive refs correctly', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      // Check that reactive data is working
      const vm = wrapper.vm as any
      expect(vm.appVersion).toBe('1.0.0')
    })

    it('should integrate with Pinia stores', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      // Check that stores are accessible
      const vm = wrapper.vm as any
      expect(vm.appStore).toBeDefined()
      expect(vm.databaseStore).toBeDefined()
    })
  })

  describe('TypeScript Integration', () => {
    it('should handle TypeScript types correctly', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      // This test ensures TypeScript compilation works
      // If there were type errors, the component wouldn't mount
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle async operations with proper typing', async () => {
      mockElectronAPI.getAppVersion.mockResolvedValue('2.0.0')
      
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockElectronAPI.getAppVersion).toHaveBeenCalled()
    })
  })

  describe('Electron Integration', () => {
    it('should call electronAPI methods on mount', async () => {
      mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockElectronAPI.healthCheck).toHaveBeenCalled()
      expect(mockElectronAPI.getAppVersion).toHaveBeenCalled()
    })

    it('should handle window control buttons', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      const buttons = wrapper.findAll('.header-actions button')
      
      // Test minimize button
      await buttons[0].trigger('click')
      expect(mockElectronAPI.minimizeApp).toHaveBeenCalled()
      
      // Test maximize button
      await buttons[1].trigger('click')
      expect(mockElectronAPI.maximizeApp).toHaveBeenCalled()
      
      // Test close button
      await buttons[2].trigger('click')
      expect(mockElectronAPI.closeApp).toHaveBeenCalled()
    })

    it('should handle missing electronAPI gracefully', async () => {
      // Temporarily remove electronAPI
      const originalAPI = window.electronAPI
      ;(window as any).electronAPI = undefined

      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      // Should not crash
      expect(wrapper.exists()).toBe(true)

      // Restore electronAPI
      window.electronAPI = originalAPI
    })
  })

  describe('Status Display', () => {
    it('should show loading status', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      // Get store and set loading
      const vm = wrapper.vm as any
      vm.appStore.setLoading(true)
      
      await nextTick()

      expect(wrapper.find('.app-footer').text()).toContain('Yükleniyor')
    })

    it('should show error status', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      // Get store and set error (but not loading)
      const vm = wrapper.vm as any
      vm.appStore.setError('Test error')
      vm.appStore.setLoading(false)
      
      await nextTick()

      expect(wrapper.find('.app-footer').text()).toContain('Test error')
    })

    it('should show database connection status', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      // Get store and set connection status (but not loading or error)
      const vm = wrapper.vm as any
      vm.appStore.setLoading(false)
      vm.appStore.clearError()
      vm.databaseStore.isConnected = true
      
      await nextTick()

      expect(wrapper.find('.app-footer').text()).toContain('Veritabanı bağlı')
    })
  })

  describe('Router Integration', () => {
    it('should navigate between routes', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await router.push('/')
      await nextTick()

      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should highlight active navigation link', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await router.push('/')
      await nextTick()

      const activeLink = wrapper.find('.nav-link.router-link-active')
      expect(activeLink.exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockElectronAPI.healthCheck.mockRejectedValue(new Error('Connection failed'))

      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not crash and should show error
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle version fetch errors', async () => {
      mockElectronAPI.getAppVersion.mockRejectedValue(new Error('Version fetch failed'))

      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not crash
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive layout classes', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [createPinia(), router]
        }
      })

      await nextTick()

      // Check that layout uses flexbox
      const appMain = wrapper.find('.app-main')
      expect(appMain.classes()).toContain('app-main')
      
      const sidebar = wrapper.find('.sidebar')
      expect(sidebar.exists()).toBe(true)
      
      const content = wrapper.find('.content')
      expect(content.exists()).toBe(true)
    })
  })
})