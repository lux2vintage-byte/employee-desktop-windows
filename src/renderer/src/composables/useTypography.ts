import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface TypographyConfig {
  baseFontSize: number
  headingScale: number
  lineHeight: number
  letterSpacing: string
}

export interface SpacingConfig {
  unit: number
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
}

export interface ResponsiveTypography {
  h1: string
  h2: string
  h3: string
  h4: string
  body: string
  small: string
  caption: string
}

export interface ResponsiveSpacing {
  containerPadding: string
  sectionGap: string
  cardPadding: string
  inputPadding: string
  buttonPadding: string
}

const defaultTypography: TypographyConfig = {
  baseFontSize: 16,
  headingScale: 1.25,
  lineHeight: 1.5,
  letterSpacing: 'normal'
}

const defaultSpacing: SpacingConfig = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
}

export function useTypography(
  typography: TypographyConfig = defaultTypography,
  spacing: SpacingConfig = defaultSpacing
) {
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

  const updateWidth = () => {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', updateWidth)
    updateWidth()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
  })

  const scaleFactor = computed(() => {
    const width = windowWidth.value
    if (width < 640) return 0.875
    if (width < 768) return 0.9375
    if (width < 1024) return 1
    if (width < 1280) return 1.0625
    return 1.125
  })

  const responsiveBaseFontSize = computed(() => {
    return Math.round(typography.baseFontSize * scaleFactor.value)
  })

  const calculateFontSize = (level: number): number => {
    const scale = typography.headingScale
    return Math.round(responsiveBaseFontSize.value * Math.pow(scale, level))
  }

  const responsiveTypography = computed((): ResponsiveTypography => ({
    h1: `${calculateFontSize(4)}px`,
    h2: `${calculateFontSize(3)}px`,
    h3: `${calculateFontSize(2)}px`,
    h4: `${calculateFontSize(1)}px`,
    body: `${responsiveBaseFontSize.value}px`,
    small: `${Math.round(responsiveBaseFontSize.value * 0.875)}px`,
    caption: `${Math.round(responsiveBaseFontSize.value * 0.75)}px`
  }))

  const responsiveLineHeight = computed(() => {
    const width = windowWidth.value
    if (width < 768) return 1.6
    if (width < 1024) return 1.55
    return typography.lineHeight
  })

  const responsiveSpacing = computed((): ResponsiveSpacing => {
    const factor = scaleFactor.value
    return {
      containerPadding: `${Math.round(spacing.lg * factor)}px`,
      sectionGap: `${Math.round(spacing.xl * factor)}px`,
      cardPadding: `${Math.round(spacing.md * factor)}px`,
      inputPadding: `${Math.round(spacing.sm * factor)}px ${Math.round(spacing.md * factor)}px`,
      buttonPadding: `${Math.round(spacing.sm * factor)}px ${Math.round(spacing.lg * factor)}px`
    }
  })

  const getSpacing = (size: keyof SpacingConfig): string => {
    if (size === 'unit') return `${spacing.unit}px`
    return `${Math.round(spacing[size] * scaleFactor.value)}px`
  }

  const generateCSSVariables = computed(() => ({
    '--font-size-h1': responsiveTypography.value.h1,
    '--font-size-h2': responsiveTypography.value.h2,
    '--font-size-h3': responsiveTypography.value.h3,
    '--font-size-h4': responsiveTypography.value.h4,
    '--font-size-body': responsiveTypography.value.body,
    '--font-size-small': responsiveTypography.value.small,
    '--font-size-caption': responsiveTypography.value.caption,
    '--line-height': responsiveLineHeight.value.toString(),
    '--spacing-xs': getSpacing('xs'),
    '--spacing-sm': getSpacing('sm'),
    '--spacing-md': getSpacing('md'),
    '--spacing-lg': getSpacing('lg'),
    '--spacing-xl': getSpacing('xl'),
    '--spacing-xxl': getSpacing('xxl'),
    '--container-padding': responsiveSpacing.value.containerPadding,
    '--section-gap': responsiveSpacing.value.sectionGap,
    '--card-padding': responsiveSpacing.value.cardPadding
  }))

  const applyCSSVariables = () => {
    const vars = generateCSSVariables.value
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }

  return {
    windowWidth,
    scaleFactor,
    responsiveBaseFontSize,
    responsiveTypography,
    responsiveLineHeight,
    responsiveSpacing,
    getSpacing,
    generateCSSVariables,
    applyCSSVariables
  }
}
