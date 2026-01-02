import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Types
interface DatabaseOperation {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  data?: Record<string, any>
  where?: string
  params?: any[]
}

interface DatabaseStats {
  employeeCount: number
  configCount: number
  auditLogCount: number
}

interface Employee {
  id: number
  firstName: string
  lastName: string
  email: string
  position: string | null
  department: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

/**
 * Veritabanı işlemleri store'u
 * Electron IPC üzerinden veritabanı işlemlerini yönetir
 */
export const useDatabaseStore = defineStore('database', () => {
  // State
  const isConnected = ref(false)
  const stats = ref<DatabaseStats>({
    employeeCount: 0,
    configCount: 0,
    auditLogCount: 0
  })
  const employees = ref<Employee[]>([])
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  // Computed
  const activeEmployees = computed(() => 
    employees.value.filter(emp => emp.isActive)
  )
  
  const activeEmployeeCount = computed(() => activeEmployees.value.length)
  
  const hasData = computed(() => employees.value.length > 0)

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setError = (error: string | null) => {
    lastError.value = error
  }

  const clearError = () => {
    lastError.value = null
  }

  /**
   * Genel veritabanı sorgu fonksiyonu
   */
  const query = async <T>(sql: string, params?: any[]): Promise<T[]> => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API mevcut değil')
      }

      const operation: DatabaseOperation = {
        type: 'SELECT',
        table: 'custom',
        data: { sql, params }
      }

      const result = await window.electronAPI.databaseOperation(operation)
      return result as T[]
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Veritabanı sorgu hatası'
      setError(errorMessage)
      throw error
    }
  }

  /**
   * Veri ekleme fonksiyonu
   */
  const insert = async (table: string, data: Record<string, any>): Promise<number> => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API mevcut değil')
      }

      const operation: DatabaseOperation = {
        type: 'INSERT',
        table,
        data
      }

      const result = await window.electronAPI.databaseOperation(operation)
      return result.insertId || result.id || 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Veri ekleme hatası'
      setError(errorMessage)
      throw error
    }
  }

  /**
   * Veri güncelleme fonksiyonu
   */
  const update = async (table: string, data: Record<string, any>, where: string): Promise<boolean> => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API mevcut değil')
      }

      const operation: DatabaseOperation = {
        type: 'UPDATE',
        table,
        data,
        where
      }

      const result = await window.electronAPI.databaseOperation(operation)
      return result.changes > 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Veri güncelleme hatası'
      setError(errorMessage)
      throw error
    }
  }

  /**
   * Veri silme fonksiyonu
   */
  const deleteRecord = async (table: string, where: string): Promise<boolean> => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API mevcut değil')
      }

      const operation: DatabaseOperation = {
        type: 'DELETE',
        table,
        where
      }

      const result = await window.electronAPI.databaseOperation(operation)
      return result.changes > 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Veri silme hatası'
      setError(errorMessage)
      throw error
    }
  }

  /**
   * Veritabanı bağlantısını kontrol et
   */
  const checkConnection = async (): Promise<boolean> => {
    try {
      if (!window.electronAPI) {
        isConnected.value = false
        return false
      }

      const healthy = await window.electronAPI.healthCheck()
      isConnected.value = healthy
      return healthy
    } catch (error) {
      isConnected.value = false
      setError('Veritabanı bağlantı kontrolü başarısız')
      return false
    }
  }

  /**
   * İstatistikleri yükle
   */
  const loadStats = async (): Promise<void> => {
    try {
      setLoading(true)
      clearError()

      if (!window.electronAPI) {
        throw new Error('Electron API mevcut değil')
      }

      const result = await window.electronAPI.getStats()
      stats.value = result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'İstatistik yükleme hatası'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Tüm personelleri yükle
   */
  const loadEmployees = async (): Promise<void> => {
    try {
      setLoading(true)
      clearError()

      if (!window.electronAPI) {
        throw new Error('Electron API mevcut değil')
      }

      const result = await window.electronAPI.getAllEmployees()
      employees.value = result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Personel yükleme hatası'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Yeni personel ekle
   */
  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt'>): Promise<number> => {
    try {
      setLoading(true)
      clearError()

      const id = await insert('employees', employeeData)
      
      // Personel listesini yeniden yükle
      await loadEmployees()
      
      return id
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Store'u sıfırla
   */
  const reset = () => {
    isConnected.value = false
    stats.value = {
      employeeCount: 0,
      configCount: 0,
      auditLogCount: 0
    }
    employees.value = []
    isLoading.value = false
    lastError.value = null
  }

  return {
    // State
    isConnected,
    stats,
    employees,
    isLoading,
    lastError,
    
    // Computed
    activeEmployees,
    activeEmployeeCount,
    hasData,
    
    // Actions
    setLoading,
    setError,
    clearError,
    query,
    insert,
    update,
    deleteRecord,
    checkConnection,
    loadStats,
    loadEmployees,
    addEmployee,
    reset
  }
})

// Export types
export type { DatabaseOperation, DatabaseStats, Employee }