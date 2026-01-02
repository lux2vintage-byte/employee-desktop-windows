import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface LayoutConfig {
  sidebarWidth: number
  contentPadding: number
  gridColumns: number
  cardMinWidth: number
  showSidebar: boolean
  showDetailsPanel: boolean
}

export interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
}

export function useResponsiveLayout(breakpoints: BreakpointConfig = defaultBreakpoints) {
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

  const updateDimensions = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  onMounted(() => {
    window.addEventListener('resize', updateDimensions)
    updateDimensions()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateDimensions)
  })

  const currentBreakpoint = computed(() => {
    const width = windowWidth.value
    if (width < breakpoints.sm) return 'xs'
    if (width < breakpoints.md) return 'sm'
    if (width < breakpoints.lg) return 'md'
    if (width < breakpoints.xl) return 'lg'
    return 'xl'
  })

  const isMobile = computed(() => windowWidth.value < breakpoints.md)
  const isTablet = computed(() => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg)
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg)
  const isLargeDesktop = computed(() => windowWidth.value >= breakpoints.xl)

  const calculateOptimalLayout = computed((): LayoutConfig => {
    const width = windowWidth.value
    
    if (width < breakpoints.sm) {
      return {
        sidebarWidth: 0,
        contentPadding: 8,
        gridColumns: 1,
        cardMinWidth: width - 16,
        showSidebar: false,
        showDetailsPanel: false
      }
    }
    
    if (width < breakpoints.md) {
      return {
        sidebarWidth: 0,
        contentPadding: 12,
        gridColumns: 1,
        cardMinWidth: width - 24,
        showSidebar: false,
        showDetailsPanel: false
      }
    }
    
    if (width < breakpoints.lg) {
      return {
        sidebarWidth: 200,
        contentPadding: 16,
        gridColumns: 2,
        cardMinWidth: 280,
        showSidebar: true,
        showDetailsPanel: false
      }
    }
    
    if (width < breakpoints.xl) {
      return {
        sidebarWidth: 240,
        contentPadding: 20,
        gridColumns: 3,
        cardMinWidth: 300,
        showSidebar: true,
        showDetailsPanel: true
      }
    }
    
    return {
      sidebarWidth: 280,
      contentPadding: 24,
      gridColumns: 4,
      cardMinWidth: 320,
      showSidebar: true,
      showDetailsPanel: true
    }
  })

  const adjustSidebarWidth = (availableWidth: number): number => {
    if (availableWidth < breakpoints.md) return 0
    if (availableWidth < breakpoints.lg) return Math.min(200, availableWidth * 0.25)
    if (availableWidth < breakpoints.xl) return Math.min(240, availableWidth * 0.2)
    return Math.min(280, availableWidth * 0.18)
  }

  const determineGridColumns = (containerWidth: number): number => {
    const minCardWidth = 280
    const gap = 16
    const columns = Math.floor((containerWidth + gap) / (minCardWidth + gap))
    return Math.max(1, Math.min(columns, 6))
  }

  return {
    windowWidth,
    windowHeight,
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    calculateOptimalLayout,
    adjustSidebarWidth,
    determineGridColumns
  }
}
