'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Download, 
  Settings, 
  Sparkles, 
  Zap, 
  Save, 
  FolderOpen,
  Sun,
  Moon,
  Monitor,
  Maximize,
  Minimize,
  Undo,
  Redo,
  Copy,
  Scissors,
  ClipboardPaste,
  Search,
  HelpCircle,
  Menu,
  X
} from 'lucide-react'
import { cn } from '../lib/utils'
import ExportMenu from './ExportMenu'
import { useAppStore } from '../store/useAppStore'

interface HeaderProps {
  onTogglePrompt: () => void
  showPromptPanel: boolean
  onExport: (format: 'png' | 'svg' | 'json') => void
  onSave?: () => void
  onLoad?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme)
    // Implementar lógica de tema aqui
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // Auto theme baseado na preferência do sistema
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const themeIcons = {
    light: Sun,
    dark: Moon,
    auto: Monitor
  }

  const Icon = themeIcons[theme]

  return (
    <div className="relative">
      <button
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Alterar tema"
      >
        <Icon size={18} />
      </button>
    </div>
  )
}

const QuickActions = ({ onUndo, onRedo, canUndo, canRedo }: {
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}) => {
  const { copySelection, paste, cut, hasSelection } = useAppStore()

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
          canUndo 
            ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" 
            : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
        )}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo size={14} />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
          canRedo 
            ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" 
            : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
        )}
        title="Refazer (Ctrl+Y)"
      >
        <Redo size={14} />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        onClick={copySelection}
        disabled={!hasSelection}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
          hasSelection 
            ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" 
            : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
        )}
        title="Copiar (Ctrl+C)"
      >
        <Copy size={14} />
      </button>

      <button
        onClick={cut}
        disabled={!hasSelection}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
          hasSelection 
            ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" 
            : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
        )}
        title="Recortar (Ctrl+X)"
      >
        <Scissors size={14} />
      </button>

      <button
        onClick={paste}
        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        title="Colar (Ctrl+V)"
      >
        <ClipboardPaste size={14} />
      </button>
    </div>
  )
}

export default function Header({ 
  onTogglePrompt, 
  showPromptPanel, 
  onExport, 
  onSave,
  onLoad,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: HeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const exportButtonRef = useRef<HTMLButtonElement>(null)

  const { ui, toggleFullscreen } = useAppStore()

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    toggleFullscreen()
  }

  return (
    <motion.header 
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3 flex items-center justify-between relative z-50"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo e ações principais */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
            Diagramas IA
          </h1>
        </motion.div>

        {/* Menu mobile */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Ações principais - Desktop */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Botão IA */}
          <motion.button
            onClick={onTogglePrompt}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
              showPromptPanel 
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Brain size={18} />
            <span className="hidden sm:inline">
              {showPromptPanel ? 'IA Ativa' : 'Ativar IA'}
            </span>
            {showPromptPanel && (
              <motion.div
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
          </motion.button>

          {/* Ações rápidas */}
          <QuickActions 
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>
      </div>

      {/* Ações secundárias */}
      <div className="flex items-center gap-2">
        {/* Botões de arquivo - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Salvar (Ctrl+S)"
            >
              <Save size={18} />
            </button>
          )}

          {onLoad && (
            <button
              onClick={onLoad}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Abrir"
            >
              <FolderOpen size={18} />
            </button>
          )}

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        </div>

        {/* Controles de visualização */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleFullscreenToggle}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          <ThemeToggle />

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Exportar */}
          <div className="relative">
            <button 
              ref={exportButtonRef}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Exportar"
            >
              <Download size={18} />
            </button>
            
            <AnimatePresence>
              {showExportMenu && (
                <ExportMenu 
                  onExport={onExport}
                  onClose={() => setShowExportMenu(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Configurações */}
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Configurações"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Menu mobile expandido */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 p-4 lg:hidden"
          >
            <div className="flex flex-col gap-3">
              {/* Ações rápidas mobile */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ações Rápidas</span>
                <QuickActions 
                  onUndo={onUndo}
                  onRedo={onRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                />
              </div>

              {/* Botões de arquivo mobile */}
              <div className="flex items-center gap-2">
                {onSave && (
                  <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-1"
                  >
                    <Save size={16} />
                    <span className="text-sm">Salvar</span>
                  </button>
                )}

                {onLoad && (
                  <button
                    onClick={onLoad}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-1"
                  >
                    <FolderOpen size={16} />
                    <span className="text-sm">Abrir</span>
                  </button>
                )}
              </div>

              {/* Ajuda */}
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <HelpCircle size={16} />
                <span className="text-sm">Ajuda</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}