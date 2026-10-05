'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Accessibility, 
  Eye, 
  EyeOff, 
  Type, 
  Contrast, 
  Volume2,
  VolumeX,
  Settings,
  X,
  Sun,
  Moon,
  Minus,
  Plus
} from 'lucide-react'
import { useAccessibilityPreferences, useHighContrast, useScreenReader } from '../../hooks/useAccessibility'
import { cn } from '../../lib/utils'

interface AccessibilityToolbarProps {
  className?: string
}

export default function AccessibilityToolbar({ className }: AccessibilityToolbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)

  const preferences = useAccessibilityPreferences()
  const { isHighContrast, toggleHighContrast } = useHighContrast()
  const { announce } = useScreenReader()

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 2, 24)
    setFontSize(newSize)
    document.documentElement.style.fontSize = `${newSize}px`
    announce(`Tamanho da fonte aumentado para ${newSize}px`)
  }

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 2, 12)
    setFontSize(newSize)
    document.documentElement.style.fontSize = `${newSize}px`
    announce(`Tamanho da fonte diminuído para ${newSize}px`)
  }

  const resetFontSize = () => {
    setFontSize(16)
    document.documentElement.style.fontSize = '16px'
    announce('Tamanho da fonte restaurado para padrão')
  }

  const toggleAnimations = () => {
    const newValue = !animationsEnabled
    setAnimationsEnabled(newValue)
    document.documentElement.classList.toggle('reduce-motion', !newValue)
    announce(newValue ? 'Animações ativadas' : 'Animações desativadas')
  }

  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    announce(newValue ? 'Sons ativados' : 'Sons desativados')
  }

  const handleHighContrastToggle = () => {
    toggleHighContrast()
    announce(isHighContrast ? 'Alto contraste desativado' : 'Alto contraste ativado')
  }

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {/* Botão de abertura */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Abrir ferramentas de acessibilidade"
        aria-expanded={isOpen}
      >
        <Accessibility size={24} />
      </motion.button>

      {/* Toolbar expandida */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            role="dialog"
            aria-label="Ferramentas de acessibilidade"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Acessibilidade
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Fechar ferramentas de acessibilidade"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4">
              {/* Tamanho da fonte */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tamanho da fonte
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={decreaseFontSize}
                    disabled={fontSize <= 12}
                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Diminuir tamanho da fonte"
                  >
                    <Minus size={16} />
                  </button>
                  
                  <span className="flex-1 text-center text-sm font-medium px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                    {fontSize}px
                  </span>
                  
                  <button
                    onClick={increaseFontSize}
                    disabled={fontSize >= 24}
                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Aumentar tamanho da fonte"
                  >
                    <Plus size={16} />
                  </button>
                  
                  <button
                    onClick={resetFontSize}
                    className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Padrão
                  </button>
                </div>
              </div>

              {/* Alto contraste */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alto contraste
                </label>
                <button
                  onClick={handleHighContrastToggle}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                    isHighContrast
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                  aria-pressed={isHighContrast}
                >
                  <Contrast size={16} />
                  {isHighContrast ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              {/* Animações */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Animações
                </label>
                <button
                  onClick={toggleAnimations}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                    animationsEnabled
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                  )}
                  aria-pressed={animationsEnabled}
                >
                  {animationsEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  {animationsEnabled ? 'Ativadas' : 'Desativadas'}
                </button>
              </div>

              {/* Sons */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Feedback sonoro
                </label>
                <button
                  onClick={toggleSound}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                    soundEnabled
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                  )}
                  aria-pressed={soundEnabled}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  {soundEnabled ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              {/* Informações sobre preferências do sistema */}
              {(preferences.prefersReducedMotion || preferences.prefersHighContrast) && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Preferências do sistema detectadas:
                  </h3>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    {preferences.prefersReducedMotion && (
                      <li>• Preferência por animações reduzidas</li>
                    )}
                    {preferences.prefersHighContrast && (
                      <li>• Preferência por alto contraste</li>
                    )}
                    {preferences.prefersReducedTransparency && (
                      <li>• Preferência por transparência reduzida</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Atalhos de teclado */}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                  Atalhos de teclado
                </summary>
                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Abrir IA:</span>
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+Enter</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Salvar:</span>
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Exportar:</span>
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+E</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Desfazer:</span>
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+Z</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Refazer:</span>
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+Y</kbd>
                  </div>
                </div>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen reader only announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" />
    </div>
  )
}
