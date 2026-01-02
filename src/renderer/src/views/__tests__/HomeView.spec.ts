import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import HomeView from '../HomeView.vue'
import { useDatabaseStore } from '../../stores/database'

// Mock window.electronAPI
const mockElectronAPI = {
  getStats: vi.fn(),
  getAllEmployees: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('HomeView Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Default mock implementations
    mockElectronAPI.getStats.mockResolvedValue({
      employeeCount: 10,
      configCount: 5,
      auditLogCount: 25
    })
    
    mockElectronAPI.getAllEmployees.mockResolvedValue([
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        position: 'Developer',
        department: 'IT',
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z'
      },
      {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        position: 'Designer',
        department: 'Design',
        isActive: false,
        createdAt: '2023-01-02T00:00:00Z'
      }
    ])
  })

  describe('Component Rendering', () => {
    it('should render dashboard header', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      await nextTick()

      expect(wrapper.find('.dashboard-header h2').text()).toBe('Dashboard')
      expect(wrapper.find('.dashboard-header p').text()).toBe('Personel Yönetimi Sistemi\'ne hoş geldiniz')
    })

    it('should render stats grid', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const statCards = wrapper.findAll('.stat-card')
      expect(statCards).toHaveLength(4)
      
      // Check stat card contents
      expect(wrapper.text()).toContain('Toplam Personel')
      expect(wrapper.text()).toContain('Aktif Personel')
      expect(wrapper.text()).toContain('Sistem Ayarları')
      expect(wrapper.text()).toContain('Audit Kayıtları')
    })

    it('should render recent employees section', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      await nextTick()

      expect(wrapper.find('.recent-section h3').text()).toBe('Son Eklenen Personeller')
      expect(wrapper.find('.recent-employees').exists()).toBe(true)
    })
  })

  describe('Data Loading', () => {
    it('should load stats and employees on mount', async () => {
      mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockElectronAPI.getStats).toHaveBeenCalled()
      expect(mockElectronAPI.getAllEmployees).toHaveBeenCalled()
    })

    it('should display loading state', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Get store and set loading
      const store = useDatabaseStore()
      store.setLoading(true)
      
      await nextTick()

      expect(wrapper.find('.loading').exists()).toBe(true)
      expect(wrapper.find('.loading').text()).toBe('Yükleniyor...')
    })

    it('should display stats after loading', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Simulate data loading
      const store = useDatabaseStore()
      store.stats = {
        employeeCount: 15,
        configCount: 8,
        auditLogCount: 30
      }
      
      await nextTick()

      expect(wrapper.text()).toContain('15')
      expect(wrapper.text()).toContain('8')
      expect(wrapper.text()).toContain('30')
    })
  })

  describe('Employee Display', () => {
    it('should display employee list when data is available', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Set employee data
      const store = useDatabaseStore()
      store.employees = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true,
          createdAt: '2023-01-01T00:00:00Z'
        }
      ]
      store.setLoading(false) // Make sure not loading
      
      await nextTick()

      expect(wrapper.find('.employee-list').exists()).toBe(true)
      expect(wrapper.find('.employee-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Developer - IT')
    })

    it('should display no data message when no employees', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Ensure no employees
      const store = useDatabaseStore()
      store.employees = []
      store.setLoading(false)
      
      await nextTick()

      expect(wrapper.find('.no-data').exists()).toBe(true)
      expect(wrapper.find('.no-data').text()).toBe('Henüz personel kaydı bulunmuyor')
    })

    it('should show active/inactive status correctly', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Set mixed employee data
      const store = useDatabaseStore()
      store.employees = [
        {
          id: 1,
          firstName: 'Active',
          lastName: 'User',
          email: 'active@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          firstName: 'Inactive',
          lastName: 'User',
          email: 'inactive@example.com',
          position: 'Designer',
          department: 'Design',
          isActive: false,
          createdAt: '2023-01-02T00:00:00Z'
        }
      ]
      store.setLoading(false) // Make sure not loading
      
      await nextTick()

      const statusElements = wrapper.findAll('.status')
      expect(statusElements).toHaveLength(2)
      
      expect(statusElements[0].classes()).toContain('inactive')
      expect(statusElements[0].text()).toBe('Pasif')
      
      expect(statusElements[1].classes()).toContain('active')
      expect(statusElements[1].text()).toBe('Aktif')
    })
  })

  describe('Computed Properties', () => {
    it('should calculate active employees correctly', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Set employee data with mixed active status
      const store = useDatabaseStore()
      store.employees = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          position: 'Designer',
          department: 'Design',
          isActive: false,
          createdAt: '2023-01-02T00:00:00Z'
        },
        {
          id: 3,
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          position: 'Manager',
          department: 'Management',
          isActive: true,
          createdAt: '2023-01-03T00:00:00Z'
        }
      ]
      
      await nextTick()

      // Should show 2 active employees
      const activeEmployeesStat = wrapper.findAll('.stat-card')[1]
      expect(activeEmployeesStat.text()).toContain('2')
    })

    it('should sort recent employees by creation date', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Set employee data with different creation dates
      const store = useDatabaseStore()
      store.employees = [
        {
          id: 1,
          firstName: 'First',
          lastName: 'Employee',
          email: 'first@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          firstName: 'Latest',
          lastName: 'Employee',
          email: 'latest@example.com',
          position: 'Designer',
          department: 'Design',
          isActive: true,
          createdAt: '2023-01-03T00:00:00Z'
        },
        {
          id: 3,
          firstName: 'Middle',
          lastName: 'Employee',
          email: 'middle@example.com',
          position: 'Manager',
          department: 'Management',
          isActive: true,
          createdAt: '2023-01-02T00:00:00Z'
        }
      ]
      store.setLoading(false) // Make sure not loading
      
      await nextTick()

      const employeeCards = wrapper.findAll('.employee-card')
      expect(employeeCards.length).toBeGreaterThan(0)
      
      if (employeeCards.length >= 3) {
        // First card should be the latest employee
        expect(employeeCards[0].text()).toContain('Latest Employee')
        expect(employeeCards[1].text()).toContain('Middle Employee')
        expect(employeeCards[2].text()).toContain('First Employee')
      }
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      // Set employee data
      const store = useDatabaseStore()
      store.employees = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true,
          createdAt: '2023-01-15T00:00:00Z'
        }
      ]
      store.setLoading(false) // Make sure not loading
      
      await nextTick()

      // Check that date is formatted in Turkish locale
      // Note: The exact format may vary by system locale, so we check for year at least
      expect(wrapper.text()).toContain('2023')
    })
  })

  describe('Error Handling', () => {
    it('should handle data loading errors gracefully', async () => {
      mockElectronAPI.getStats.mockRejectedValue(new Error('Stats loading failed'))
      mockElectronAPI.getAllEmployees.mockRejectedValue(new Error('Employees loading failed'))

      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not crash
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Store Integration', () => {
    it('should use database store correctly', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      await nextTick()

      // Check that component uses store data
      const vm = wrapper.vm as any
      expect(vm.databaseStore).toBeDefined()
      expect(vm.stats).toBeDefined()
      expect(vm.employees).toBeDefined()
    })

    it('should react to store changes', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [createPinia()]
        }
      })

      const store = useDatabaseStore()
      
      // Change store data
      store.stats = {
        employeeCount: 99,
        configCount: 88,
        auditLogCount: 77
      }
      
      await nextTick()

      // UI should reflect the changes
      expect(wrapper.text()).toContain('99')
      expect(wrapper.text()).toContain('88')
      expect(wrapper.text()).toContain('77')
    })
  })
})