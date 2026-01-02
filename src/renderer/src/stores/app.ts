import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Types
interface User {
  id: number
  name: string
  email: string
  role: string
}

interface AppState {
  isLoading: boolean
  currentUser: User | null
  isInitialized: boolean
  error: string | null
}

/**
 * Ana uygulama store'u
 * Uygulama genelindeki state yönetimi için kullanılır
 */
export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(false)
  const currentUser = ref<User | null>(null)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => currentUser.value !== null)
  const hasError = computed(() => error.value !== null)
  const canProceed = computed(() => isInitialized.value && !isLoading.value)

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  const clearError = () => {
    error.value = null
  }

  const setCurrentUser = (user: User | null) => {
    currentUser.value = user
  }

  const initializeApp = async (): Promise<void> => {
    try {
      setLoading(true)
      clearError()

      // Electron API'sinin mevcut olup olmadığını kontrol et
      if (!window.electronAPI) {
        throw new Error('Electron API mevcut değil')
      }

      // Uygulama sağlık kontrolü
      const isHealthy = await window.electronAPI.healthCheck()
      if (!isHealthy) {
        throw new Error('Uygulama sağlık kontrolü başarısız')
      }

      // Varsayılan kullanıcı ayarla (gerçek uygulamada authentication olacak)
      setCurrentUser({
        id: 1,
        name: 'Test Kullanıcı',
        email: 'test@example.com',
        role: 'admin'
      })

      isInitialized.value = true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setError(`Uygulama başlatma hatası: ${errorMessage}`)
      console.error('App initialization error:', err)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    clearError()
  }

  const reset = () => {
    isLoading.value = false
    currentUser.value = null
    isInitialized.value = false
    error.value = null
  }

  // Return store interface
  return {
    // State
    isLoading,
    currentUser,
    isInitialized,
    error,
    
    // Computed
    isAuthenticated,
    hasError,
    canProceed,
    
    // Actions
    setLoading,
    setError,
    clearError,
    setCurrentUser,
    initializeApp,
    logout,
    reset
  }
})

// Export types for use in components
export type { User, AppState }