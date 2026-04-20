import { useState, useEffect } from 'react'

/**
 * Hook pour détecter les media queries
 * Utile pour les layouts responsifs
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    
    // Définir la valeur initiale
    setMatches(mediaQuery.matches)

    // Listener pour les changements
    const handler = (e) => setMatches(e.matches)
    
    // Utiliser addEventListener (meilleure compatibilité)
    mediaQuery.addEventListener('change', handler)
    
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

/**
 * Hook pour détecter les breakpoints Tailwind
 * Exemples:
 * - isMobile = useBreakpoint('sm')  // < 640px
 * - isTablet = useBreakpoint('md')  // < 768px
 * - isDesktop = useBreakpoint('lg') // < 1024px
 */
export const useBreakpoint = (breakpoint) => {
  const breakpoints = {
    xs: '(max-width: 639px)',    // < 640px (mobile)
    sm: '(max-width: 767px)',    // < 768px (petit mobile)
    md: '(max-width: 1023px)',   // < 1024px (tablette)
    lg: '(max-width: 1279px)',   // < 1280px (petit desktop)
    xl: '(max-width: 1535px)',   // < 1536px (desktop)
  }

  const query = breakpoints[breakpoint]
  if (!query) {
    console.warn(`Breakpoint "${breakpoint}" non reconnu`)
    return false
  }

  return useMediaQuery(query)
}

/**
 * Hook qui retourne true si l'écran est mobile (< 768px)
 */
export const useIsMobile = () => useBreakpoint('sm')

/**
 * Hook qui retourne true si l'écran est tablette (768px - 1024px)
 */
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)')

/**
 * Hook qui retourne true si l'écran est desktop (≥ 1024px)
 */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
