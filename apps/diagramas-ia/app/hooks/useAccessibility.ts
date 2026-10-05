/**
 * Hooks para melhorar acessibilidade da aplicação
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

/**
 * Hook para gerenciar foco por teclado
 */
export function useFocusManagement() {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null)
  const focusHistory = useRef<HTMLElement[]>([])

  // Armazenar elemento focado atual
  useEffect(() => {
    const handleFocusChange = () => {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement !== focusedElement) {
        if (focusedElement) {
          focusHistory.current.push(focusedElement)
        }
        setFocusedElement(activeElement)
      }
    }

    document.addEventListener('focusin', handleFocusChange)
    return () => document.removeEventListener('focusin', handleFocusChange)
  }, [focusedElement])

  // Voltar ao foco anterior
  const restorePreviousFocus = useCallback(() => {
    const previousElement = focusHistory.current.pop()
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus()
    }
  }, [])

  // Definir foco em elemento específico
  const setFocus = useCallback((element: HTMLElement | null, options?: FocusOptions) => {
    if (element && document.contains(element)) {
      element.focus(options)
    }
  }, [])

  return {
    focusedElement,
    restorePreviousFocus,
    setFocus
  }
}

/**
 * Hook para navegação por teclado
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    focusableSelector?: string
    loop?: boolean
    direction?: 'horizontal' | 'vertical' | 'both'
  } = {}
) {
  const {
    focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    loop = true,
    direction = 'both'
  } = options

  const [currentIndex, setCurrentIndex] = useState(0)

  // Obter elementos focáveis
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    
    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ) as HTMLElement[]
    
    return elements.filter(el => 
      !el.disabled && 
      el.tabIndex !== -1 && 
      el.offsetParent !== null // Elemento visível
    )
  }, [containerRef, focusableSelector])

  // Navegar para próximo elemento
  const navigateNext = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length === 0) return

    let nextIndex = currentIndex + 1
    if (nextIndex >= elements.length) {
      nextIndex = loop ? 0 : elements.length - 1
    }

    setCurrentIndex(nextIndex)
    elements[nextIndex]?.focus()
  }, [currentIndex, getFocusableElements, loop])

  // Navegar para elemento anterior
  const navigatePrevious = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length === 0) return

    let prevIndex = currentIndex - 1
    if (prevIndex < 0) {
      prevIndex = loop ? elements.length - 1 : 0
    }

    setCurrentIndex(prevIndex)
    elements[prevIndex]?.focus()
  }, [currentIndex, getFocusableElements, loop])

  // Navegar para primeiro elemento
  const navigateFirst = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length === 0) return

    setCurrentIndex(0)
    elements[0]?.focus()
  }, [getFocusableElements])

  // Navegar para último elemento
  const navigateLast = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length === 0) return

    const lastIndex = elements.length - 1
    setCurrentIndex(lastIndex)
    elements[lastIndex]?.focus()
  }, [getFocusableElements])

  // Configurar atalhos de teclado
  useHotkeys('tab', (e) => {
    if (containerRef.current?.contains(e.target as Node)) {
      e.preventDefault()
      if (e.shiftKey) {
        navigatePrevious()
      } else {
        navigateNext()
      }
    }
  }, { enableOnTags: ['INPUT', 'TEXTAREA', 'SELECT'] })

  if (direction === 'vertical' || direction === 'both') {
    useHotkeys('ArrowDown', (e) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        navigateNext()
      }
    })

    useHotkeys('ArrowUp', (e) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        navigatePrevious()
      }
    })
  }

  if (direction === 'horizontal' || direction === 'both') {
    useHotkeys('ArrowRight', (e) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        navigateNext()
      }
    })

    useHotkeys('ArrowLeft', (e) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault()
        navigatePrevious()
      }
    })
  }

  useHotkeys('Home', (e) => {
    if (containerRef.current?.contains(e.target as Node)) {
      e.preventDefault()
      navigateFirst()
    }
  })

  useHotkeys('End', (e) => {
    if (containerRef.current?.contains(e.target as Node)) {
      e.preventDefault()
      navigateLast()
    }
  })

  return {
    currentIndex,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    getFocusableElements
  }
}

/**
 * Hook para anúncios de screen reader
 */
export function useScreenReader() {
  const announceRef = useRef<HTMLDivElement>(null)

  // Anunciar mensagem para screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) {
      // Criar elemento se não existir
      const announcer = document.createElement('div')
      announcer.setAttribute('aria-live', priority)
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `
      document.body.appendChild(announcer)
      announceRef.current = announcer
    }

    // Limpar conteúdo anterior
    announceRef.current.textContent = ''
    
    // Adicionar nova mensagem após um pequeno delay
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = message
      }
    }, 100)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (announceRef.current && document.body.contains(announceRef.current)) {
        document.body.removeChild(announceRef.current)
      }
    }
  }, [])

  return { announce }
}

/**
 * Hook para detectar preferências de acessibilidade do usuário
 */
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersReducedTransparency: false,
    darkMode: false
  })

  useEffect(() => {
    const updatePreferences = () => {
      setPreferences({
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
        prefersReducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
      })
    }

    updatePreferences()

    // Escutar mudanças nas preferências
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
      window.matchMedia('(prefers-color-scheme: dark)')
    ]

    mediaQueries.forEach(mq => mq.addEventListener('change', updatePreferences))

    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener('change', updatePreferences))
    }
  }, [])

  return preferences
}

/**
 * Hook para trap de foco em modais
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean = true
) {
  const firstFocusableRef = useRef<HTMLElement | null>(null)
  const lastFocusableRef = useRef<HTMLElement | null>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const visibleFocusableElements = Array.from(focusableElements).filter(el => 
      !el.disabled && 
      el.tabIndex !== -1 && 
      el.offsetParent !== null
    )

    if (visibleFocusableElements.length === 0) return

    firstFocusableRef.current = visibleFocusableElements[0]
    lastFocusableRef.current = visibleFocusableElements[visibleFocusableElements.length - 1]

    // Salvar elemento ativo anterior
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Focar no primeiro elemento
    firstFocusableRef.current.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault()
          lastFocusableRef.current?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault()
          firstFocusableRef.current?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Restaurar foco anterior
      if (previousActiveElementRef.current && document.contains(previousActiveElementRef.current)) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [isActive, containerRef])
}

/**
 * Hook para labels automáticos de acessibilidade
 */
export function useAccessibleLabel(
  labelText: string,
  description?: string
) {
  const labelId = useRef(`label-${Math.random().toString(36).substr(2, 9)}`)
  const descriptionId = useRef(`desc-${Math.random().toString(36).substr(2, 9)}`)

  const ariaProps = {
    'aria-labelledby': labelId.current,
    ...(description && { 'aria-describedby': descriptionId.current })
  }

  const LabelComponent = ({ children }: { children: React.ReactNode }) => (
    <label id={labelId.current}>
      {children}
    </label>
  )

  const DescriptionComponent = description ? ({ children }: { children: React.ReactNode }) => (
    <div id={descriptionId.current} className="sr-only">
      {children}
    </div>
  ) : null

  return {
    ariaProps,
    LabelComponent,
    DescriptionComponent,
    labelId: labelId.current,
    descriptionId: descriptionId.current
  }
}

/**
 * Hook para gerenciar modo de alto contraste
 */
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const checkHighContrast = () => {
      setIsHighContrast(window.matchMedia('(prefers-contrast: high)').matches)
    }

    checkHighContrast()

    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    mediaQuery.addEventListener('change', checkHighContrast)

    return () => mediaQuery.removeEventListener('change', checkHighContrast)
  }, [])

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast(prev => {
      const newValue = !prev
      document.documentElement.classList.toggle('high-contrast', newValue)
      return newValue
    })
  }, [])

  // Aplicar classe CSS quando necessário
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', isHighContrast)
  }, [isHighContrast])

  return {
    isHighContrast,
    toggleHighContrast
  }
}

/**
 * Hook para detectar e anunciar mudanças de página/rota
 */
export function useRouteAnnouncement() {
  const { announce } = useScreenReader()
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    const handleRouteChange = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        setCurrentPath(newPath)
        
        // Anunciar mudança de página
        const title = document.title
        announce(`Navegou para: ${title}`, 'assertive')
      }
    }

    // Escutar mudanças de rota
    window.addEventListener('popstate', handleRouteChange)
    
    // Verificar mudanças no title
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.target === document.head) {
          const titleElement = document.querySelector('title')
          if (titleElement) {
            announce(`Página carregada: ${titleElement.textContent}`, 'polite')
          }
        }
      })
    })

    observer.observe(document.head, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      observer.disconnect()
    }
  }, [currentPath, announce])
}

/**
 * Hook para skip links
 */
export function useSkipLinks() {
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]')
    if (main) {
      (main as HTMLElement).focus()
      main.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const skipToNav = useCallback(() => {
    const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]')
    if (nav) {
      (nav as HTMLElement).focus()
      nav.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const skipToContent = useCallback((selector: string) => {
    const element = document.querySelector(selector)
    if (element) {
      (element as HTMLElement).focus()
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return {
    skipToMain,
    skipToNav,
    skipToContent
  }
}
