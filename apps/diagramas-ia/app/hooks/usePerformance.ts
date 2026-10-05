/**
 * Hook para monitoramento e otimização de performance
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { debounce, throttle } from '../lib/utils'

interface PerformanceMetrics {
  renderTime: number
  lastUpdate: number
  frameRate: number
  memoryUsage?: number
  interactions: number
}

export function usePerformance(componentName: string = 'Component') {
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    lastUpdate: 0,
    frameRate: 0,
    interactions: 0,
  })
  
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const renderStartTimeRef = useRef(0)

  // Medir tempo de renderização
  const startRender = useCallback(() => {
    renderStartTimeRef.current = performance.now()
  }, [])

  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartTimeRef.current
    metricsRef.current.renderTime = renderTime
    metricsRef.current.lastUpdate = Date.now()

    // Log se renderização demorar muito
    if (renderTime > 16) { // 16ms = 60fps
      console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms`)
    }
  }, [componentName])

  // Monitorar FPS
  const measureFPS = useCallback(() => {
    const now = performance.now()
    const delta = now - lastFrameTimeRef.current
    
    if (delta >= 1000) { // Medir a cada segundo
      const fps = Math.round((frameCountRef.current * 1000) / delta)
      metricsRef.current.frameRate = fps
      frameCountRef.current = 0
      lastFrameTimeRef.current = now
      
      // Alertar sobre baixo FPS
      if (fps < 30) {
        console.warn(`Low FPS detected: ${fps}fps in ${componentName}`)
      }
    }
    
    frameCountRef.current++
    requestAnimationFrame(measureFPS)
  }, [componentName])

  // Monitorar uso de memória
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      metricsRef.current.memoryUsage = memory.usedJSHeapSize
      
      // Alertar sobre alto uso de memória (>100MB)
      if (memory.usedJSHeapSize > 100 * 1024 * 1024) {
        console.warn(`High memory usage: ${(memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)}MB`)
      }
    }
  }, [])

  // Contar interações do usuário
  const trackInteraction = useCallback(() => {
    metricsRef.current.interactions++
  }, [])

  // Inicializar monitoramento
  useEffect(() => {
    const fpsAnimation = requestAnimationFrame(measureFPS)
    const memoryInterval = setInterval(measureMemory, 5000) // A cada 5 segundos

    return () => {
      cancelAnimationFrame(fpsAnimation)
      clearInterval(memoryInterval)
    }
  }, [measureFPS, measureMemory])

  // Gerar relatório de performance
  const getReport = useCallback(() => {
    const metrics = metricsRef.current
    return {
      componentName,
      ...metrics,
      memoryUsageMB: metrics.memoryUsage ? (metrics.memoryUsage / (1024 * 1024)).toFixed(2) : 'N/A',
      performance: {
        render: metrics.renderTime < 16 ? 'good' : metrics.renderTime < 33 ? 'fair' : 'poor',
        fps: metrics.frameRate >= 60 ? 'excellent' : metrics.frameRate >= 30 ? 'good' : 'poor',
        memory: typeof metrics.memoryUsage === 'number' && metrics.memoryUsage > 100 * 1024 * 1024 ? 'high' : 'normal'
      }
    }
  }, [componentName])

  return {
    startRender,
    endRender,
    trackInteraction,
    getReport,
    metrics: metricsRef.current
  }
}

/**
 * Hook para lazy loading de componentes
 */
export function useLazyComponent<T>(
  importFunction: () => Promise<{ default: T }>,
  deps: any[] = []
) {
  const [Component, setComponent] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    importFunction()
      .then((module) => {
        if (mounted) {
          setComponent(() => module.default)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, deps)

  return { Component, loading, error }
}

/**
 * Hook para otimização de re-renderizações
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[],
  delay: number = 0
): T {
  const optimizedCallback = useMemo(() => {
    if (delay > 0) {
      return debounce(callback, delay) as T
    }
    return callback
  }, [callback, delay, ...deps])

  return useCallback(optimizedCallback, deps)
}

/**
 * Hook para throttling de eventos
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: any[]
): T {
  const throttledCallback = useMemo(() => {
    return throttle(callback, limit) as T
  }, [callback, limit, ...deps])

  return useCallback(throttledCallback, deps)
}

/**
 * Hook para detectar dispositivos de baixo desempenho
 */
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    isLowEnd: false,
    isMobile: false,
    hasGoodConnection: true,
    supportsBetterExperience: true
  })

  useEffect(() => {
    const checkCapabilities = () => {
      // Detectar dispositivo mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // Detectar dispositivo de baixo desempenho
      let isLowEnd = false
      if ('deviceMemory' in navigator) {
        isLowEnd = (navigator as any).deviceMemory < 4 // Menos de 4GB RAM
      }
      
      // Verificar cores de CPU (aproximação)
      if ('hardwareConcurrency' in navigator) {
        isLowEnd = isLowEnd || navigator.hardwareConcurrency < 4
      }

      // Verificar qualidade da conexão
      let hasGoodConnection = true
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        hasGoodConnection = connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g'
      }

      const supportsBetterExperience = !isLowEnd && hasGoodConnection

      setCapabilities({
        isLowEnd,
        isMobile,
        hasGoodConnection,
        supportsBetterExperience
      })
    }

    checkCapabilities()
  }, [])

  return capabilities
}

/**
 * Hook para observação de intersecção otimizada
 */
export function useOptimizedIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {},
  freezeOnceVisible: boolean = false
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()
  const [isVisible, setIsVisible] = useState(false)

  const frozen = freezeOnceVisible && isVisible

  const updateEntry = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    setEntry(entry)
    setIsVisible(entry.isIntersecting)
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node || frozen) return

    const observer = new IntersectionObserver(updateEntry, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [ref, options, frozen, updateEntry])

  return { entry, isVisible }
}

/**
 * Hook para memoização avançada com TTL
 */
export function useMemoWithTTL<T>(
  factory: () => T,
  deps: any[],
  ttl: number = 5000
): T {
  const cache = useRef<{
    value: T
    timestamp: number
    deps: any[]
  } | null>(null)

  return useMemo(() => {
    const now = Date.now()
    
    // Verificar se cache é válido
    if (
      cache.current &&
      now - cache.current.timestamp < ttl &&
      cache.current.deps.length === deps.length &&
      cache.current.deps.every((dep, index) => dep === deps[index])
    ) {
      return cache.current.value
    }

    // Calcular novo valor
    const value = factory()
    cache.current = {
      value,
      timestamp: now,
      deps: [...deps]
    }

    return value
  }, deps)
}

/**
 * Hook para preload de recursos
 */
export function usePreloadResources(resources: string[]) {
  useEffect(() => {
    const preloadedResources: HTMLLinkElement[] = []

    resources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      
      if (resource.endsWith('.js')) {
        link.as = 'script'
      } else if (resource.endsWith('.css')) {
        link.as = 'style'
      } else if (resource.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        link.as = 'image'
      } else if (resource.match(/\.(woff|woff2|ttf|otf)$/)) {
        link.as = 'font'
        link.crossOrigin = 'anonymous'
      }
      
      link.href = resource
      document.head.appendChild(link)
      preloadedResources.push(link)
    })

    return () => {
      preloadedResources.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [resources])
}

/**
 * Hook para otimização de scroll
 */
export function useOptimizedScroll(callback: (scrollTop: number) => void, throttleMs: number = 16) {
  const throttledCallback = useThrottledCallback(callback, throttleMs, [callback])

  useEffect(() => {
    const handleScroll = () => {
      throttledCallback(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [throttledCallback])
}

/**
 * Hook para monitoramento de performance de componentes React
 */
export function useReactPerformance(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(Date.now())

  useEffect(() => {
    renderCount.current++
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    
    if (timeSinceLastRender < 16 && renderCount.current > 1) {
      console.warn(`${componentName} is re-rendering too frequently (${timeSinceLastRender}ms since last render)`)
    }
    
    lastRenderTime.current = now
  })

  return {
    renderCount: renderCount.current,
    logRenderCause: (reason: string) => {
      console.log(`${componentName} rendered due to: ${reason}`)
    }
  }
}
