'use client'

import { useState, useEffect, useCallback, useContext, createContext } from 'react'
import { CustomTheme } from '../components/ThemeEditor'

interface ThemeContextValue {
  currentTheme: CustomTheme
  customThemes: CustomTheme[]
  setTheme: (theme: CustomTheme) => void
  saveTheme: (theme: CustomTheme) => void
  deleteTheme: (themeId: string) => void
  loadTheme: (themeId: string) => void
  exportTheme: (theme: CustomTheme) => void
  importTheme: (themeData: string) => Promise<CustomTheme>
  applyThemeToDOM: (theme: CustomTheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useThemeManager = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeManager deve ser usado dentro de um ThemeProvider')
  }
  return context
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

export function useThemeManagerHook() {
  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(defaultTheme)
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([])

  // Carregar temas salvos do localStorage
  useEffect(() => {
    const savedThemes = localStorage.getItem('diagramas-ia-custom-themes')
    const currentThemeId = localStorage.getItem('diagramas-ia-current-theme')

    if (savedThemes) {
      try {
        const themes = JSON.parse(savedThemes) as CustomTheme[]
        setCustomThemes(themes)

        // Carregar tema atual
        if (currentThemeId) {
          const theme = themes.find(t => t.id === currentThemeId) || defaultTheme
          setCurrentTheme(theme)
          applyThemeToDOM(theme)
        }
      } catch (error) {
        console.error('Erro ao carregar temas salvos:', error)
      }
    }
  }, [])

  // Aplicar tema ao DOM
  const applyThemeToDOM = useCallback((theme: CustomTheme) => {
    const root = document.documentElement

    // Aplicar cores
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    })

    // Aplicar gradientes
    Object.entries(theme.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key}`, value)
    })

    // Aplicar sombras
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value)
    })

    // Aplicar border radius
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value)
    })

    // Aplicar espaçamentos
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })

    // Aplicar tipografia
    root.style.setProperty('--font-family', theme.typography.fontFamily)
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })
    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value)
    })

    // Aplicar durações de animação
    Object.entries(theme.animations.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, value)
    })
    Object.entries(theme.animations.easing).forEach(([key, value]) => {
      root.style.setProperty(`--easing-${key}`, value)
    })

    // Salvar tema atual
    localStorage.setItem('diagramas-ia-current-theme', theme.id)
  }, [])

  // Definir tema atual
  const setTheme = useCallback((theme: CustomTheme) => {
    setCurrentTheme(theme)
    applyThemeToDOM(theme)
  }, [applyThemeToDOM])

  // Salvar tema customizado
  const saveTheme = useCallback((theme: CustomTheme) => {
    const updatedTheme = {
      ...theme,
      updatedAt: Date.now()
    }

    setCustomThemes(prev => {
      const existingIndex = prev.findIndex(t => t.id === theme.id)
      let newThemes

      if (existingIndex >= 0) {
        // Atualizar tema existente
        newThemes = [...prev]
        newThemes[existingIndex] = updatedTheme
      } else {
        // Adicionar novo tema
        newThemes = [...prev, updatedTheme]
      }

      // Salvar no localStorage
      localStorage.setItem('diagramas-ia-custom-themes', JSON.stringify(newThemes))
      return newThemes
    })

    // Se for o tema atual, aplicar as mudanças
    if (theme.id === currentTheme.id) {
      setCurrentTheme(updatedTheme)
      applyThemeToDOM(updatedTheme)
    }
  }, [currentTheme.id, applyThemeToDOM])

  // Deletar tema
  const deleteTheme = useCallback((themeId: string) => {
    setCustomThemes(prev => {
      const newThemes = prev.filter(t => t.id !== themeId)
      localStorage.setItem('diagramas-ia-custom-themes', JSON.stringify(newThemes))
      return newThemes
    })

    // Se era o tema atual, voltar para o padrão
    if (themeId === currentTheme.id) {
      setTheme(defaultTheme)
    }
  }, [currentTheme.id, setTheme])

  // Carregar tema por ID
  const loadTheme = useCallback((themeId: string) => {
    const theme = customThemes.find(t => t.id === themeId)
    if (theme) {
      setTheme(theme)
    } else if (themeId === 'default') {
      setTheme(defaultTheme)
    }
  }, [customThemes, setTheme])

  // Exportar tema
  const exportTheme = useCallback((theme: CustomTheme) => {
    const themeData = JSON.stringify(theme, null, 2)
    const blob = new Blob([themeData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Importar tema
  const importTheme = useCallback(async (themeData: string): Promise<CustomTheme> => {
    try {
      const theme = JSON.parse(themeData) as CustomTheme

      // Validar estrutura do tema
      if (!theme.id || !theme.name || !theme.colors) {
        throw new Error('Estrutura do tema inválida')
      }

      // Gerar novo ID se já existir
      let newId = theme.id
      let counter = 1
      while (customThemes.find(t => t.id === newId)) {
        newId = `${theme.id}-${counter}`
        counter++
      }

      const importedTheme: CustomTheme = {
        ...theme,
        id: newId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      // Salvar tema importado
      saveTheme(importedTheme)

      return importedTheme
    } catch (error) {
      throw new Error('Erro ao importar tema: ' + (error instanceof Error ? error.message : 'formato inválido'))
    }
  }, [customThemes, saveTheme])

  // Gerar tema baseado em cor
  const generateThemeFromColor = useCallback((baseColor: string, themeName: string): CustomTheme => {
    // Esta é uma implementação simplificada
    // Em um caso real, você usaria bibliotecas como colord ou chroma.js para gerar paletas harmoniosas
    
    const newTheme: CustomTheme = {
      ...defaultTheme,
      id: `generated-${Date.now()}`,
      name: themeName,
      description: `Tema gerado a partir da cor ${baseColor}`,
      colors: {
        ...defaultTheme.colors,
        primary: baseColor,
        // Você pode implementar lógica mais sofisticada aqui
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    return newTheme
  }, [])

  // Duplicar tema
  const duplicateTheme = useCallback((theme: CustomTheme, newName?: string): CustomTheme => {
    const duplicatedTheme: CustomTheme = {
      ...theme,
      id: `${theme.id}-copy-${Date.now()}`,
      name: newName || `${theme.name} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    saveTheme(duplicatedTheme)
    return duplicatedTheme
  }, [saveTheme])

  return {
    currentTheme,
    customThemes,
    setTheme,
    saveTheme,
    deleteTheme,
    loadTheme,
    exportTheme,
    importTheme,
    applyThemeToDOM,
    generateThemeFromColor,
    duplicateTheme
  }
}

// Provider Component
export function ThemeManagerProvider({ children }: { children: React.ReactNode }) {
  const themeManager = useThemeManagerHook()

  return (
    <ThemeContext.Provider value={themeManager}>
      {children}
    </ThemeContext.Provider>
  )
}
