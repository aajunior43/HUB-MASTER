// Web Worker para processamento pesado de diagramas
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

// Tipos para processamento
interface DiagramData {
  nodes: Node[]
  edges: Edge[]
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  performance: {
    nodeCount: number
    edgeCount: number
    complexity: 'low' | 'medium' | 'high'
    renderingWeight: number
  }
}

interface LayoutOptimization {
  nodes: Node[]
  improved: boolean
  metrics: {
    overlapReduction: number
    spacingImprovement: number
    alignmentScore: number
  }
}

// Função principal do worker
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
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

// Processar diagrama completo
function processDiagram(data: DiagramData, id: string) {
  sendProgress('Iniciando processamento...', 0, id)

  // Validação
  sendProgress('Validando estrutura...', 20, id)
  const validation = performValidation(data)

  // Otimização de layout
  sendProgress('Otimizando layout...', 50, id)
  const optimizedLayout = performLayoutOptimization(data)

  // Cálculos de estatísticas
  sendProgress('Calculando métricas...', 80, id)
  const stats = performStatsCalculation(data)

  sendProgress('Finalizando...', 100, id)

  sendSuccess({
    validation,
    optimizedLayout,
    stats,
    processingTime: Date.now()
  }, id)
}

// Validar diagrama
function validateDiagram(data: DiagramData, id: string) {
  const result = performValidation(data)
  sendSuccess(result, id)
}

// Otimizar layout
function optimizeLayout(data: DiagramData, id: string) {
  sendProgress('Analisando layout atual...', 25, id)
  
  const result = performLayoutOptimization(data)
  
  sendProgress('Layout otimizado!', 100, id)
  sendSuccess(result, id)
}

// Calcular estatísticas
function calculateStats(data: DiagramData, id: string) {
  const stats = performStatsCalculation(data)
  sendSuccess(stats, id)
}

// Implementação da validação
function performValidation(data: DiagramData): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validar nós
  const nodeIds = new Set<string>()
  for (const node of data.nodes) {
    if (!node.id) {
      errors.push('Nó sem ID encontrado')
    } else if (nodeIds.has(node.id)) {
      errors.push(`ID duplicado: ${node.id}`)
    } else {
      nodeIds.add(node.id)
    }

    if (!node.position) {
      errors.push(`Nó ${node.id} sem posição`)
    }

    if (!node.data?.label) {
      warnings.push(`Nó ${node.id} sem label`)
    }
  }

  // Validar arestas
  const edgeIds = new Set<string>()
  for (const edge of data.edges) {
    if (!edge.id) {
      errors.push('Aresta sem ID encontrada')
    } else if (edgeIds.has(edge.id)) {
      errors.push(`ID de aresta duplicado: ${edge.id}`)
    } else {
      edgeIds.add(edge.id)
    }

    if (!nodeIds.has(edge.source)) {
      errors.push(`Aresta ${edge.id} referencia nó source inexistente: ${edge.source}`)
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(`Aresta ${edge.id} referencia nó target inexistente: ${edge.target}`)
    }
  }

  // Calcular métricas de performance
  const complexity = calculateComplexity(data)
  const renderingWeight = calculateRenderingWeight(data)

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

// Implementação da otimização de layout
function performLayoutOptimization(data: DiagramData): LayoutOptimization {
  let optimizedNodes = [...data.nodes]
  let improved = false

  // Detectar sobreposições
  const overlaps = detectOverlaps(optimizedNodes)
  if (overlaps.length > 0) {
    optimizedNodes = resolveOverlaps(optimizedNodes, overlaps)
    improved = true
  }

  // Melhorar espaçamento
  const spacingIssues = detectSpacingIssues(optimizedNodes)
  if (spacingIssues.length > 0) {
    optimizedNodes = improveSpacing(optimizedNodes)
    improved = true
  }

  // Alinhar elementos
  const alignmentScore = calculateAlignmentScore(optimizedNodes)
  if (alignmentScore < 0.7) {
    optimizedNodes = improveAlignment(optimizedNodes)
    improved = true
  }

  const metrics = {
    overlapReduction: calculateOverlapReduction(data.nodes, optimizedNodes),
    spacingImprovement: calculateSpacingImprovement(data.nodes, optimizedNodes),
    alignmentScore: calculateAlignmentScore(optimizedNodes)
  }

  return {
    nodes: optimizedNodes,
    improved,
    metrics
  }
}

// Implementação do cálculo de estatísticas
function performStatsCalculation(data: DiagramData) {
  const nodeTypes = data.nodes.reduce((acc, node) => {
    const type = node.data?.type || 'default'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const connections = data.edges.reduce((acc, edge) => {
    acc[edge.source] = (acc[edge.source] || 0) + 1
    acc[edge.target] = (acc[edge.target] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mostConnectedNode = Object.entries(connections)
    .sort(([, a], [, b]) => b - a)[0]

  const averageConnections = Object.values(connections).length > 0
    ? Object.values(connections).reduce((a, b) => a + b, 0) / Object.values(connections).length
    : 0

  const bounds = calculateBounds(data.nodes)

  return {
    totalNodes: data.nodes.length,
    totalEdges: data.edges.length,
    nodeTypes,
    connectivity: {
      mostConnectedNode: mostConnectedNode ? {
        nodeId: mostConnectedNode[0],
        connections: mostConnectedNode[1]
      } : null,
      averageConnections: Math.round(averageConnections * 100) / 100,
      isolatedNodes: data.nodes.filter(node => !connections[node.id]).length
    },
    layout: {
      bounds,
      density: calculateDensity(data.nodes, bounds),
      complexity: calculateComplexity(data)
    },
    performance: {
      renderingWeight: calculateRenderingWeight(data),
      recommendedOptimizations: getRecommendedOptimizations(data)
    }
  }
}

// Funções auxiliares
function calculateComplexity(data: DiagramData): 'low' | 'medium' | 'high' {
  const nodeCount = data.nodes.length
  const edgeCount = data.edges.length
  const ratio = edgeCount / Math.max(nodeCount, 1)

  if (nodeCount <= 10 && ratio <= 1.5) return 'low'
  if (nodeCount <= 50 && ratio <= 3) return 'medium'
  return 'high'
}

function calculateRenderingWeight(data: DiagramData): number {
  // Peso base por elemento
  let weight = data.nodes.length * 1 + data.edges.length * 0.5

  // Peso adicional por complexidade de dados
  for (const node of data.nodes) {
    if (node.data?.label && node.data.label.length > 20) {
      weight += 0.2
    }
    if (node.style) {
      weight += 0.1
    }
  }

  for (const edge of data.edges) {
    if (edge.animated) {
      weight += 0.3
    }
    if (edge.style) {
      weight += 0.1
    }
  }

  return Math.round(weight * 100) / 100
}

function detectOverlaps(nodes: Node[]): Array<{ node1: Node, node2: Node }> {
  const overlaps: Array<{ node1: Node, node2: Node }> = []
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i]
      const node2 = nodes[j]
      
      const distance = Math.sqrt(
        Math.pow(node1.position.x - node2.position.x, 2) +
        Math.pow(node1.position.y - node2.position.y, 2)
      )
      
      // Assumindo nós com 150x50 de tamanho
      if (distance < 100) {
        overlaps.push({ node1, node2 })
      }
    }
  }
  
  return overlaps
}

function resolveOverlaps(nodes: Node[], overlaps: Array<{ node1: Node, node2: Node }>): Node[] {
  const resolvedNodes = [...nodes]
  
  for (const overlap of overlaps) {
    const node1Index = resolvedNodes.findIndex(n => n.id === overlap.node1.id)
    const node2Index = resolvedNodes.findIndex(n => n.id === overlap.node2.id)
    
    if (node1Index >= 0 && node2Index >= 0) {
      // Mover node2 para direita
      resolvedNodes[node2Index] = {
        ...resolvedNodes[node2Index],
        position: {
          x: resolvedNodes[node2Index].position.x + 150,
          y: resolvedNodes[node2Index].position.y
        }
      }
    }
  }
  
  return resolvedNodes
}

function detectSpacingIssues(nodes: Node[]): string[] {
  const issues: string[] = []
  
  // Verificar espaçamento mínimo
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const distance = Math.sqrt(
        Math.pow(nodes[i].position.x - nodes[j].position.x, 2) +
        Math.pow(nodes[i].position.y - nodes[j].position.y, 2)
      )
      
      if (distance < 120) {
        issues.push(`Espaçamento insuficiente entre ${nodes[i].id} e ${nodes[j].id}`)
      }
    }
  }
  
  return issues
}

function improveSpacing(nodes: Node[]): Node[] {
  // Implementação simplificada - aplicar força de repulsão
  const improved = nodes.map(node => ({ ...node }))
  
  for (let iteration = 0; iteration < 5; iteration++) {
    for (let i = 0; i < improved.length; i++) {
      let forceX = 0
      let forceY = 0
      
      for (let j = 0; j < improved.length; j++) {
        if (i === j) continue
        
        const dx = improved[i].position.x - improved[j].position.x
        const dy = improved[i].position.y - improved[j].position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 150 && distance > 0) {
          const force = (150 - distance) / distance
          forceX += (dx / distance) * force * 0.1
          forceY += (dy / distance) * force * 0.1
        }
      }
      
      improved[i].position.x += forceX
      improved[i].position.y += forceY
    }
  }
  
  return improved
}

function calculateAlignmentScore(nodes: Node[]): number {
  if (nodes.length <= 1) return 1
  
  // Calcular score baseado no alinhamento X e Y
  const xPositions = nodes.map(n => n.position.x).sort((a, b) => a - b)
  const yPositions = nodes.map(n => n.position.y).sort((a, b) => a - b)
  
  // Contar quantos nós estão alinhados (tolerância de 10px)
  let alignedX = 0
  let alignedY = 0
  
  for (let i = 0; i < nodes.length; i++) {
    const xMatches = nodes.filter(n => Math.abs(n.position.x - nodes[i].position.x) <= 10).length - 1
    const yMatches = nodes.filter(n => Math.abs(n.position.y - nodes[i].position.y) <= 10).length - 1
    
    alignedX += xMatches
    alignedY += yMatches
  }
  
  const maxPossibleAlignments = nodes.length * (nodes.length - 1)
  const actualAlignments = alignedX + alignedY
  
  return maxPossibleAlignments > 0 ? actualAlignments / maxPossibleAlignments : 1
}

function improveAlignment(nodes: Node[]): Node[] {
  const improved = nodes.map(node => ({ ...node }))
  
  // Agrupar nós por proximidade e alinhar
  const tolerance = 30
  const alignedGroups: Node[][] = []
  
  for (const node of improved) {
    let addedToGroup = false
    
    for (const group of alignedGroups) {
      const avgX = group.reduce((sum, n) => sum + n.position.x, 0) / group.length
      const avgY = group.reduce((sum, n) => sum + n.position.y, 0) / group.length
      
      if (Math.abs(node.position.x - avgX) <= tolerance || Math.abs(node.position.y - avgY) <= tolerance) {
        group.push(node)
        addedToGroup = true
        break
      }
    }
    
    if (!addedToGroup) {
      alignedGroups.push([node])
    }
  }
  
  // Alinhar nós dentro de cada grupo
  for (const group of alignedGroups) {
    if (group.length > 1) {
      const avgX = group.reduce((sum, n) => sum + n.position.x, 0) / group.length
      const avgY = group.reduce((sum, n) => sum + n.position.y, 0) / group.length
      
      // Decidir se alinhar por X ou Y baseado na distribuição
      const xVariance = group.reduce((sum, n) => sum + Math.pow(n.position.x - avgX, 2), 0) / group.length
      const yVariance = group.reduce((sum, n) => sum + Math.pow(n.position.y - avgY, 2), 0) / group.length
      
      if (xVariance < yVariance) {
        // Alinhar por X
        group.forEach(node => {
          node.position.x = avgX
        })
      } else {
        // Alinhar por Y
        group.forEach(node => {
          node.position.y = avgY
        })
      }
    }
  }
  
  return improved
}

function calculateOverlapReduction(original: Node[], optimized: Node[]): number {
  const originalOverlaps = detectOverlaps(original).length
  const optimizedOverlaps = detectOverlaps(optimized).length
  
  if (originalOverlaps === 0) return 0
  return ((originalOverlaps - optimizedOverlaps) / originalOverlaps) * 100
}

function calculateSpacingImprovement(original: Node[], optimized: Node[]): number {
  const originalIssues = detectSpacingIssues(original).length
  const optimizedIssues = detectSpacingIssues(optimized).length
  
  if (originalIssues === 0) return 0
  return ((originalIssues - optimizedIssues) / originalIssues) * 100
}

function calculateBounds(nodes: Node[]) {
  if (nodes.length === 0) return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 }
  
  const minX = Math.min(...nodes.map(n => n.position.x))
  const maxX = Math.max(...nodes.map(n => n.position.x))
  const minY = Math.min(...nodes.map(n => n.position.y))
  const maxY = Math.max(...nodes.map(n => n.position.y))
  
  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY
  }
}

function calculateDensity(nodes: Node[], bounds: any): number {
  if (bounds.width === 0 || bounds.height === 0) return 0
  
  const area = bounds.width * bounds.height
  const nodeArea = nodes.length * 150 * 50 // Assumindo tamanho médio dos nós
  
  return Math.min(nodeArea / area, 1) * 100
}

function getRecommendedOptimizations(data: DiagramData): string[] {
  const recommendations: string[] = []
  
  if (data.nodes.length > 100) {
    recommendations.push('Considere usar virtualização para melhorar performance')
  }
  
  if (data.edges.length > 200) {
    recommendations.push('Muitas conexões podem impactar a performance de renderização')
  }
  
  const overlaps = detectOverlaps(data.nodes)
  if (overlaps.length > 0) {
    recommendations.push('Layout automático pode resolver sobreposições')
  }
  
  const spacingIssues = detectSpacingIssues(data.nodes)
  if (spacingIssues.length > 0) {
    recommendations.push('Otimização de espaçamento melhoraria a legibilidade')
  }
  
  return recommendations
}

// Funções de comunicação com a thread principal
function sendSuccess(payload: any, id: string) {
  self.postMessage({
    type: 'SUCCESS',
    payload,
    id
  } as WorkerResponse)
}

function sendError(error: string, id: string) {
  self.postMessage({
    type: 'ERROR',
    payload: { error },
    id
  } as WorkerResponse)
}

function sendProgress(message: string, progress: number, id: string) {
  self.postMessage({
    type: 'PROGRESS',
    payload: { message, progress },
    id
  } as WorkerResponse)
}

export {}
