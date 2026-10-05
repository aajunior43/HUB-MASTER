'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Node, Edge } from '@xyflow/react'

export interface WorkerMessage {
  type: 'PROCESS_DIAGRAM' | 'VALIDATE_DIAGRAM' | 'OPTIMIZE_LAYOUT' | 'CALCULATE_STATS'
  payload: any
  id: string
}

export interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS'
  payload: any
  id: string
}

interface DiagramData {
  nodes: Node[]
  edges: Edge[]
}

interface WorkerTask {
  id: string
  type: string
  resolve: (value: any) => void
  reject: (error: any) => void
  onProgress?: (message: string, progress: number) => void
}

export interface PerformanceMetrics {
  renderTime: number
  layoutTime: number
  validationTime: number
  memoryUsage: number
  frameRate: number
  lastUpdate: number
}

export function useWorkerPerformance() {
  const workerRef = useRef<Worker | null>(null)
  const tasksRef = useRef<Map<string, WorkerTask>>(new Map())
  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    layoutTime: 0,
    validationTime: 0,
    memoryUsage: 0,
    frameRate: 60,
    lastUpdate: Date.now()
  })

  // Inicializar worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      try {
        // Criar worker a partir do código inline para evitar problemas de path
        const workerCode = `
          // Web Worker para processamento pesado de diagramas
          
          self.onmessage = (event) => {
            const { type, payload, id } = event.data
          
            try {
              switch (type) {
                case 'PROCESS_DIAGRAM':
                  processDiagram(payload, id)
                  break
                case 'VALIDATE_DIAGRAM':
                  validateDiagram(payload, id)
                  break
                case 'OPTIMIZE_LAYOUT':
                  optimizeLayout(payload, id)
                  break
                case 'CALCULATE_STATS':
                  calculateStats(payload, id)
                  break
                default:
                  sendError('Tipo de mensagem não suportado', id)
              }
            } catch (error) {
              sendError(error instanceof Error ? error.message : 'Erro desconhecido', id)
            }
          }
          
          function processDiagram(data, id) {
            sendProgress('Iniciando processamento...', 0, id)
            
            setTimeout(() => {
              sendProgress('Validando estrutura...', 25, id)
              const validation = performValidation(data)
              
              setTimeout(() => {
                sendProgress('Otimizando layout...', 50, id)
                const optimizedLayout = performLayoutOptimization(data)
                
                setTimeout(() => {
                  sendProgress('Calculando métricas...', 75, id)
                  const stats = performStatsCalculation(data)
                  
                  setTimeout(() => {
                    sendProgress('Finalizando...', 100, id)
                    sendSuccess({
                      validation,
                      optimizedLayout,
                      stats,
                      processingTime: Date.now()
                    }, id)
                  }, 200)
                }, 200)
              }, 200)
            }, 200)
          }
          
          function validateDiagram(data, id) {
            const result = performValidation(data)
            sendSuccess(result, id)
          }
          
          function optimizeLayout(data, id) {
            sendProgress('Analisando layout atual...', 25, id)
            
            setTimeout(() => {
              const result = performLayoutOptimization(data)
              sendProgress('Layout otimizado!', 100, id)
              sendSuccess(result, id)
            }, 500)
          }
          
          function calculateStats(data, id) {
            const stats = performStatsCalculation(data)
            sendSuccess(stats, id)
          }
          
          function performValidation(data) {
            const errors = []
            const warnings = []
          
            const nodeIds = new Set()
            for (const node of data.nodes) {
              if (!node.id) {
                errors.push('Nó sem ID encontrado')
              } else if (nodeIds.has(node.id)) {
                errors.push(\`ID duplicado: \${node.id}\`)
              } else {
                nodeIds.add(node.id)
              }
          
              if (!node.position) {
                errors.push(\`Nó \${node.id} sem posição\`)
              }
          
              if (!node.data?.label) {
                warnings.push(\`Nó \${node.id} sem label\`)
              }
            }
          
            const edgeIds = new Set()
            for (const edge of data.edges) {
              if (!edge.id) {
                errors.push('Aresta sem ID encontrada')
              } else if (edgeIds.has(edge.id)) {
                errors.push(\`ID de aresta duplicado: \${edge.id}\`)
              } else {
                edgeIds.add(edge.id)
              }
          
              if (!nodeIds.has(edge.source)) {
                errors.push(\`Aresta \${edge.id} referencia nó source inexistente: \${edge.source}\`)
              }
          
              if (!nodeIds.has(edge.target)) {
                errors.push(\`Aresta \${edge.id} referencia nó target inexistente: \${edge.target}\`)
              }
            }
          
            const complexity = data.nodes.length <= 10 ? 'low' : data.nodes.length <= 50 ? 'medium' : 'high'
            const renderingWeight = data.nodes.length * 1 + data.edges.length * 0.5
          
            return {
              isValid: errors.length === 0,
              errors,
              warnings,
              performance: {
                nodeCount: data.nodes.length,
                edgeCount: data.edges.length,
                complexity,
                renderingWeight
              }
            }
          }
          
          function performLayoutOptimization(data) {
            let optimizedNodes = [...data.nodes]
            let improved = false
          
            // Detectar sobreposições simples
            const overlaps = []
            for (let i = 0; i < optimizedNodes.length; i++) {
              for (let j = i + 1; j < optimizedNodes.length; j++) {
                const node1 = optimizedNodes[i]
                const node2 = optimizedNodes[j]
                
                const distance = Math.sqrt(
                  Math.pow(node1.position.x - node2.position.x, 2) +
                  Math.pow(node1.position.y - node2.position.y, 2)
                )
                
                if (distance < 100) {
                  overlaps.push({ node1, node2 })
                }
              }
            }
          
            // Resolver sobreposições
            if (overlaps.length > 0) {
              for (const overlap of overlaps) {
                const node2Index = optimizedNodes.findIndex(n => n.id === overlap.node2.id)
                if (node2Index >= 0) {
                  optimizedNodes[node2Index] = {
                    ...optimizedNodes[node2Index],
                    position: {
                      x: optimizedNodes[node2Index].position.x + 150,
                      y: optimizedNodes[node2Index].position.y
                    }
                  }
                }
              }
              improved = true
            }
          
            return {
              nodes: optimizedNodes,
              improved,
              metrics: {
                overlapReduction: overlaps.length > 0 ? 100 : 0,
                spacingImprovement: 0,
                alignmentScore: 0.8
              }
            }
          }
          
          function performStatsCalculation(data) {
            const nodeTypes = data.nodes.reduce((acc, node) => {
              const type = node.data?.type || 'default'
              acc[type] = (acc[type] || 0) + 1
              return acc
            }, {})
          
            const connections = data.edges.reduce((acc, edge) => {
              acc[edge.source] = (acc[edge.source] || 0) + 1
              acc[edge.target] = (acc[edge.target] || 0) + 1
              return acc
            }, {})
          
            const connectionValues = Object.values(connections)
            const averageConnections = connectionValues.length > 0
              ? connectionValues.reduce((a, b) => a + b, 0) / connectionValues.length
              : 0
          
            return {
              totalNodes: data.nodes.length,
              totalEdges: data.edges.length,
              nodeTypes,
              connectivity: {
                averageConnections: Math.round(averageConnections * 100) / 100,
                isolatedNodes: data.nodes.filter(node => !connections[node.id]).length
              },
              performance: {
                renderingWeight: data.nodes.length * 1 + data.edges.length * 0.5,
                recommendedOptimizations: []
              }
            }
          }
          
          function sendSuccess(payload, id) {
            self.postMessage({
              type: 'SUCCESS',
              payload,
              id
            })
          }
          
          function sendError(error, id) {
            self.postMessage({
              type: 'ERROR',
              payload: { error },
              id
            })
          }
          
          function sendProgress(message, progress, id) {
            self.postMessage({
              type: 'PROGRESS',
              payload: { message, progress },
              id
            })
          }
        `

        const blob = new Blob([workerCode], { type: 'application/javascript' })
        const workerUrl = URL.createObjectURL(blob)
        workerRef.current = new Worker(workerUrl)

        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { type, payload, id } = event.data
          const task = tasksRef.current.get(id)

          if (!task) return

          switch (type) {
            case 'SUCCESS':
              task.resolve(payload)
              tasksRef.current.delete(id)
              break
            case 'ERROR':
              task.reject(new Error(payload.error))
              tasksRef.current.delete(id)
              break
            case 'PROGRESS':
              if (task.onProgress) {
                task.onProgress(payload.message, payload.progress)
              }
              break
          }
        }

        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error)
          // Reject todas as tasks pendentes
          for (const [id, task] of tasksRef.current.entries()) {
            task.reject(new Error('Worker error'))
            tasksRef.current.delete(id)
          }
        }

        setIsWorkerReady(true)

        // Cleanup do URL
        return () => {
          URL.revokeObjectURL(workerUrl)
        }
      } catch (error) {
        console.error('Erro ao criar worker:', error)
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Função genérica para enviar tarefas ao worker
  const sendToWorker = useCallback(<T = any>(
    type: WorkerMessage['type'],
    payload: any,
    onProgress?: (message: string, progress: number) => void
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isWorkerReady) {
        reject(new Error('Worker não está disponível'))
        return
      }

      const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      tasksRef.current.set(id, {
        id,
        type,
        resolve,
        reject,
        onProgress
      })

      workerRef.current.postMessage({
        type,
        payload,
        id
      } as WorkerMessage)
    })
  }, [isWorkerReady])

  // Processar diagrama completo
  const processDiagram = useCallback(async (
    data: DiagramData,
    onProgress?: (message: string, progress: number) => void
  ) => {
    const startTime = performance.now()
    
    try {
      const result = await sendToWorker('PROCESS_DIAGRAM', data, onProgress)
      
      const processingTime = performance.now() - startTime
      setMetrics(prev => ({
        ...prev,
        renderTime: processingTime,
        lastUpdate: Date.now()
      }))
      
      return result
    } catch (error) {
      console.error('Erro no processamento do diagrama:', error)
      throw error
    }
  }, [sendToWorker])

  // Validar diagrama
  const validateDiagram = useCallback(async (data: DiagramData) => {
    const startTime = performance.now()
    
    try {
      const result = await sendToWorker('VALIDATE_DIAGRAM', data)
      
      const validationTime = performance.now() - startTime
      setMetrics(prev => ({
        ...prev,
        validationTime,
        lastUpdate: Date.now()
      }))
      
      return result
    } catch (error) {
      console.error('Erro na validação do diagrama:', error)
      throw error
    }
  }, [sendToWorker])

  // Otimizar layout
  const optimizeLayout = useCallback(async (
    data: DiagramData,
    onProgress?: (message: string, progress: number) => void
  ) => {
    const startTime = performance.now()
    
    try {
      const result = await sendToWorker('OPTIMIZE_LAYOUT', data, onProgress)
      
      const layoutTime = performance.now() - startTime
      setMetrics(prev => ({
        ...prev,
        layoutTime,
        lastUpdate: Date.now()
      }))
      
      return result
    } catch (error) {
      console.error('Erro na otimização do layout:', error)
      throw error
    }
  }, [sendToWorker])

  // Calcular estatísticas
  const calculateStats = useCallback(async (data: DiagramData) => {
    try {
      return await sendToWorker('CALCULATE_STATS', data)
    } catch (error) {
      console.error('Erro no cálculo de estatísticas:', error)
      throw error
    }
  }, [sendToWorker])

  // Monitorar performance em tempo real
  const monitorPerformance = useCallback(() => {
    if (typeof window === 'undefined') return

    const updateMetrics = () => {
      // Medir FPS
      let frameCount = 0
      let lastTime = performance.now()
      
      const measureFPS = () => {
        frameCount++
        const currentTime = performance.now()
        
        if (currentTime - lastTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
          
          setMetrics(prev => ({
            ...prev,
            frameRate: fps,
            lastUpdate: Date.now()
          }))
          
          frameCount = 0
          lastTime = currentTime
        }
        
        requestAnimationFrame(measureFPS)
      }
      
      measureFPS()

      // Medir uso de memória (se disponível)
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / (1024 * 1024)), // MB
          lastUpdate: Date.now()
        }))
      }
    }

    updateMetrics()
  }, [])

  // Auto monitor performance
  useEffect(() => {
    if (isWorkerReady) {
      monitorPerformance()
    }
  }, [isWorkerReady, monitorPerformance])

  return {
    isWorkerReady,
    processDiagram,
    validateDiagram,
    optimizeLayout,
    calculateStats,
    metrics,
    monitorPerformance
  }
}
