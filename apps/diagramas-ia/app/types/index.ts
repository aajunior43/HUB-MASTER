import { Node, Edge } from '@xyflow/react'

// ================== Tipos Base ==================

export interface BaseEntity {
  id: string
  createdAt: number
  updatedAt: number
}

// ================== Diagrama ==================

export interface DiagramData {
  nodes: Node[]
  edges: Edge[]
  metadata?: DiagramMetadata
}

export interface DiagramMetadata {
  name?: string
  description?: string
  tags?: string[]
  author?: string
  version?: string
  thumbnail?: string
}

export interface SavedDiagram extends BaseEntity {
  name: string
  description?: string
  data: DiagramData
  thumbnail?: string
  tags: string[]
  isPublic: boolean
  views: number
  likes: number
}

// ================== Configurações ==================

export type DiagramFormat = 
  | 'flowchart' 
  | 'mindmap' 
  | 'sequence' 
  | 'class' 
  | 'er' 
  | 'gantt'
  | 'network'
  | 'tree'

export type DiagramComplexity = 
  | 'simple' 
  | 'medium' 
  | 'complex'
  | 'enterprise'

export type DiagramStyle = 
  | 'modern' 
  | 'classic' 
  | 'minimal' 
  | 'colorful'
  | 'dark'
  | 'neon'

export interface DiagramConfig {
  format: DiagramFormat
  complexity: DiagramComplexity
  style: DiagramStyle
  autoMode: boolean
  detailedLabels: boolean
  extraConnections: boolean
  theme: 'light' | 'dark' | 'auto'
  animations: boolean
  gridSnap: boolean
  showMinimap: boolean
  showControls: boolean
}

// ================== IA e Prompts ==================

export interface AIPrompt extends BaseEntity {
  text: string
  config: DiagramConfig
  result?: DiagramData
  success: boolean
  errorMessage?: string
  processingTime?: number
  tokensUsed?: number
}

export interface PromptExample {
  id: string
  title: string
  description: string
  prompt: string
  config: Partial<DiagramConfig>
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
}

export interface AIGenerationResult {
  diagram: DiagramData
  success: boolean
  errorMessage?: string
  autoFixed: boolean
  fallbackUsed: boolean
  processingTime: number
  tokensUsed?: number
  confidence?: number
}

// ================== Validação ==================

export interface ValidationError {
  type: 'error' | 'warning' | 'info'
  message: string
  nodeId?: string
  edgeId?: string
  suggestion?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
  score: number // 0-100
}

// ================== Exportação ==================

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf' | 'json' | 'xml'

export interface ExportOptions {
  format: ExportFormat
  quality?: number // 0-1 para imagens
  includeBackground?: boolean
  includeWatermark?: boolean
  customSize?: {
    width: number
    height: number
  }
}

export interface ExportResult {
  success: boolean
  data?: Blob | string
  filename: string
  errorMessage?: string
}

// ================== Usuário e Sessão ==================

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
  preferences: UserPreferences
  stats: UserStats
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: 'pt-BR' | 'en-US' | 'es-ES'
  defaultConfig: DiagramConfig
  autoSave: boolean
  notifications: boolean
  shortcuts: Record<string, string>
}

export interface UserStats {
  diagramsCreated: number
  totalNodes: number
  totalEdges: number
  aiUsage: number
  favoriteFormat: DiagramFormat
  createdAt: number
  lastActive: number
}

// ================== Interface e Estado ==================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface AppState {
  currentDiagram: DiagramData | null
  isLoading: boolean
  selectedNodes: string[]
  selectedEdges: string[]
  clipboard: {
    nodes: Node[]
    edges: Edge[]
  }
  history: {
    past: DiagramData[]
    present: DiagramData | null
    future: DiagramData[]
  }
  ui: {
    sidebarOpen: boolean
    promptPanelOpen: boolean
    settingsOpen: boolean
    fullscreen: boolean
    zoom: number
  }
}

// ================== Hooks e Context ==================

export interface DiagramContextValue {
  diagram: DiagramData | null
  setDiagram: (diagram: DiagramData) => void
  config: DiagramConfig
  setConfig: (config: DiagramConfig) => void
  isGenerating: boolean
  generateDiagram: (prompt: string) => Promise<void>
  exportDiagram: (options: ExportOptions) => Promise<ExportResult>
  validateDiagram: () => ValidationResult
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

// ================== API ==================

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface APIError {
  code: string
  message: string
  details?: any
}

export interface GenerateDiagramRequest {
  prompt: string
  config: DiagramConfig
  existingDiagram?: DiagramData
  correctionContext?: string
}

export interface GenerateDiagramResponse {
  diagram: DiagramData
  metadata: {
    processingTime: number
    tokensUsed?: number
    confidence: number
    autoFixed: boolean
    fallbackUsed: boolean
  }
}

// ================== Analytics ==================

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp: number
  userId?: string
  sessionId: string
}

export interface DiagramAnalytics {
  totalViews: number
  totalGenerations: number
  averageProcessingTime: number
  mostUsedFormats: Record<DiagramFormat, number>
  mostUsedComplexity: Record<DiagramComplexity, number>
  errorRate: number
  userSatisfaction: number
}

// ================== Utilitários de Tipo ==================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

// ================== Componentes ==================

export interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface IconProps extends ComponentProps {
  size?: number | string
  color?: string
  strokeWidth?: number
}

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export interface ModalProps extends ComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

// ================== Constantes de Tipo ==================

export const DIAGRAM_FORMATS = [
  'flowchart',
  'mindmap', 
  'sequence',
  'class',
  'er',
  'gantt',
  'network',
  'tree'
] as const

export const DIAGRAM_COMPLEXITIES = [
  'simple',
  'medium', 
  'complex',
  'enterprise'
] as const

export const DIAGRAM_STYLES = [
  'modern',
  'classic',
  'minimal', 
  'colorful',
  'dark',
  'neon'
] as const

export const EXPORT_FORMATS = [
  'png',
  'jpg',
  'svg', 
  'pdf',
  'json',
  'xml'
] as const

export const TOAST_TYPES = [
  'success',
  'error',
  'warning',
  'info'
] as const
