import { ref, computed } from 'vue'

export type PanelType = 'sidebar' | 'main' | 'details' | 'preview'

export interface Panel {
  id: string
  type: PanelType
  title: string
  minWidth: number
  maxWidth?: number
  isVisible: boolean
  isCollapsible: boolean
}

export interface PanelSizes {
  sidebar: number
  main: number
  details?: number
  preview?: number
}

export interface DisplayOptimization {
  visiblePanels: Panel[]
  totalWidth: number
  hasOverflow: boolean
  scrollRequired: boolean
}

const LARGE_SCREEN_THRESHOLD = 1200

export function useMultiPanelDisplay() {
  const panels = ref<Panel[]>([
    { id: 'sidebar', type: 'sidebar', title: 'Menü', minWidth: 200, maxWidth: 300, isVisible: true, isCollapsible: true },
    { id: 'main', type: 'main', title: 'Ana İçerik', minWidth: 400, isVisible: true, isCollapsible: false },
    { id: 'details', type: 'details', title: 'Detaylar', minWidth: 300, maxWidth: 400, isVisible: false, isCollapsible: true }
  ])

  const availableWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

  const isLargeScreen = computed(() => availableWidth.value >= LARGE_SCREEN_THRESHOLD)

  const calculatePanelSizes = (width: number): PanelSizes => {
    const sizes: PanelSizes = {
      sidebar: 0,
      main: width
    }

    if (width < 768) {
      // Mobil: Sadece ana panel
      sizes.sidebar = 0
      sizes.main = width
      return sizes
    }

    if (width < 1024) {
      // Tablet: Sidebar + Ana panel
      sizes.sidebar = 200
      sizes.main = width - 200
      return sizes
    }

    if (width < LARGE_SCREEN_THRESHOLD) {
      // Küçük masaüstü: Sidebar + Ana panel
      sizes.sidebar = 240
      sizes.main = width - 240
      return sizes
    }

    // Büyük ekran: Sidebar + Ana panel + Detay paneli
    sizes.sidebar = 260
    sizes.details = 320
    sizes.main = width - sizes.sidebar - sizes.details
    return sizes
  }

  const shouldShowPanel = (panelType: PanelType, screenWidth: number): boolean => {
    switch (panelType) {
      case 'sidebar':
        return screenWidth >= 768
      case 'main':
        return true
      case 'details':
        return screenWidth >= LARGE_SCREEN_THRESHOLD
      case 'preview':
        return screenWidth >= 1400
      default:
        return false
    }
  }

  const optimizeContentDisplay = (panelList: Panel[]): DisplayOptimization => {
    const width = availableWidth.value
    const visiblePanels = panelList.filter(p => shouldShowPanel(p.type, width))
    const totalMinWidth = visiblePanels.reduce((sum, p) => sum + p.minWidth, 0)
    
    return {
      visiblePanels,
      totalWidth: width,
      hasOverflow: totalMinWidth > width,
      scrollRequired: totalMinWidth > width
    }
  }

  const togglePanel = (panelId: string) => {
    const panel = panels.value.find(p => p.id === panelId)
    if (panel && panel.isCollapsible) {
      panel.isVisible = !panel.isVisible
    }
  }

  const showPanel = (panelId: string) => {
    const panel = panels.value.find(p => p.id === panelId)
    if (panel) {
      panel.isVisible = true
    }
  }

  const hidePanel = (panelId: string) => {
    const panel = panels.value.find(p => p.id === panelId)
    if (panel && panel.isCollapsible) {
      panel.isVisible = false
    }
  }

  const updateAvailableWidth = (width: number) => {
    availableWidth.value = width
    
    // Ekran boyutuna göre panelleri otomatik göster/gizle
    panels.value.forEach(panel => {
      if (panel.isCollapsible) {
        panel.isVisible = shouldShowPanel(panel.type, width)
      }
    })
  }

  const visiblePanels = computed(() => {
    return panels.value.filter(p => p.isVisible)
  })

  const panelSizes = computed(() => {
    return calculatePanelSizes(availableWidth.value)
  })

  return {
    panels,
    availableWidth,
    isLargeScreen,
    calculatePanelSizes,
    shouldShowPanel,
    optimizeContentDisplay,
    togglePanel,
    showPanel,
    hidePanel,
    updateAvailableWidth,
    visiblePanels,
    panelSizes
  }
}
