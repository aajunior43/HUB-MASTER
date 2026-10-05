'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HexColorPicker } from 'react-colorful'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import { 
  Palette, 
  Save, 
  RefreshCw, 
  Eye, 
  Download, 
  Upload,
  Copy,
  Check,
  X,
  Sun,
  Moon,
  Monitor,
  Zap,
  Sparkles
} from 'lucide-react'

// Estender colord com plugin de mistura
extend([mixPlugin])

export interface CustomTheme {
  id: string
  name: string
  description?: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
    info: string
  }
  gradients: {
    primary: string
    secondary: string
    accent: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
    }
    fontWeight: {
      normal: string
      medium: string
      semibold: string
      bold: string
    }
  }
  animations: {
    duration: {
      fast: string
      normal: string
      slow: string
    }
    easing: {
      ease: string
      easeIn: string
      easeOut: string
      easeInOut: string
    }
  }
  createdAt: number
  updatedAt: number
}

const defaultTheme: CustomTheme = {
  id: 'default',
  name: 'Tema Padrão',
  description: 'Tema limpo e moderno',
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  },
  gradients: {
    primary: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    secondary: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    accent: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
}

const presetThemes: CustomTheme[] = [
  {
    ...defaultTheme,
    id: 'ocean',
    name: 'Oceano',
    description: 'Tons azuis inspirados no mar',
    colors: {
      ...defaultTheme.colors,
      primary: '#0891b2',
      secondary: '#0284c7',
      accent: '#06b6d4',
      background: '#f0f9ff',
      surface: '#e0f2fe'
    }
  },
  {
    ...defaultTheme,
    id: 'sunset',
    name: 'Pôr do Sol',
    description: 'Cores quentes e vibrantes',
    colors: {
      ...defaultTheme.colors,
      primary: '#ea580c',
      secondary: '#dc2626',
      accent: '#f59e0b',
      background: '#fef7ed',
      surface: '#fed7aa'
    }
  },
  {
    ...defaultTheme,
    id: 'forest',
    name: 'Floresta',
    description: 'Verde natural e relaxante',
    colors: {
      ...defaultTheme.colors,
      primary: '#059669',
      secondary: '#047857',
      accent: '#84cc16',
      background: '#f0fdf4',
      surface: '#dcfce7'
    }
  },
  {
    ...defaultTheme,
    id: 'dark',
    name: 'Escuro Moderno',
    description: 'Tema escuro elegante',
    colors: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      accent: '#fbbf24',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#374151',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa'
    }
  }
]

interface ThemeEditorProps {
  isOpen: boolean
  onClose: () => void
  currentTheme?: CustomTheme
  onThemeChange?: (theme: CustomTheme) => void
  onThemeSave?: (theme: CustomTheme) => void
}

export default function ThemeEditor({ 
  isOpen, 
  onClose, 
  currentTheme, 
  onThemeChange,
  onThemeSave 
}: ThemeEditorProps) {
  const [theme, setTheme] = useState<CustomTheme>(currentTheme || defaultTheme)
  const [activeColorKey, setActiveColorKey] = useState<string>('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark' | 'auto'>('light')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleColorChange = useCallback((color: string) => {
    if (!activeColorKey) return

    setTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [activeColorKey]: color
      },
      updatedAt: Date.now()
    }))

    // Gerar gradientes automaticamente
    if (['primary', 'secondary', 'accent'].includes(activeColorKey)) {
      const darkerColor = colord(color).darken(0.2).toHex()
      setTheme(prev => ({
        ...prev,
        gradients: {
          ...prev.gradients,
          [activeColorKey]: `linear-gradient(135deg, ${color} 0%, ${darkerColor} 100%)`
        }
      }))
    }
  }, [activeColorKey])

  const generateHarmoniousColors = useCallback(async () => {
    setIsGenerating(true)
    
    // Simular geração inteligente baseada na cor primária
    const baseColor = colord(theme.colors.primary)
    const complementary = baseColor.rotate(180)
    const analogous1 = baseColor.rotate(30)
    const analogous2 = baseColor.rotate(-30)
    const triadic = baseColor.rotate(120)

    await new Promise(resolve => setTimeout(resolve, 1000)) // Simular processamento

    setTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        secondary: complementary.toHex(),
        accent: triadic.toHex(),
        success: analogous1.toHex(),
        warning: analogous2.toHex(),
      },
      gradients: {
        primary: `linear-gradient(135deg, ${baseColor.toHex()} 0%, ${baseColor.darken(0.2).toHex()} 100%)`,
        secondary: `linear-gradient(135deg, ${complementary.toHex()} 0%, ${complementary.darken(0.2).toHex()} 100%)`,
        accent: `linear-gradient(135deg, ${triadic.toHex()} 0%, ${triadic.darken(0.2).toHex()} 100%)`
      },
      updatedAt: Date.now()
    }))

    setIsGenerating(false)
  }, [theme.colors.primary])

  const applyPresetTheme = useCallback((preset: CustomTheme) => {
    setTheme({
      ...preset,
      id: theme.id,
      name: theme.name,
      updatedAt: Date.now()
    })
  }, [theme.id, theme.name])

  const exportTheme = useCallback(() => {
    const themeData = JSON.stringify(theme, null, 2)
    const blob = new Blob([themeData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [theme])

  const copyThemeCSS = useCallback(async () => {
    const cssVariables = `
:root {
  /* Cores */
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-text: ${theme.colors.text};
  --color-text-secondary: ${theme.colors.textSecondary};
  --color-border: ${theme.colors.border};
  --color-success: ${theme.colors.success};
  --color-warning: ${theme.colors.warning};
  --color-error: ${theme.colors.error};
  --color-info: ${theme.colors.info};

  /* Gradientes */
  --gradient-primary: ${theme.gradients.primary};
  --gradient-secondary: ${theme.gradients.secondary};
  --gradient-accent: ${theme.gradients.accent};

  /* Sombras */
  --shadow-sm: ${theme.shadows.sm};
  --shadow-md: ${theme.shadows.md};
  --shadow-lg: ${theme.shadows.lg};

  /* Border Radius */
  --radius-sm: ${theme.borderRadius.sm};
  --radius-md: ${theme.borderRadius.md};
  --radius-lg: ${theme.borderRadius.lg};

  /* Tipografia */
  --font-family: ${theme.typography.fontFamily};
  --font-size-xs: ${theme.typography.fontSize.xs};
  --font-size-sm: ${theme.typography.fontSize.sm};
  --font-size-base: ${theme.typography.fontSize.base};
  --font-size-lg: ${theme.typography.fontSize.lg};
  --font-size-xl: ${theme.typography.fontSize.xl};
  --font-size-2xl: ${theme.typography.fontSize['2xl']};

  /* Animações */
  --duration-fast: ${theme.animations.duration.fast};
  --duration-normal: ${theme.animations.duration.normal};
  --duration-slow: ${theme.animations.duration.slow};
}
    `.trim()

    await navigator.clipboard.writeText(cssVariables)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [theme])

  const handleSave = useCallback(() => {
    if (onThemeSave) {
      onThemeSave(theme)
    }
    onClose()
  }, [theme, onThemeSave, onClose])

  const colorKeys = Object.keys(theme.colors) as Array<keyof typeof theme.colors>

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Editor de Temas
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customize completamente a aparência da aplicação
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex max-h-[calc(90vh-140px)]">
              {/* Painel de Configuração */}
              <div className="w-1/2 p-6 space-y-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                {/* Temas Pré-definidos */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Temas Pré-definidos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {presetThemes.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPresetTheme(preset)}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.colors.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.colors.secondary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.colors.accent }}
                          />
                        </div>
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-gray-500">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cores Primárias */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Paleta de Cores</h3>
                    <button
                      onClick={generateHarmoniousColors}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                    >
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isGenerating ? 'Gerando...' : 'Gerar Harmonia'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {colorKeys.map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setActiveColorKey(key)
                          setShowColorPicker(true)
                        }}
                        className="group relative p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div 
                          className="w-full h-8 rounded-md mb-2" 
                          style={{ backgroundColor: theme.colors[key] }}
                        />
                        <div className="text-xs font-medium capitalize">{key}</div>
                        <div className="text-xs text-gray-500 font-mono">{theme.colors[key]}</div>
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                {showColorPicker && activeColorKey && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium capitalize">Editando: {activeColorKey}</h4>
                      <button
                        onClick={() => setShowColorPicker(false)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <HexColorPicker
                      color={theme.colors[activeColorKey as keyof typeof theme.colors]}
                      onChange={handleColorChange}
                    />
                    <input
                      type="text"
                      value={theme.colors[activeColorKey as keyof typeof theme.colors]}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-full mt-3 px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg"
                      placeholder="#000000"
                    />
                  </motion.div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={exportTheme}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar JSON
                  </button>
                  
                  <button
                    onClick={copyThemeCSS}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'Copiado!' : 'Copiar CSS'}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="w-1/2 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Preview</h3>
                  <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <button
                      onClick={() => setPreviewMode('light')}
                      className={`p-2 rounded-md transition-colors ${
                        previewMode === 'light' 
                          ? 'bg-white dark:bg-gray-600 shadow-sm' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('dark')}
                      className={`p-2 rounded-md transition-colors ${
                        previewMode === 'dark' 
                          ? 'bg-white dark:bg-gray-600 shadow-sm' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                <div 
                  className="p-6 rounded-lg border-2 space-y-4"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                >
                  {/* Header Preview */}
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: theme.colors.surface }}
                  >
                    <h4 className="text-lg font-semibold mb-2">Header do Diagrama</h4>
                    <p style={{ color: theme.colors.textSecondary }}>
                      Subtitle example text
                    </p>
                  </div>

                  {/* Buttons Preview */}
                  <div className="flex gap-3">
                    <button 
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      Primary
                    </button>
                    <button 
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: theme.colors.secondary }}
                    >
                      Secondary
                    </button>
                    <button 
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: theme.colors.accent }}
                    >
                      Accent
                    </button>
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-2">
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: theme.colors.success }}
                    >
                      Success
                    </span>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: theme.colors.warning }}
                    >
                      Warning
                    </span>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: theme.colors.error }}
                    >
                      Error
                    </span>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: theme.colors.info }}
                    >
                      Info
                    </span>
                  </div>

                  {/* Card Preview */}
                  <div 
                    className="p-4 rounded-lg"
                    style={{ 
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      boxShadow: theme.shadows.md
                    }}
                  >
                    <h5 className="font-medium mb-2">Card Component</h5>
                    <p 
                      className="text-sm"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Este é um exemplo de como os cards ficarão com o tema atual.
                    </p>
                  </div>

                  {/* Gradient Preview */}
                  <div className="space-y-2">
                    <div 
                      className="h-8 rounded-lg"
                      style={{ background: theme.gradients.primary }}
                    />
                    <div 
                      className="h-8 rounded-lg"
                      style={{ background: theme.gradients.secondary }}
                    />
                    <div 
                      className="h-8 rounded-lg"
                      style={{ background: theme.gradients.accent }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Tema: {theme.name} • Atualizado: {new Date(theme.updatedAt).toLocaleString('pt-BR')}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onThemeChange?.(theme)}
                  className="px-4 py-2 border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Tema
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
