import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStore } from '../database'
import type { DatabaseOperation } from '../database'

// Mock window.electronAPI
const mockElectronAPI = {
  healthCheck: vi.fn(),
  databaseOperation: vi.fn(),
  getStats: vi.fn(),
  getAllEmployees: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('Database Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useDatabaseStore()
      
      expect(store.isConnected).toBe(false)
      expect(store.stats).toEqual({
        employeeCount: 0,
        configCount: 0,
        auditLogCount: 0
      })
      expect(store.employees).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.lastError).toBe(null)
      expect(store.activeEmployees).toEqual([])
      expect(store.activeEmployeeCount).toBe(0)
      expect(store.hasData).toBe(false)
    })
  })

  describe('Basic Actions', () => {
    it('should set loading state', () => {
      const store = useDatabaseStore()
      
      store.setLoading(true)
      expect(store.isLoading).toBe(true)
      
      store.setLoading(false)
      expect(store.isLoading).toBe(false)
    })

    it('should set and clear error', () => {
      const store = useDatabaseStore()
      
      store.setError('Test error')
      expect(store.lastError).toBe('Test error')
      
      store.clearError()
      expect(store.lastError).toBe(null)
    })

    it('should reset store', () => {
      const store = useDatabaseStore()
      
      // Set some state
      store.isConnected = true
      store.stats = { employeeCount: 5, configCount: 3, auditLogCount: 10 }
      store.employees = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true,
          createdAt: '2023-01-01'
        }
      ]
      store.setLoading(true)
      store.setError('Test error')
      
      // Reset
      store.reset()
      
      expect(store.isConnected).toBe(false)
      expect(store.stats).toEqual({
        employeeCount: 0,
        configCount: 0,
        auditLogCount: 0
      })
      expect(store.employees).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.lastError).toBe(null)
    })
  })

  describe('Connection Management', () => {
    it('should check connection successfully', async () => {
      const store = useDatabaseStore()
      mockElectronAPI.healthCheck.mockResolvedValue(true)
      
      const result = await store.checkConnection()
      
      expect(result).toBe(true)
      expect(store.isConnected).toBe(true)
      expect(mockElectronAPI.healthCheck).toHaveBeenCalled()
    })

    it('should handle connection check failure', async () => {
      const store = useDatabaseStore()
      mockElectronAPI.healthCheck.mockResolvedValue(false)
      
      const result = await store.checkConnection()
      
      expect(result).toBe(false)
      expect(store.isConnected).toBe(false)
    })

    it('should handle connection check error', async () => {
      const store = useDatabaseStore()
      mockElectronAPI.healthCheck.mockRejectedValue(new Error('Connection error'))
      
      const result = await store.checkConnection()
      
      expect(result).toBe(false)
      expect(store.isConnected).toBe(false)
      expect(store.lastError).toContain('bağlantı kontrolü başarısız')
    })

    it('should handle missing electronAPI', async () => {
      const store = useDatabaseStore()
      
      // Temporarily set electronAPI to undefined
      const originalAPI = window.electronAPI
      ;(window as any).electronAPI = undefined
      
      const result = await store.checkConnection()
      
      expect(result).toBe(false)
      expect(store.isConnected).toBe(false)
      
      // Restore electronAPI
      window.electronAPI = originalAPI
    })
  })

  describe('Database Operations', () => {
    it('should execute query successfully', async () => {
      const store = useDatabaseStore()
      const mockResult = [{ id: 1, name: 'Test' }]
      mockElectronAPI.databaseOperation.mockResolvedValue(mockResult)
      
      const result = await store.query('SELECT * FROM test')
      
      expect(result).toEqual(mockResult)
      expect(mockElectronAPI.databaseOperation).toHaveBeenCalledWith({
        type: 'SELECT',
        table: 'custom',
        data: { sql: 'SELECT * FROM test', params: undefined }
      })
    })

    it('should execute insert successfully', async () => {
      const store = useDatabaseStore()
      const mockResult = { insertId: 123 }
      mockElectronAPI.databaseOperation.mockResolvedValue(mockResult)
      
      const result = await store.insert('users', { name: 'John', email: 'john@example.com' })
      
      expect(result).toBe(123)
      expect(mockElectronAPI.databaseOperation).toHaveBeenCalledWith({
        type: 'INSERT',
        table: 'users',
        data: { name: 'John', email: 'john@example.com' }
      })
    })

    it('should execute update successfully', async () => {
      const store = useDatabaseStore()
      const mockResult = { changes: 1 }
      mockElectronAPI.databaseOperation.mockResolvedValue(mockResult)
      
      const result = await store.update('users', { name: 'Jane' }, 'id = 1')
      
      expect(result).toBe(true)
      expect(mockElectronAPI.databaseOperation).toHaveBeenCalledWith({
        type: 'UPDATE',
        table: 'users',
        data: { name: 'Jane' },
        where: 'id = 1'
      })
    })

    it('should execute delete successfully', async () => {
      const store = useDatabaseStore()
      const mockResult = { changes: 1 }
      mockElectronAPI.databaseOperation.mockResolvedValue(mockResult)
      
      const result = await store.deleteRecord('users', 'id = 1')
      
      expect(result).toBe(true)
      expect(mockElectronAPI.databaseOperation).toHaveBeenCalledWith({
        type: 'DELETE',
        table: 'users',
        where: 'id = 1'
      })
    })

    it('should handle database operation errors', async () => {
      const store = useDatabaseStore()
      mockElectronAPI.databaseOperation.mockRejectedValue(new Error('Database error'))
      
      await expect(store.query('SELECT * FROM test')).rejects.toThrow('Database error')
      expect(store.lastError).toContain('Database error')
    })
  })

  describe('Data Loading', () => {
    it('should load stats successfully', async () => {
      const store = useDatabaseStore()
      const mockStats = {
        employeeCount: 10,
        configCount: 5,
        auditLogCount: 25
      }
      mockElectronAPI.getStats.mockResolvedValue(mockStats)
      
      await store.loadStats()
      
      expect(store.stats).toEqual(mockStats)
      expect(store.isLoading).toBe(false)
      expect(store.lastError).toBe(null)
    })

    it('should load employees successfully', async () => {
      const store = useDatabaseStore()
      const mockEmployees = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true,
          createdAt: '2023-01-01'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          position: 'Designer',
          department: 'Design',
          isActive: false,
          createdAt: '2023-01-02'
        }
      ]
      mockElectronAPI.getAllEmployees.mockResolvedValue(mockEmployees)
      
      await store.loadEmployees()
      
      expect(store.employees).toEqual(mockEmployees)
      expect(store.activeEmployees).toEqual([mockEmployees[0]])
      expect(store.activeEmployeeCount).toBe(1)
      expect(store.hasData).toBe(true)
      expect(store.isLoading).toBe(false)
    })

    it('should handle loading errors', async () => {
      const store = useDatabaseStore()
      mockElectronAPI.getStats.mockRejectedValue(new Error('Loading error'))
      
      await store.loadStats()
      
      expect(store.lastError).toContain('Loading error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Employee Management', () => {
    it('should add employee successfully', async () => {
      const store = useDatabaseStore()
      const newEmployee = {
        firstName: 'New',
        lastName: 'Employee',
        email: 'new@example.com',
        position: 'Tester',
        department: 'QA',
        isActive: true
      }
      
      // Mock insert operation
      mockElectronAPI.databaseOperation.mockResolvedValueOnce({ insertId: 123 })
      
      // Mock loadEmployees call
      mockElectronAPI.getAllEmployees.mockResolvedValue([
        { ...newEmployee, id: 123, createdAt: '2023-01-01' }
      ])
      
      const result = await store.addEmployee(newEmployee)
      
      expect(result).toBe(123)
      expect(mockElectronAPI.getAllEmployees).toHaveBeenCalled()
    })
  })
})