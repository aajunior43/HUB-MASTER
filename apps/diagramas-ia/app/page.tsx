'use client'

import { useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import DiagramEditor from './components/DiagramEditor'
import Header from './components/Header'
import PromptPanel from './components/PromptPanel'
import { useExport } from './hooks/useExport'
import { useToast } from './components/Toast'
import { useAutoCorrection } from './hooks/useAutoCorrection'
import { DiagramConfig } from './components/AdvancedSettings'
import { useAppStore, useCanUndo, useCanRedo } from './store/useAppStore'
import { DiagramData } from './types'

export default function Home() {
  // Zustand store hooks
  const {
    currentDiagram,
    setDiagram,
    config,
    ui,
    togglePromptPanel,
    addToast,
    toasts,
    undo,
    redo,
    saveDiagram,
    addRecentAction,
    addPromptToHistory
  } = useAppStore()

  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  // Refs e hooks externos
  const diagramRef = useRef<any>(null)
  const { exportAsImage, exportAsJSON, exportAsSVG } = useExport()
  const { showToast, ToastContainer } = useToast()
  const { correctDiagram, isGenerating, lastResult } = useAutoCorrection()

  // Atalhos de teclado
  useHotkeys('ctrl+z, cmd+z', () => {
    if (canUndo) {
      undo()
      addRecentAction('undo', 'Desfazer alteração')
    }
  })

  useHotkeys('ctrl+y, cmd+y, ctrl+shift+z, cmd+shift+z', () => {
    if (canRedo) {
      redo()
      addRecentAction('redo', 'Refazer alteração')
    }
  })

  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault()
    handleSave()
  })

  useHotkeys('ctrl+e, cmd+e', (e) => {
    e.preventDefault()
    handleExport('png')
  })

  useHotkeys('ctrl+enter, cmd+enter', () => {
    togglePromptPanel()
  })

  // Funções de manipulação
  const handleExport = useCallback(async (type: 'png' | 'svg' | 'json') => {
    if (!diagramRef.current) {
      addToast({
        type: 'warning',
        message: 'Nada para exportar',
        description: 'Crie um diagrama primeiro'
      })
      return
    }

    const { nodes, edges } = diagramRef.current.getNodesAndEdges()

    try {
      addToast({
        type: 'info',
        message: 'Exportando...',
        description: `Preparando arquivo ${type.toUpperCase()}`
      })

      switch (type) {
        case 'png':
          await exportAsImage(nodes, edges)
          addToast({
            type: 'success',
            message: 'PNG exportado com sucesso!',
            description: 'Download iniciado automaticamente'
          })
          break
        case 'svg':
          await exportAsSVG(nodes, edges)
          addToast({
            type: 'success',
            message: 'SVG exportado com sucesso!',
            description: 'Download iniciado automaticamente'
          })
          break
        case 'json':
          await exportAsJSON(nodes, edges)
          addToast({
            type: 'success',
            message: 'JSON exportado com sucesso!',
            description: 'Download iniciado automaticamente'
          })
          break
      }
      
      addRecentAction('export', `Exportado como ${type.toUpperCase()}`)
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Erro ao exportar',
        description: 'Tente novamente ou contate o suporte'
      })
    }
  }, [exportAsImage, exportAsJSON, exportAsSVG, addToast, addRecentAction])

  const handleSave = useCallback(() => {
    if (!currentDiagram) {
      addToast({
        type: 'warning',
        message: 'Nada para salvar',
        description: 'Crie um diagrama primeiro'
      })
      return
    }

    const name = `Diagrama ${new Date().toLocaleDateString('pt-BR')}`
    saveDiagram(name, 'Diagrama criado automaticamente')
    
    addToast({
      type: 'success',
      message: 'Diagrama salvo!',
      description: `Salvo como "${name}"`
    })
    
    addRecentAction('save', `Salvo: ${name}`)
  }, [currentDiagram, saveDiagram, addToast, addRecentAction])

  const handleDiagramGenerated = useCallback((diagram: DiagramData, prompt?: string, diagramConfig?: DiagramConfig) => {
    if (diagramRef.current && diagramRef.current.loadDiagram) {
      // Atualizar o diagrama no store
      setDiagram(diagram)
      diagramRef.current.loadDiagram(diagram)
      
      // Adicionar prompt ao histórico
      if (prompt) {
        addPromptToHistory({
          id: Date.now().toString(),
          text: prompt,
          config: diagramConfig || config,
          result: diagram,
          success: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      // Mostrar informações sobre o diagrama criado
      let message = `Diagrama criado com ${diagram.nodes.length} elementos`
      let description = ''
      
      if (diagramConfig) {
        if (diagramConfig.autoMode) {
          description = 'IA escolheu automaticamente as melhores configurações'
        } else {
          description = `Formato: ${diagramConfig.format}, Complexidade: ${diagramConfig.complexity}`
        }
      }

      if (lastResult?.autoFixed) {
        if (lastResult.fallbackUsed) {
          addToast({
            type: 'warning',
            message: 'Diagrama de fallback criado',
            description: 'A IA teve dificuldades com o prompt original e criou uma versão simplificada.'
          })
        } else {
          addToast({
            type: 'success',
            message: `${message} e corrigido automaticamente`,
            description: description || 'Sistema de auto-correção ativado'
          })
        }
      } else {
        addToast({
          type: 'success',
          message,
          description: description || 'Diagrama gerado com sucesso!'
        })
      }

      addRecentAction('generate', `Criado: ${prompt || 'Novo diagrama'}`)
    }
  }, [setDiagram, addPromptToHistory, config, lastResult, addToast, addRecentAction])

  const handleRequestCorrection = useCallback(async (errorDetails: string) => {
    if (!diagramRef.current || !currentDiagram) {
      addToast({
        type: 'error',
        message: 'Não é possível corrigir',
        description: 'Diagrama não encontrado'
      })
      return
    }

    const { nodes, edges } = diagramRef.current.getNodesAndEdges()
    
    addToast({
      type: 'info',
      message: '🔄 Corrigindo diagrama...',
      description: 'IA analisando erros detectados'
    })
    
    try {
      // Usar o último prompt do histórico
      const recentPrompts = useAppStore.getState().getRecentPrompts(1)
      const lastPrompt = recentPrompts[0]?.text || 'Corrigir diagrama'
      
      const correctedDiagram = await correctDiagram(lastPrompt, { nodes, edges }, errorDetails)
      
      if (correctedDiagram) {
        setDiagram(correctedDiagram)
        diagramRef.current.loadDiagram(correctedDiagram)
        
        if (lastResult?.fallbackUsed) {
          addToast({
            type: 'warning',
            message: '✅ Diagrama corrigido com fallback',
            description: 'Erros complexos requereram simplificação'
          })
        } else {
          addToast({
            type: 'success',
            message: '✅ Diagrama corrigido automaticamente!',
            description: 'IA resolveu os problemas detectados'
          })
        }
        
        addRecentAction('correction', 'Correção automática aplicada')
      } else {
        addToast({
          type: 'error',
          message: '❌ Correção falhou',
          description: 'Não foi possível corrigir automaticamente'
        })
      }
    } catch (error) {
      console.error('Erro na correção:', error)
      addToast({
        type: 'error',
        message: '❌ Erro durante correção',
        description: 'Tente criar um novo diagrama'
      })
    }
  }, [currentDiagram, correctDiagram, lastResult, setDiagram, addToast, addRecentAction])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header 
        onTogglePrompt={togglePromptPanel}
        onExport={handleExport}
        onSave={handleSave}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        showPromptPanel={ui.promptPanelOpen}
      />
      
      <motion.div 
        className="flex flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {ui.promptPanelOpen && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 xl:w-96 flex-shrink-0"
            >
              <PromptPanel 
                onDiagramGenerated={handleDiagramGenerated}
                onClose={togglePromptPanel}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.main 
          className="flex-1 relative overflow-hidden"
          layout
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
          <DiagramEditor 
            ref={diagramRef} 
            onOpenPrompt={togglePromptPanel}
            onRequestCorrection={handleRequestCorrection}
            currentConfig={config}
            showStats={true}
          />
          
          {/* Indicador de correção em andamento */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 backdrop-blur-sm"
              >
                <motion.div
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="font-medium">Corrigindo diagrama com IA...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toast personalizado do Zustand */}
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className={`
                  fixed bottom-4 right-4 max-w-sm p-4 rounded-xl shadow-2xl z-50 backdrop-blur-sm
                  ${toast.type === 'success' ? 'bg-green-500/90 text-white' : ''}
                  ${toast.type === 'error' ? 'bg-red-500/90 text-white' : ''}
                  ${toast.type === 'warning' ? 'bg-yellow-500/90 text-white' : ''}
                  ${toast.type === 'info' ? 'bg-blue-500/90 text-white' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold">{toast.message}</h4>
                    {toast.description && (
                      <p className="text-sm opacity-90 mt-1">{toast.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => useAppStore.getState().removeToast(toast.id)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.main>
      </motion.div>
      
      {/* Toast Container original (backup) */}
      <ToastContainer />
    </div>
  )
}