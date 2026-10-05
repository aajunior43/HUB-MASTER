'use client'

import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { useIntersectionObserver } from 'react-intersection-observer'
import { Node, Edge } from '@xyflow/react'

export interface RenderOptimizationOptions {
  enableVirtualization?: boolean
  chunkSize?: number
  renderThreshold?: number
  enableLazyLoading?: boolean
  enableMemoization?: boolean
  performanceMode?: 'auto' | 'performance' | 'quality'
}

export interface ViewportState {
  x: number
  y: number
  zoom: number
  width: number
  height: number
}

export interface PerformanceStats {
  visibleNodes: number
  visibleEdges: number
  renderTime: number
  frameRate: number
  memoryUsage: number
  isOptimized: boolean
}

const DEFAULT_OPTIONS: Required<RenderOptimizationOptions> = {
  enableVirtualization: true,
  chunkSize: 50,
  renderThreshold: 100,
  enableLazyLoading: true,
  enableMemoization: true,
  performanceMode: 'auto'
}

export function useRenderOptimization(
  nodes: Node[],
  edges: Edge[],
  options: RenderOptimizationOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    zoom: 1,
    width: 0,
    height: 0
  })
  
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    visibleNodes: 0,
    visibleEdges: 0,
    renderTime: 0,
    frameRate: 60,
    memoryUsage: 0,
    isOptimized: false
  })

  const frameTimeRef = useRef<number[]>([])
  const renderStartRef = useRef<number>(0)
  const lastRenderRef = useRef<number>(0)

  // Detectar se está em dispositivo com baixa performance
  const isLowPerformanceDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    
    // Detectar baseado no hardware disponível
    const navigator = window.navigator as any
    const hardwareConcurrency = navigator.hardwareConcurrency || 2
    const deviceMemory = navigator.deviceMemory || 2
    
    // Considerar baixa performance se:
    // - Menos de 4 cores de CPU
    // - Menos de 4GB de RAM
    // - Connection lenta
    return hardwareConcurrency < 4 || deviceMemory < 4
  }, [])

  // Determinar modo de performance baseado nas condições
  const effectivePerformanceMode = useMemo(() => {
    if (opts.performanceMode !== 'auto') return opts.performanceMode
    
    if (isLowPerformanceDevice || nodes.length > opts.renderThreshold) {
      return 'performance'
    }
    
    return 'quality'
  }, [opts.performanceMode, isLowPerformanceDevice, nodes.length, opts.renderThreshold])

  // Calcular quais nós estão visíveis no viewport
  const visibleNodes = useMemo(() => {
    if (!opts.enableVirtualization || effectivePerformanceMode === 'quality') {
      return nodes
    }

    const buffer = 200 // Buffer ao redor do viewport
    const viewportBounds = {
      left: viewport.x - buffer,
      right: viewport.x + viewport.width + buffer,
      top: viewport.y - buffer,
      bottom: viewport.y + viewport.height + buffer
    }

    return nodes.filter(node => {
      const nodeX = node.position.x
      const nodeY = node.position.y
      const nodeWidth = 150 // Tamanho padrão do nó
      const nodeHeight = 50

      return (
        nodeX + nodeWidth >= viewportBounds.left &&
        nodeX <= viewportBounds.right &&
        nodeY + nodeHeight >= viewportBounds.top &&
        nodeY <= viewportBounds.bottom
      )
    })
  }, [nodes, viewport, opts.enableVirtualization, effectivePerformanceMode])

  // Calcular quais edges estão visíveis
  const visibleEdges = useMemo(() => {
    if (!opts.enableVirtualization || effectivePerformanceMode === 'quality') {
      return edges
    }

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
    
    return edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )
  }, [edges, visibleNodes, opts.enableVirtualization, effectivePerformanceMode])

  // Chunking para renderização em lotes
  const nodeChunks = useMemo(() => {
    if (!opts.enableVirtualization || visibleNodes.length <= opts.chunkSize) {
      return [visibleNodes]
    }

    const chunks: Node[][] = []
    for (let i = 0; i < visibleNodes.length; i += opts.chunkSize) {
      chunks.push(visibleNodes.slice(i, i + opts.chunkSize))
    }
    return chunks
  }, [visibleNodes, opts.enableVirtualization, opts.chunkSize])

  // Memoização de nós complexos
  const memoizedNodes = useMemo(() => {
    if (!opts.enableMemoization) return visibleNodes

    return visibleNodes.map(node => {
      // Simplificar nós quando em modo performance
      if (effectivePerformanceMode === 'performance') {
        return {
          ...node,
          data: {
            ...node.data,
            // Simplificar labels muito longos
            label: node.data.label?.length > 20 
              ? node.data.label.substring(0, 20) + '...'
              : node.data.label
          },
          // Remover estilos complexos em modo performance
          style: effectivePerformanceMode === 'performance' 
            ? { ...node.style, boxShadow: 'none', borderRadius: '4px' }
            : node.style
        }
      }
      return node
    })
  }, [visibleNodes, opts.enableMemoization, effectivePerformanceMode])

  // Memoização de edges
  const memoizedEdges = useMemo(() => {
    if (!opts.enableMemoization) return visibleEdges

    return visibleEdges.map(edge => {
      // Desabilitar animações em modo performance
      if (effectivePerformanceMode === 'performance') {
        return {
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            strokeWidth: 2 // Reduzir largura da linha
          }
        }
      }
      return edge
    })
  }, [visibleEdges, opts.enableMemoization, effectivePerformanceMode])

  // Callback para início de render
  const startRender = useCallback(() => {
    renderStartRef.current = performance.now()
  }, [])

  // Callback para fim de render
  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartRef.current
    
    // Calcular FPS
    const now = performance.now()
    frameTimeRef.current.push(now)
    
    // Manter apenas os últimos 60 frames
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift()
    }
    
    // Calcular FPS baseado nos últimos frames
    let fps = 60
    if (frameTimeRef.current.length > 1) {
      const totalTime = frameTimeRef.current[frameTimeRef.current.length - 1] - frameTimeRef.current[0]
      fps = Math.round((frameTimeRef.current.length - 1) * 1000 / totalTime)
    }

    setPerformanceStats(prev => ({
      ...prev,
      visibleNodes: visibleNodes.length,
      visibleEdges: visibleEdges.length,
      renderTime,
      frameRate: fps,
      isOptimized: effectivePerformanceMode === 'performance'
    }))

    lastRenderRef.current = now
  }, [visibleNodes.length, visibleEdges.length, effectivePerformanceMode])

  // Atualizar viewport
  const updateViewport = useCallback((newViewport: Partial<ViewportState>) => {
    setViewport(prev => ({ ...prev, ...newViewport }))
  }, [])

  // Throttle para atualizações de viewport
  const throttledUpdateViewport = useCallback(
    throttle(updateViewport, 16), // ~60fps
    [updateViewport]
  )

  // Hook para lazy loading de imagens/recursos
  const useLazyElement = () => {
    const { ref, inView } = useIntersectionObserver({
      threshold: 0.1,
      triggerOnce: true,
      skip: !opts.enableLazyLoading
    })

    return { ref, shouldLoad: inView || !opts.enableLazyLoading }
  }

  // Otimizações automáticas baseadas na performance
  useEffect(() => {
    if (performanceStats.frameRate < 30 && effectivePerformanceMode !== 'performance') {
      console.warn('FPS baixo detectado. Considere ativar modo performance.')
    }
  }, [performanceStats.frameRate, effectivePerformanceMode])

  // Monitorar uso de memória
  useEffect(() => {
    const updateMemoryUsage = () => {
      if (typeof window !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory
        setPerformanceStats(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / (1024 * 1024))
        }))
      }
    }

    const interval = setInterval(updateMemoryUsage, 5000) // A cada 5 segundos
    return () => clearInterval(interval)
  }, [])

  // Função para forçar renderização
  const forceRender = useCallback(() => {
    setPerformanceStats(prev => ({ ...prev }))
  }, [])

  // Função para resetar estatísticas
  const resetStats = useCallback(() => {
    frameTimeRef.current = []
    setPerformanceStats({
      visibleNodes: 0,
      visibleEdges: 0,
      renderTime: 0,
      frameRate: 60,
      memoryUsage: 0,
      isOptimized: false
    })
  }, [])

  // Função para otimizar automaticamente baseado na performance
  const autoOptimize = useCallback(() => {
    const { frameRate, memoryUsage } = performanceStats
    
    const recommendations = []
    
    if (frameRate < 30) {
      recommendations.push('Ativar modo performance')
      recommendations.push('Reduzir chunk size')
      recommendations.push('Desabilitar animações')
    }
    
    if (memoryUsage > 100) {
      recommendations.push('Ativar virtualização')
      recommendations.push('Limitar nós visíveis')
    }
    
    if (nodes.length > 200) {
      recommendations.push('Implementar lazy loading')
      recommendations.push('Usar chunks menores')
    }
    
    return recommendations
  }, [performanceStats, nodes.length])

  return {
    // Dados otimizados
    visibleNodes: memoizedNodes,
    visibleEdges: memoizedEdges,
    nodeChunks,
    
    // Estado
    viewport,
    performanceStats,
    effectivePerformanceMode,
    isLowPerformanceDevice,
    
    // Controles
    updateViewport: throttledUpdateViewport,
    startRender,
    endRender,
    forceRender,
    resetStats,
    autoOptimize,
    
    // Hooks
    useLazyElement,
    
    // Configurações
    options: opts
  }
}

// Função auxiliar para throttle
function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  let lastExecTime = 0
  
  return ((...args: any[]) => {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }) as T
}

// Hook para detectar dispositivos de baixa performance
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    cores: 2,
    memory: 2,
    connection: 'unknown',
    isLowEnd: false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const navigator = window.navigator as any
    const cores = navigator.hardwareConcurrency || 2
    const memory = navigator.deviceMemory || 2
    const connection = navigator.connection?.effectiveType || 'unknown'
    
    const isLowEnd = cores < 4 || memory < 4 || connection === 'slow-2g' || connection === '2g'

    setCapabilities({
      cores,
      memory,
      connection,
      isLowEnd
    })
  }, [])

  return capabilities
}

// Hook para monitoramento de performance em tempo real
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderCalls: 0,
    lastUpdate: Date.now()
  })

  const frameTimesRef = useRef<number[]>([])
  const renderCallsRef = useRef(0)

  const updateMetrics = useCallback(() => {
    const now = performance.now()
    frameTimesRef.current.push(now)

    // Manter apenas os últimos 60 frames
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }

    // Calcular FPS e frame time
    let fps = 60
    let frameTime = 16.67

    if (frameTimesRef.current.length > 1) {
      const times = frameTimesRef.current
      const totalTime = times[times.length - 1] - times[0]
      fps = Math.round((times.length - 1) * 1000 / totalTime)
      frameTime = totalTime / (times.length - 1)
    }

    // Obter uso de memória
    let memoryUsage = 0
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = Math.round(memory.usedJSHeapSize / (1024 * 1024))
    }

    setMetrics({
      fps,
      frameTime,
      memoryUsage,
      renderCalls: renderCallsRef.current,
      lastUpdate: now
    })

    requestAnimationFrame(updateMetrics)
  }, [])

  const trackRender = useCallback(() => {
    renderCallsRef.current++
  }, [])

  useEffect(() => {
    updateMetrics()
  }, [updateMetrics])

  return {
    metrics,
    trackRender
  }
}
