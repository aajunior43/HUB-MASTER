'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FocusRingProps {
  children: React.ReactNode
  className?: string
  focusClassName?: string
  showOnKeyboard?: boolean
  offset?: number
}

export default function FocusRing({ 
  children, 
  className = '', 
  focusClassName = '',
  showOnKeyboard = true,
  offset = 2
}: FocusRingProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isKeyboardFocus, setIsKeyboardFocus] = useState(false)
  const [ringPosition, setRingPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const elementRef = useRef<HTMLDivElement>(null)
  const lastMouseDownRef = useRef(0)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleFocus = () => {
      setIsFocused(true)
      
      // Verificar se o foco foi ativado por teclado
      const isKeyboard = Date.now() - lastMouseDownRef.current > 100
      setIsKeyboardFocus(isKeyboard)
      
      // Calcular posição do elemento para o anel de foco
      const rect = element.getBoundingClientRect()
      setRingPosition({
        x: rect.left - offset,
        y: rect.top - offset,
        width: rect.width + (offset * 2),
        height: rect.height + (offset * 2)
      })
    }

    const handleBlur = () => {
      setIsFocused(false)
      setIsKeyboardFocus(false)
    }

    const handleMouseDown = () => {
      lastMouseDownRef.current = Date.now()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Se Tab ou teclas de seta foram pressionadas, considerar foco por teclado
      if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        setIsKeyboardFocus(true)
      }
    }

    element.addEventListener('focus', handleFocus)
    element.addEventListener('blur', handleBlur)
    element.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      element.removeEventListener('focus', handleFocus)
      element.removeEventListener('blur', handleBlur)
      element.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [offset])

  const shouldShowRing = isFocused && (!showOnKeyboard || isKeyboardFocus)

  return (
    <>
      <div 
        ref={elementRef}
        className={`${className} ${isFocused ? focusClassName : ''}`}
      >
        {children}
      </div>
      
      {/* Anel de foco customizado */}
      <AnimatePresence>
        {shouldShowRing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed pointer-events-none z-[9999]"
            style={{
              left: ringPosition.x,
              top: ringPosition.y,
              width: ringPosition.width,
              height: ringPosition.height,
            }}
          >
            <div className="w-full h-full border-2 border-blue-500 rounded-lg shadow-lg shadow-blue-500/30 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Hook para gerenciar foco visível globalmente
 */
export function useFocusVisible() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
      clearTimeout(timeoutId)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
        setIsKeyboardUser(true)
        // Reset após 5 segundos de inatividade
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => setIsKeyboardUser(false), 5000)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeoutId)
    }
  }, [])

  return isKeyboardUser
}

/**
 * Componente para destacar elemento ativo
 */
interface ActiveIndicatorProps {
  isActive: boolean
  children: React.ReactNode
  className?: string
}

export function ActiveIndicator({ isActive, children, className = '' }: ActiveIndicatorProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none bg-green-500/10"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Componente para indicar elementos interativos
 */
interface InteractiveIndicatorProps {
  children: React.ReactNode
  type?: 'button' | 'link' | 'input' | 'custom'
  className?: string
}

export function InteractiveIndicator({ 
  children, 
  type = 'button', 
  className = '' 
}: InteractiveIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const indicators = {
    button: 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20',
    link: 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400',
    input: 'cursor-text hover:border-blue-400',
    custom: ''
  }

  return (
    <div 
      className={`transition-all duration-200 ${indicators[type]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Indicador visual para elementos interativos */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-blue-500/10 rounded-md pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
