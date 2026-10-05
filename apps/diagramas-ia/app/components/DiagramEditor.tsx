'use client'

import { useCallback, useRef, useState, forwardRef, useImperativeHandle, useEffect, memo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  ReactFlowInstance,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'

import CustomNode from './CustomNode'
import EmptyState from './EmptyState'
import DiagramStats from './DiagramStats'
import ConfigStatus from './ConfigStatus'
import { useDiagramValidation } from '../hooks/useAutoCorrection'
import { DiagramConfig } from './AdvancedSettings'

const nodeTypes = {
  custom: CustomNode,
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []



interface DiagramEditorProps {
  onOpenPrompt?: () => void
  onRequestCorrection?: (errorDetails: string) => void
  showStats?: boolean
  currentConfig?: DiagramConfig
}

const DiagramEditor = memo(forwardRef<any, DiagramEditorProps>(({ onOpenPrompt, onRequestCorrection, showStats = true, currentConfig }, ref) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots)
  
  const { validateDiagram } = useDiagramValidation()

  useImperativeHandle(ref, () => ({
    getNodesAndEdges: () => ({ nodes, edges }),
    loadDiagram: (diagram: { nodes: Node[]; edges: Edge[] }) => {
      setNodes(diagram.nodes)
      setEdges(diagram.edges)
      // Ajustar visualização após carregar
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2 })
        }
      }, 100)
    },
    validateCurrentDiagram: () => {
      const validation = validateDiagram(nodes, edges)
      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        return validation
      }
      return validation
    }
  }))

  // Validação automática quando o diagrama muda
  useEffect(() => {
    if (nodes.length > 0) {
      const validation = validateDiagram(nodes, edges)
      if (!validation.isValid) {
        console.warn('Erros detectados no diagrama:', validation.errors)
        setValidationErrors(validation.errors)
        
        // Auto-correção automática após 2 segundos se houver erros críticos
        const criticalErrors = validation.errors.filter(error => 
          error.includes('duplicado') || 
          error.includes('inexistente') ||
          error.includes('pelo menos um nó')
        )
        
        if (criticalErrors.length > 0 && onRequestCorrection) {
          setTimeout(() => {
            console.log('🔄 Solicitando correção automática devido a erros críticos')
            onRequestCorrection(criticalErrors.join('; '))
          }, 2000)
        }
      } else {
        setValidationErrors([])
      }
    }
  }, [nodes, edges, validateDiagram, onRequestCorrection])



  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Remover funcionalidades de drag and drop para simplificar

  // Alternar variante do background baseado no tema
  useEffect(() => {
    if (currentConfig?.style === 'minimal') {
      setBackgroundVariant(BackgroundVariant.Lines)
    } else if (currentConfig?.style === 'dark' || currentConfig?.style === 'neon') {
      setBackgroundVariant(BackgroundVariant.Cross)
    } else {
      setBackgroundVariant(BackgroundVariant.Dots)
    }
  }, [currentConfig?.style])

  // Mostrar EmptyState se não há nós
  if (nodes.length === 0) {
    return (
      <motion.div 
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <EmptyState onOpenPrompt={onOpenPrompt || (() => {})} />
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="w-full h-full relative overflow-hidden rounded-lg"
      ref={reactFlowWrapper}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
          snapToGrid={currentConfig?.gridSnap}
          snapGrid={[15, 15]}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode="Shift"
          panOnScroll
          selectionOnDrag
          panOnDrag={[1, 2]}
          selectNodesOnDrag={false}
        >
          {/* Controles modernos */}
          <Controls 
            className="!bg-white/80 !backdrop-blur-md !border-gray-200/50 !rounded-xl !shadow-xl"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
          
          {/* MiniMap condicional */}
          {currentConfig?.showMinimap && (
            <MiniMap 
              className="!bg-white/80 !backdrop-blur-md !border-gray-200/50 !rounded-xl !shadow-xl"
              nodeColor="#3b82f6"
              maskColor="rgba(59, 130, 246, 0.1)"
              position="bottom-left"
              pannable
              zoomable
            />
          )}
          
          {/* Background personalizado */}
          <Background 
            variant={backgroundVariant}
            gap={20}
            size={1}
            color={currentConfig?.theme === 'dark' ? '#374151' : '#e5e7eb'}
          />

          {/* Painel de estatísticas flutuante */}
          <AnimatePresence>
            {showStats && (
              <Panel position="top-left" className="z-10">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DiagramStats 
                    nodes={nodes} 
                    edges={edges} 
                    isVisible={showStats}
                  />
                </motion.div>
              </Panel>
            )}
          </AnimatePresence>

          {/* Status da configuração */}
          <AnimatePresence>
            {currentConfig && nodes.length > 0 && (
              <Panel position="top-right" className="z-10">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ConfigStatus 
                    config={currentConfig}
                    isVisible={nodes.length > 0}
                  />
                </motion.div>
              </Panel>
            )}
          </AnimatePresence>

          {/* Indicador de erros de validação */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <Panel position="bottom-center" className="z-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg max-w-md"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">
                      {validationErrors.length} erro(s) detectado(s)
                    </span>
                  </div>
                </motion.div>
              </Panel>
            )}
          </AnimatePresence>

          {/* Indicador de carregamento */}
          <AnimatePresence>
            {isLoading && (
              <Panel position="top-center" className="z-30">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-blue-500/90 backdrop-blur-md text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3"
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span className="text-sm font-medium">Processando diagrama...</span>
                </motion.div>
              </Panel>
            )}
          </AnimatePresence>
        </ReactFlow>
      </ReactFlowProvider>
    </motion.div>
  )
}))

DiagramEditor.displayName = 'DiagramEditor'

export default DiagramEditor