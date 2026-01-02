import { ref, onMounted, onUnmounted } from 'vue'

export interface ShortcutDefinition {
  key: string
  modifiers: string[]
  action: string
  description: string
  callback: () => void
}

export interface ShortcutRegistry {
  shortcuts: Map<string, ShortcutDefinition>
  register: (shortcut: ShortcutDefinition) => boolean
  unregister: (action: string) => boolean
  getAll: () => ShortcutDefinition[]
  hasConflict: (key: string, modifiers: string[]) => boolean
}

function createShortcutKey(key: string, modifiers: string[]): string {
  const sortedModifiers = [...modifiers].sort()
  return `${sortedModifiers.join('+')}+${key}`.toLowerCase()
}

export function useKeyboardShortcuts() {
  const shortcuts = ref<Map<string, ShortcutDefinition>>(new Map())
  const isEnabled = ref(true)

  const hasConflict = (key: string, modifiers: string[]): boolean => {
    const shortcutKey = createShortcutKey(key, modifiers)
    return shortcuts.value.has(shortcutKey)
  }

  const register = (shortcut: ShortcutDefinition): boolean => {
    const shortcutKey = createShortcutKey(shortcut.key, shortcut.modifiers)
    
    if (shortcuts.value.has(shortcutKey)) {
      console.warn(`Klavye kısayolu çakışması: ${shortcutKey}`)
      return false
    }
    
    shortcuts.value.set(shortcutKey, shortcut)
    return true
  }

  const unregister = (action: string): boolean => {
    for (const [key, shortcut] of shortcuts.value.entries()) {
      if (shortcut.action === action) {
        shortcuts.value.delete(key)
        return true
      }
    }
    return false
  }

  const getAll = (): ShortcutDefinition[] => {
    return Array.from(shortcuts.value.values())
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value) return
    
    const modifiers: string[] = []
    if (event.ctrlKey) modifiers.push('ctrl')
    if (event.altKey) modifiers.push('alt')
    if (event.shiftKey) modifiers.push('shift')
    if (event.metaKey) modifiers.push('meta')
    
    const shortcutKey = createShortcutKey(event.key, modifiers)
    const shortcut = shortcuts.value.get(shortcutKey)
    
    if (shortcut) {
      event.preventDefault()
      shortcut.callback()
    }
  }

  const enable = () => { isEnabled.value = true }
  const disable = () => { isEnabled.value = false }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  // Varsayılan kısayolları kaydet
  const registerDefaultShortcuts = (callbacks: {
    save?: () => void
    newItem?: () => void
    search?: () => void
    refresh?: () => void
    help?: () => void
  }) => {
    if (callbacks.save) {
      register({
        key: 's',
        modifiers: ['ctrl'],
        action: 'save',
        description: 'Kaydet',
        callback: callbacks.save
      })
    }
    
    if (callbacks.newItem) {
      register({
        key: 'n',
        modifiers: ['ctrl'],
        action: 'new',
        description: 'Yeni Öğe',
        callback: callbacks.newItem
      })
    }
    
    if (callbacks.search) {
      register({
        key: 'f',
        modifiers: ['ctrl'],
        action: 'search',
        description: 'Ara',
        callback: callbacks.search
      })
    }
    
    if (callbacks.refresh) {
      register({
        key: 'r',
        modifiers: ['ctrl'],
        action: 'refresh',
        description: 'Yenile',
        callback: callbacks.refresh
      })
    }
    
    if (callbacks.help) {
      register({
        key: 'F1',
        modifiers: [],
        action: 'help',
        description: 'Yardım',
        callback: callbacks.help
      })
    }
  }

  return {
    shortcuts,
    isEnabled,
    register,
    unregister,
    getAll,
    hasConflict,
    enable,
    disable,
    registerDefaultShortcuts
  }
}
