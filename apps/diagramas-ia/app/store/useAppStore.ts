import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Node, Edge } from '@xyflow/react'
import { 
  DiagramData, 
  DiagramConfig, 
  AppState, 
  Toast,
  SavedDiagram,
  UserPreferences,
  AIPrompt 
} from '../types'
import { generateId } from '../lib/utils'

interface AppStore extends AppState {
  // ================== Diagram Actions ==================
  setDiagram: (diagram: DiagramData | null) => void
  updateNodes: (nodes: Node[]) => void
  updateEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  clearDiagram: () => void
  
  // ================== History Actions ==================
  pushHistory: (diagram: DiagramData) => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
  
  // ================== Selection Actions ==================
  selectNode: (nodeId: string) => void
  selectNodes: (nodeIds: string[]) => void
  deselectNode: (nodeId: string) => void
  deselectAllNodes: () => void
  selectEdge: (edgeId: string) => void
  selectEdges: (edgeIds: string[]) => void
  deselectEdge: (edgeId: string) => void
  deselectAllEdges: () => void
  deselectAll: () => void
  
  // ================== Clipboard Actions ==================
  copySelection: () => void
  paste: () => void
  cut: () => void
  
  // ================== UI Actions ==================
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  togglePromptPanel: () => void
  setPromptPanelOpen: (open: boolean) => void
  toggleSettings: () => void
  setSettingsOpen: (open: boolean) => void
  toggleFullscreen: () => void
  setFullscreen: (fullscreen: boolean) => void
  setZoom: (zoom: number) => void
  
  // ================== Loading Actions ==================
  setLoading: (loading: boolean) => void
  
  // ================== Toast Actions ==================
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  
  // ================== Config Actions ==================
  config: DiagramConfig
  setConfig: (config: DiagramConfig) => void
  updateConfig: (updates: Partial<DiagramConfig>) => void
  resetConfig: () => void
  
  // ================== Saved Diagrams ==================
  savedDiagrams: SavedDiagram[]
  saveDiagram: (name: string, description?: string) => void
  loadSavedDiagram: (id: string) => void
  deleteSavedDiagram: (id: string) => void
  updateSavedDiagram: (id: string, updates: Partial<SavedDiagram>) => void
  
  // ================== User Preferences ==================
  preferences: UserPreferences
  setPreferences: (preferences: UserPreferences) => void
  updatePreferences: (updates: Partial<UserPreferences>) => void
  
  // ================== AI Prompts History ==================
  promptHistory: AIPrompt[]
  addPromptToHistory: (prompt: AIPrompt) => void
  clearPromptHistory: () => void
  getRecentPrompts: (limit?: number) => AIPrompt[]
  
  // ================== Recent Actions ==================
  recentActions: Array<{
    id: string
    type: string
    description: string
    timestamp: number
  }>
  addRecentAction: (type: string, description: string) => void
  clearRecentActions: () => void
}

const defaultConfig: DiagramConfig = {
  format: 'flowchart',
  complexity: 'medium',
  style: 'modern',
  autoMode: true,
  detailedLabels: true,
  extraConnections: false,
  theme: 'light',
  animations: true,
  gridSnap: true,
  showMinimap: true,
  showControls: true,
}

const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'pt-BR',
  defaultConfig,
  autoSave: true,
  notifications: true,
  shortcuts: {
    'save': 'Ctrl+S',
    'undo': 'Ctrl+Z',
    'redo': 'Ctrl+Y',
    'copy': 'Ctrl+C',
    'paste': 'Ctrl+V',
    'cut': 'Ctrl+X',
    'selectAll': 'Ctrl+A',
    'delete': 'Delete',
    'export': 'Ctrl+E',
    'newDiagram': 'Ctrl+N',
  },
}

const MAX_HISTORY_SIZE = 50
const MAX_PROMPT_HISTORY = 100
const MAX_RECENT_ACTIONS = 50

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ================== Initial State ==================
      currentDiagram: null,
      isLoading: false,
      selectedNodes: [],
      selectedEdges: [],
      clipboard: { nodes: [], edges: [] },
      history: { past: [], present: null, future: [] },
      ui: {
        sidebarOpen: true,
        promptPanelOpen: false,
        settingsOpen: false,
        fullscreen: false,
        zoom: 1,
      },
      toasts: [],
      config: defaultConfig,
      savedDiagrams: [],
      preferences: defaultPreferences,
      promptHistory: [],
      recentActions: [],

      // ================== Diagram Actions ==================
      setDiagram: (diagram) => {
        set((state) => {
          if (diagram && state.currentDiagram) {
            // Adicionar ao histórico antes de atualizar
            const newPast = [...state.history.past, state.currentDiagram].slice(-MAX_HISTORY_SIZE)
            return {
              currentDiagram: diagram,
              history: {
                past: newPast,
                present: diagram,
                future: [],
              }
            }
          }
          return { 
            currentDiagram: diagram,
            history: { ...state.history, present: diagram }
          }
        })
      },

      updateNodes: (nodes) => {
        set((state) => {
          if (!state.currentDiagram) return state
          const newDiagram = { ...state.currentDiagram, nodes }
          return { currentDiagram: newDiagram }
        })
      },

      updateEdges: (edges) => {
        set((state) => {
          if (!state.currentDiagram) return state
          const newDiagram = { ...state.currentDiagram, edges }
          return { currentDiagram: newDiagram }
        })
      },

      addNode: (node) => {
        set((state) => {
          if (!state.currentDiagram) return state
          const nodes = [...state.currentDiagram.nodes, node]
          const newDiagram = { ...state.currentDiagram, nodes }
          return { currentDiagram: newDiagram }
        })
      },

      removeNode: (nodeId) => {
        set((state) => {
          if (!state.currentDiagram) return state
          const nodes = state.currentDiagram.nodes.filter(n => n.id !== nodeId)
          const edges = state.currentDiagram.edges.filter(e => 
            e.source !== nodeId && e.target !== nodeId
          )
          const newDiagram = { ...state.currentDiagram, nodes, edges }
          return { currentDiagram: newDiagram }
        })
      },

      addEdge: (edge) => {
        set((state) => {
          if (!state.currentDiagram) return state
          const edges = [...state.currentDiagram.edges, edge]
          const newDiagram = { ...state.currentDiagram, edges }
          return { currentDiagram: newDiagram }
        })
      },

      removeEdge: (edgeId) => {
        set((state) => {
          if (!state.currentDiagram) return state
          const edges = state.currentDiagram.edges.filter(e => e.id !== edgeId)
          const newDiagram = { ...state.currentDiagram, edges }
          return { currentDiagram: newDiagram }
        })
      },

      clearDiagram: () => {
        set({ currentDiagram: null, selectedNodes: [], selectedEdges: [] })
      },

      // ================== History Actions ==================
      pushHistory: (diagram) => {
        set((state) => {
          const newPast = state.history.present 
            ? [...state.history.past, state.history.present].slice(-MAX_HISTORY_SIZE)
            : state.history.past
          
          return {
            history: {
              past: newPast,
              present: diagram,
              future: [],
            }
          }
        })
      },

      undo: () => {
        set((state) => {
          const { past, present, future } = state.history
          if (past.length === 0) return state

          const previous = past[past.length - 1]
          const newPast = past.slice(0, past.length - 1)
          const newFuture = present ? [present, ...future] : future

          return {
            currentDiagram: previous,
            history: {
              past: newPast,
              present: previous,
              future: newFuture,
            }
          }
        })
      },

      redo: () => {
        set((state) => {
          const { past, present, future } = state.history
          if (future.length === 0) return state

          const next = future[0]
          const newFuture = future.slice(1)
          const newPast = present ? [...past, present] : past

          return {
            currentDiagram: next,
            history: {
              past: newPast,
              present: next,
              future: newFuture,
            }
          }
        })
      },

      clearHistory: () => {
        set((state) => ({
          history: {
            past: [],
            present: state.currentDiagram,
            future: [],
          }
        }))
      },

      // ================== Selection Actions ==================
      selectNode: (nodeId) => {
        set((state) => ({
          selectedNodes: [...state.selectedNodes, nodeId]
        }))
      },

      selectNodes: (nodeIds) => {
        set({ selectedNodes: nodeIds })
      },

      deselectNode: (nodeId) => {
        set((state) => ({
          selectedNodes: state.selectedNodes.filter(id => id !== nodeId)
        }))
      },

      deselectAllNodes: () => {
        set({ selectedNodes: [] })
      },

      selectEdge: (edgeId) => {
        set((state) => ({
          selectedEdges: [...state.selectedEdges, edgeId]
        }))
      },

      selectEdges: (edgeIds) => {
        set({ selectedEdges: edgeIds })
      },

      deselectEdge: (edgeId) => {
        set((state) => ({
          selectedEdges: state.selectedEdges.filter(id => id !== edgeId)
        }))
      },

      deselectAllEdges: () => {
        set({ selectedEdges: [] })
      },

      deselectAll: () => {
        set({ selectedNodes: [], selectedEdges: [] })
      },

      // ================== Clipboard Actions ==================
      copySelection: () => {
        set((state) => {
          if (!state.currentDiagram) return state
          
          const selectedNodes = state.currentDiagram.nodes.filter(n => 
            state.selectedNodes.includes(n.id)
          )
          const selectedEdges = state.currentDiagram.edges.filter(e => 
            state.selectedEdges.includes(e.id)
          )
          
          return {
            clipboard: { nodes: selectedNodes, edges: selectedEdges }
          }
        })
      },

      paste: () => {
        set((state) => {
          if (!state.currentDiagram || state.clipboard.nodes.length === 0) return state
          
          // Gerar novos IDs para evitar conflitos
          const nodeIdMap = new Map()
          const newNodes = state.clipboard.nodes.map(node => {
            const newId = generateId('node')
            nodeIdMap.set(node.id, newId)
            return {
              ...node,
              id: newId,
              position: {
                x: node.position.x + 50,
                y: node.position.y + 50,
              }
            }
          })
          
          const newEdges = state.clipboard.edges
            .filter(edge => nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target))
            .map(edge => ({
              ...edge,
              id: generateId('edge'),
              source: nodeIdMap.get(edge.source),
              target: nodeIdMap.get(edge.target),
            }))
          
          const allNodes = [...state.currentDiagram.nodes, ...newNodes]
          const allEdges = [...state.currentDiagram.edges, ...newEdges]
          
          return {
            currentDiagram: {
              ...state.currentDiagram,
              nodes: allNodes,
              edges: allEdges,
            }
          }
        })
      },

      cut: () => {
        const { copySelection, removeNode, removeEdge } = get()
        const state = get()
        
        copySelection()
        
        // Remover nós e arestas selecionados
        state.selectedNodes.forEach(removeNode)
        state.selectedEdges.forEach(removeEdge)
        
        set({ selectedNodes: [], selectedEdges: [] })
      },

      // ================== UI Actions ==================
      toggleSidebar: () => {
        set((state) => ({
          ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen }
        }))
      },

      setSidebarOpen: (open) => {
        set((state) => ({
          ui: { ...state.ui, sidebarOpen: open }
        }))
      },

      togglePromptPanel: () => {
        set((state) => ({
          ui: { ...state.ui, promptPanelOpen: !state.ui.promptPanelOpen }
        }))
      },

      setPromptPanelOpen: (open) => {
        set((state) => ({
          ui: { ...state.ui, promptPanelOpen: open }
        }))
      },

      toggleSettings: () => {
        set((state) => ({
          ui: { ...state.ui, settingsOpen: !state.ui.settingsOpen }
        }))
      },

      setSettingsOpen: (open) => {
        set((state) => ({
          ui: { ...state.ui, settingsOpen: open }
        }))
      },

      toggleFullscreen: () => {
        set((state) => ({
          ui: { ...state.ui, fullscreen: !state.ui.fullscreen }
        }))
      },

      setFullscreen: (fullscreen) => {
        set((state) => ({
          ui: { ...state.ui, fullscreen }
        }))
      },

      setZoom: (zoom) => {
        set((state) => ({
          ui: { ...state.ui, zoom }
        }))
      },

      // ================== Loading Actions ==================
      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      // ================== Toast Actions ==================
      addToast: (toast) => {
        const id = generateId('toast')
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }]
        }))
        
        // Auto remove after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, toast.duration || 5000)
        }
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id)
        }))
      },

      clearToasts: () => {
        set({ toasts: [] })
      },

      // ================== Config Actions ==================
      setConfig: (config) => {
        set({ config })
      },

      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates }
        }))
      },

      resetConfig: () => {
        set({ config: defaultConfig })
      },

      // ================== Saved Diagrams ==================
      saveDiagram: (name, description) => {
        set((state) => {
          if (!state.currentDiagram) return state
          
          const savedDiagram: SavedDiagram = {
            id: generateId('diagram'),
            name,
            description,
            data: state.currentDiagram,
            tags: [],
            isPublic: false,
            views: 0,
            likes: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          
          return {
            savedDiagrams: [...state.savedDiagrams, savedDiagram]
          }
        })
      },

      loadSavedDiagram: (id) => {
        set((state) => {
          const diagram = state.savedDiagrams.find(d => d.id === id)
          if (!diagram) return state
          
          return {
            currentDiagram: diagram.data,
            selectedNodes: [],
            selectedEdges: [],
          }
        })
      },

      deleteSavedDiagram: (id) => {
        set((state) => ({
          savedDiagrams: state.savedDiagrams.filter(d => d.id !== id)
        }))
      },

      updateSavedDiagram: (id, updates) => {
        set((state) => ({
          savedDiagrams: state.savedDiagrams.map(d => 
            d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
          )
        }))
      },

      // ================== User Preferences ==================
      setPreferences: (preferences) => {
        set({ preferences })
      },

      updatePreferences: (updates) => {
        set((state) => ({
          preferences: { ...state.preferences, ...updates }
        }))
      },

      // ================== AI Prompts History ==================
      addPromptToHistory: (prompt) => {
        set((state) => {
          const newHistory = [prompt, ...state.promptHistory].slice(0, MAX_PROMPT_HISTORY)
          return { promptHistory: newHistory }
        })
      },

      clearPromptHistory: () => {
        set({ promptHistory: [] })
      },

      getRecentPrompts: (limit = 10) => {
        return get().promptHistory.slice(0, limit)
      },

      // ================== Recent Actions ==================
      addRecentAction: (type, description) => {
        set((state) => {
          const action = {
            id: generateId('action'),
            type,
            description,
            timestamp: Date.now(),
          }
          
          const newActions = [action, ...state.recentActions].slice(0, MAX_RECENT_ACTIONS)
          return { recentActions: newActions }
        })
      },

      clearRecentActions: () => {
        set({ recentActions: [] })
      },
    }),
    {
      name: 'diagramas-ia-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        preferences: state.preferences,
        savedDiagrams: state.savedDiagrams,
        promptHistory: state.promptHistory,
        ui: {
          sidebarOpen: state.ui.sidebarOpen,
          zoom: state.ui.zoom,
        },
      }),
    }
  )
)

// ================== Computed Values ==================
export const useCanUndo = () => useAppStore(state => state.history.past.length > 0)
export const useCanRedo = () => useAppStore(state => state.history.future.length > 0)
export const useHasSelection = () => useAppStore(state => 
  state.selectedNodes.length > 0 || state.selectedEdges.length > 0
)
export const useSelectedCount = () => useAppStore(state => 
  state.selectedNodes.length + state.selectedEdges.length
)
export const useDiagramStats = () => useAppStore(state => {
  if (!state.currentDiagram) return { nodes: 0, edges: 0, connections: 0 }
  
  const nodes = state.currentDiagram.nodes.length
  const edges = state.currentDiagram.edges.length
  const connections = edges * 2 // cada edge conecta 2 nós
  
  return { nodes, edges, connections }
})
