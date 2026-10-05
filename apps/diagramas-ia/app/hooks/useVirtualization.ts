/**
 * Hook para virtualização de listas grandes para melhor performance
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { throttle } from '../lib/utils'

interface VirtualizationOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number // Itens extras para renderizar fora da viewport
  scrollThrottle?: number // Throttle para eventos de scroll
}

interface VirtualizedItem {
  index: number
  top: number
  height: number
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
) {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    scrollThrottle = 16
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  // Calcular itens visíveis
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Calcular itens virtualizados
  const virtualItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    const virtualizedItems: VirtualizedItem[] = []

    for (let i = startIndex; i <= endIndex; i++) {
      virtualizedItems.push({
        index: i,
        top: i * itemHeight,
        height: itemHeight
      })
    }

    return virtualizedItems
  }, [visibleRange, itemHeight])

  // Altura total da lista
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight])

  // Handler de scroll otimizado
  const handleScroll = useCallback(
    throttle((event: Event) => {
      const target = event.target as HTMLDivElement
      setScrollTop(target.scrollTop)
    }, scrollThrottle),
    [scrollThrottle]
  )

  // Configurar listener de scroll
  useEffect(() => {
    const element = scrollElementRef.current
    if (!element) return

    element.addEventListener('scroll', handleScroll, { passive: true })
    return () => element.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Função para rolar para um item específico
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return

    const itemTop = index * itemHeight
    let scrollPosition = itemTop

    if (align === 'center') {
      scrollPosition = itemTop - (containerHeight - itemHeight) / 2
    } else if (align === 'end') {
      scrollPosition = itemTop - containerHeight + itemHeight
    }

    scrollElementRef.current.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: 'smooth'
    })
  }, [itemHeight, containerHeight])

  return {
    virtualItems,
    totalHeight,
    scrollElementRef,
    scrollToItem,
    visibleRange
  }
}

/**
 * Hook para virtualização de grid
 */
interface GridVirtualizationOptions {
  itemWidth: number
  itemHeight: number
  containerWidth: number
  containerHeight: number
  gap?: number
  overscan?: number
}

interface VirtualizedGridItem {
  index: number
  row: number
  col: number
  top: number
  left: number
  width: number
  height: number
}

export function useGridVirtualization<T>(
  items: T[],
  options: GridVirtualizationOptions
) {
  const {
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    gap = 0,
    overscan = 2
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  // Calcular número de colunas
  const columnCount = useMemo(() => {
    return Math.floor((containerWidth + gap) / (itemWidth + gap))
  }, [containerWidth, itemWidth, gap])

  // Calcular número de linhas
  const rowCount = useMemo(() => {
    return Math.ceil(items.length / columnCount)
  }, [items.length, columnCount])

  // Calcular range visível
  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan)
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    )

    const startCol = Math.max(0, Math.floor(scrollLeft / (itemWidth + gap)) - overscan)
    const endCol = Math.min(
      columnCount - 1,
      Math.ceil((scrollLeft + containerWidth) / (itemWidth + gap)) + overscan
    )

    return { startRow, endRow, startCol, endCol }
  }, [scrollTop, scrollLeft, itemHeight, itemWidth, gap, containerHeight, containerWidth, overscan, rowCount, columnCount])

  // Calcular itens virtualizados
  const virtualItems = useMemo(() => {
    const { startRow, endRow, startCol, endCol } = visibleRange
    const virtualizedItems: VirtualizedGridItem[] = []

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const index = row * columnCount + col
        if (index >= items.length) continue

        virtualizedItems.push({
          index,
          row,
          col,
          top: row * (itemHeight + gap),
          left: col * (itemWidth + gap),
          width: itemWidth,
          height: itemHeight
        })
      }
    }

    return virtualizedItems
  }, [visibleRange, columnCount, items.length, itemHeight, itemWidth, gap])

  // Dimensões totais
  const totalWidth = useMemo(() => 
    columnCount * itemWidth + (columnCount - 1) * gap,
    [columnCount, itemWidth, gap]
  )

  const totalHeight = useMemo(() => 
    rowCount * itemHeight + (rowCount - 1) * gap,
    [rowCount, itemHeight, gap]
  )

  // Handler de scroll
  const handleScroll = useCallback(
    throttle((event: Event) => {
      const target = event.target as HTMLDivElement
      setScrollTop(target.scrollTop)
      setScrollLeft(target.scrollLeft)
    }, 16),
    []
  )

  // Configurar listener de scroll
  useEffect(() => {
    const element = scrollElementRef.current
    if (!element) return

    element.addEventListener('scroll', handleScroll, { passive: true })
    return () => element.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Função para rolar para um item específico
  const scrollToItem = useCallback((index: number) => {
    if (!scrollElementRef.current) return

    const row = Math.floor(index / columnCount)
    const col = index % columnCount

    const top = row * (itemHeight + gap)
    const left = col * (itemWidth + gap)

    scrollElementRef.current.scrollTo({
      top,
      left,
      behavior: 'smooth'
    })
  }, [columnCount, itemHeight, itemWidth, gap])

  return {
    virtualItems,
    totalWidth,
    totalHeight,
    scrollElementRef,
    scrollToItem,
    columnCount,
    rowCount,
    visibleRange
  }
}

/**
 * Hook para infinite scroll otimizado
 */
interface InfiniteScrollOptions {
  threshold?: number // Distância do final para carregar mais
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

export function useInfiniteScroll(options: InfiniteScrollOptions) {
  const { threshold = 100, hasMore, loading, onLoadMore } = options
  const [isFetching, setIsFetching] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Usar Intersection Observer para detectar quando chegou ao final
  useEffect(() => {
    if (!sentinelRef.current || loading || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isFetching) {
          setIsFetching(true)
          onLoadMore()
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    )

    observer.observe(sentinelRef.current)

    return () => observer.disconnect()
  }, [threshold, hasMore, loading, isFetching, onLoadMore])

  // Reset fetching state quando loading muda
  useEffect(() => {
    if (!loading) {
      setIsFetching(false)
    }
  }, [loading])

  return {
    sentinelRef,
    isFetching: isFetching || loading
  }
}

/**
 * Hook para paginação virtual
 */
interface VirtualPaginationOptions {
  pageSize: number
  totalItems: number
  preloadPages?: number // Número de páginas para pre-carregar
}

export function useVirtualPagination<T>(
  loadPage: (page: number) => Promise<T[]>,
  options: VirtualPaginationOptions
) {
  const { pageSize, totalItems, preloadPages = 1 } = options
  const [pages, setPages] = useState<Map<number, T[]>>(new Map())
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set())
  const loadingRef = useRef<Set<number>>(new Set())

  const totalPages = Math.ceil(totalItems / pageSize)

  // Carregar uma página específica
  const loadPageData = useCallback(async (pageNumber: number) => {
    if (pages.has(pageNumber) || loadingRef.current.has(pageNumber)) {
      return
    }

    loadingRef.current.add(pageNumber)
    setLoadingPages(new Set(loadingRef.current))

    try {
      const data = await loadPage(pageNumber)
      setPages(prev => new Map(prev).set(pageNumber, data))
    } catch (error) {
      console.error(`Failed to load page ${pageNumber}:`, error)
    } finally {
      loadingRef.current.delete(pageNumber)
      setLoadingPages(new Set(loadingRef.current))
    }
  }, [loadPage, pages])

  // Obter itens para um range específico
  const getItemsInRange = useCallback((startIndex: number, endIndex: number) => {
    const items: (T | undefined)[] = []
    
    for (let i = startIndex; i <= endIndex; i++) {
      const pageNumber = Math.floor(i / pageSize)
      const indexInPage = i % pageSize
      const pageData = pages.get(pageNumber)
      
      if (pageData) {
        items.push(pageData[indexInPage])
      } else {
        items.push(undefined)
        // Carregar página se não estiver carregando
        loadPageData(pageNumber)
      }
    }

    return items
  }, [pageSize, pages, loadPageData])

  // Pre-carregar páginas adjacentes
  const preloadAdjacentPages = useCallback((currentPage: number) => {
    for (let i = 1; i <= preloadPages; i++) {
      const prevPage = currentPage - i
      const nextPage = currentPage + i

      if (prevPage >= 0) {
        loadPageData(prevPage)
      }
      if (nextPage < totalPages) {
        loadPageData(nextPage)
      }
    }
  }, [preloadPages, totalPages, loadPageData])

  return {
    getItemsInRange,
    loadPageData,
    preloadAdjacentPages,
    isPageLoading: (page: number) => loadingPages.has(page),
    hasPage: (page: number) => pages.has(page),
    totalPages
  }
}

/**
 * Hook para otimização de render de listas com muitos itens
 */
export function useOptimizedList<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string,
  maxRenderCount: number = 100
) {
  const [visibleItems, setVisibleItems] = useState<T[]>([])
  const [loadedCount, setLoadedCount] = useState(maxRenderCount)

  // Carregar mais itens progressivamente
  const loadMore = useCallback(() => {
    const newCount = Math.min(loadedCount + maxRenderCount, items.length)
    setLoadedCount(newCount)
  }, [loadedCount, maxRenderCount, items.length])

  // Atualizar itens visíveis quando items ou loadedCount mudarem
  useEffect(() => {
    setVisibleItems(items.slice(0, loadedCount))
  }, [items, loadedCount])

  // Reset quando items mudarem completamente
  useEffect(() => {
    setLoadedCount(maxRenderCount)
  }, [items, maxRenderCount])

  const hasMore = loadedCount < items.length

  return {
    visibleItems,
    loadMore,
    hasMore,
    totalCount: items.length,
    loadedCount
  }
}
