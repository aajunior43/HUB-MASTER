'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Theme = 'light' | 'dark' | 'auto'
type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'custom'

interface ThemeSettings {
  theme: Theme
  colorScheme: ColorScheme
  fontSize: number
  highContrast: boolean
  reducedMotion: boolean
  customColors?: {
    primary: string
    secondary: string
    accent: string
  }
}

interface ThemeContextType {
  settings: ThemeSettings
  updateTheme: (theme: Theme) => void
  updateColorScheme: (scheme: ColorScheme) => void
  updateFontSize: (size: number) => void
  toggleHighContrast: () => void
  toggleReducedMotion: () => void
  updateCustomColors: (colors: { primary: string; secondary: string; accent: string }) => void
  resetToDefaults: () => void
  isDark: boolean
  isSystemDark: boolean
}

const defaultSettings: ThemeSettings = {
  theme: 'auto',
  colorScheme: 'blue',
  fontSize: 16,
  highContrast: false,
  reducedMotion: false,
}

const colorSchemes = {
  blue: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#06b6d4',
    light: {
      bg: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      muted: '#64748b'
    },
    dark: {
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      muted: '#94a3b8'
    }
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#64748b',
    accent: '#ec4899',
    light: {
      bg: '#ffffff',
      surface: '#faf5ff',
      text: '#1e293b',
      muted: '#64748b'
    },
    dark: {
      bg: '#1e1b4b',
      surface: '#312e81',
      text: '#f1f5f9',
      muted: '#94a3b8'
    }
  },
  green: {
    primary: '#22c55e',
    secondary: '#64748b',
    accent: '#f59e0b',
    light: {
      bg: '#ffffff',
      surface: '#f0fdf4',
      text: '#1e293b',
      muted: '#64748b'
    },
    dark: {
      bg: '#14532d',
      surface: '#166534',
      text: '#f1f5f9',
      muted: '#94a3b8'
    }
  },
  orange: {
    primary: '#f97316',
    secondary: '#64748b',
    accent: '#ef4444',
    light: {
      bg: '#ffffff',
      surface: '#fff7ed',
      text: '#1e293b',
      muted: '#64748b'
    },
    dark: {
      bg: '#9a3412',
      surface: '#c2410c',
      text: '#f1f5f9',
      muted: '#94a3b8'
    }
  },
  pink: {
    primary: '#ec4899',
    secondary: '#64748b',
    accent: '#8b5cf6',
    light: {
      bg: '#ffffff',
      surface: '#fdf2f8',
      text: '#1e293b',
      muted: '#64748b'
    },
    dark: {
      bg: '#9d174d',
      surface: '#be185d',
      text: '#f1f5f9',
      muted: '#94a3b8'
    }
  },
  custom: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#06b6d4',
    light: {
      bg: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      muted: '#64748b'
    },
    dark: {
      bg: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      muted: '#94a3b8'
    }
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings)
  const [isSystemDark, setIsSystemDark] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Detectar preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches)
    }

    setIsSystemDark(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Carregar configurações do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme-settings')
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved)
        setSettings({ ...defaultSettings, ...parsedSettings })
      } catch (error) {
        console.error('Error loading theme settings:', error)
      }
    }
    setIsLoaded(true)
  }, [])

  // Salvar configurações no localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('theme-settings', JSON.stringify(settings))
    }
  }, [settings, isLoaded])

  // Calcular se deve usar tema escuro
  const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && isSystemDark)

  // Aplicar tema no documento
  useEffect(() => {
    if (!isLoaded) return

    const root = document.documentElement
    
    // Aplicar classe de tema
    root.classList.toggle('dark', isDark)
    root.classList.toggle('high-contrast', settings.highContrast)
    root.classList.toggle('reduce-motion', settings.reducedMotion)
    
    // Aplicar tamanho da fonte
    root.style.fontSize = `${settings.fontSize}px`
    
    // Aplicar esquema de cores
    const scheme = colorSchemes[settings.colorScheme]
    const colors = isDark ? scheme.dark : scheme.light
    
    // Cores personalizadas
    if (settings.colorScheme === 'custom' && settings.customColors) {
      root.style.setProperty('--primary-color', settings.customColors.primary)
      root.style.setProperty('--secondary-color', settings.customColors.secondary)
      root.style.setProperty('--accent-color', settings.customColors.accent)
    } else {
      root.style.setProperty('--primary-color', scheme.primary)
      root.style.setProperty('--secondary-color', scheme.secondary)
      root.style.setProperty('--accent-color', scheme.accent)
    }
    
    // Cores de fundo e texto
    root.style.setProperty('--bg-color', colors.bg)
    root.style.setProperty('--surface-color', colors.surface)
    root.style.setProperty('--text-color', colors.text)
    root.style.setProperty('--muted-color', colors.muted)
    
  }, [settings, isDark, isLoaded])

  const updateTheme = (theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }))
  }

  const updateColorScheme = (colorScheme: ColorScheme) => {
    setSettings(prev => ({ ...prev, colorScheme }))
  }

  const updateFontSize = (fontSize: number) => {
    setSettings(prev => ({ ...prev, fontSize: Math.max(12, Math.min(24, fontSize)) }))
  }

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }))
  }

  const toggleReducedMotion = () => {
    setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }))
  }

  const updateCustomColors = (customColors: { primary: string; secondary: string; accent: string }) => {
    setSettings(prev => ({ ...prev, customColors, colorScheme: 'custom' }))
  }

  const resetToDefaults = () => {
    setSettings(defaultSettings)
  }

  const value: ThemeContextType = {
    settings,
    updateTheme,
    updateColorScheme,
    updateFontSize,
    toggleHighContrast,
    toggleReducedMotion,
    updateCustomColors,
    resetToDefaults,
    isDark,
    isSystemDark
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <motion.div
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={value}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${settings.theme}-${settings.colorScheme}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen transition-colors duration-300"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </ThemeContext.Provider>
  )
}

/**
 * Componente para seleção de tema
 */
interface ThemeSelectorProps {
  className?: string
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { settings, updateTheme, updateColorScheme, isDark } = useTheme()

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Claro', icon: '☀️' },
    { value: 'dark', label: 'Escuro', icon: '🌙' },
    { value: 'auto', label: 'Automático', icon: '🔄' },
  ]

  const schemes: { value: ColorScheme; label: string; color: string }[] = [
    { value: 'blue', label: 'Azul', color: '#3b82f6' },
    { value: 'purple', label: 'Roxo', color: '#8b5cf6' },
    { value: 'green', label: 'Verde', color: '#22c55e' },
    { value: 'orange', label: 'Laranja', color: '#f97316' },
    { value: 'pink', label: 'Rosa', color: '#ec4899' },
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Seleção de tema */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tema
        </label>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => updateTheme(theme.value)}
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                settings.theme === theme.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-1">{theme.icon}</span>
              <span className="text-xs font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de esquema de cores */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Esquema de cores
        </label>
        <div className="grid grid-cols-5 gap-2">
          {schemes.map((scheme) => (
            <button
              key={scheme.value}
              onClick={() => updateColorScheme(scheme.value)}
              className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                settings.colorScheme === scheme.value
                  ? 'border-current'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              style={{ 
                color: scheme.color,
                borderColor: settings.colorScheme === scheme.value ? scheme.color : undefined 
              }}
            >
              <div 
                className="w-6 h-6 rounded-full mb-1"
                style={{ backgroundColor: scheme.color }}
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {scheme.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { colorSchemes, type Theme, type ColorScheme, type ThemeSettings }
