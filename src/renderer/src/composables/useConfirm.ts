import { reactive } from 'vue'

interface ConfirmState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  type: 'danger' | 'warning' | 'info' | 'success'
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Onayla',
  cancelText: 'İptal',
  type: 'info',
  resolve: null
})

export function useConfirm() {
  const confirm = (options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info' | 'success'
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      state.title = options.title
      state.message = options.message
      state.confirmText = options.confirmText || 'Onayla'
      state.cancelText = options.cancelText || 'İptal'
      state.type = options.type || 'info'
      state.resolve = resolve
      state.isOpen = true
    })
  }

  const handleConfirm = () => {
    state.isOpen = false
    if (state.resolve) {
      state.resolve(true)
      state.resolve = null
    }
  }

  const handleCancel = () => {
    state.isOpen = false
    if (state.resolve) {
      state.resolve(false)
      state.resolve = null
    }
  }

  return {
    state,
    confirm,
    handleConfirm,
    handleCancel
  }
}
