'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  ExternalLink,
  RotateCcw
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Toast, ToastType } from '../types'
import { cn } from '../lib/utils'

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastStyles = {
  success: {
    bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    border: 'border-green-400',
    icon: 'text-green-100',
    text: 'text-white'
  },
  error: {
    bg: 'bg-gradient-to-r from-red-500 to-pink-500',
    border: 'border-red-400',
    icon: 'text-red-100',
    text: 'text-white'
  },
  warning: {
    bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    border: 'border-yellow-400',
    icon: 'text-yellow-100',
    text: 'text-white'
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    border: 'border-blue-400',
    icon: 'text-blue-100',
    text: 'text-white'
  },
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const Icon = toastIcons[toast.type]
  const styles = toastStyles[toast.type]

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)

      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.id, onRemove])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative max-w-sm w-full p-4 rounded-xl shadow-2xl backdrop-blur-sm border',
        styles.bg,
        styles.border,
        styles.text
      )}
    >
      {/* Progress bar para duração */}
      {toast.duration && toast.duration > 0 && (
        <motion.div
          className="absolute top-0 left-0 h-1 bg-white/30 rounded-t-xl"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
          <Icon size={20} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight">
            {toast.message}
          </h4>
          
          {toast.description && (
            <p className="text-xs opacity-90 mt-1 leading-relaxed">
              {toast.description}
            </p>
          )}

          {/* Ação */}
          {toast.action && (
            <motion.button
              onClick={toast.action.onClick}
              className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw size={12} />
              {toast.action.label}
            </motion.button>
          )}
        </div>

        {/* Botão fechar */}
        <motion.button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  )
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxToasts?: number
}

export default function ToastSystem({ 
  position = 'bottom-right', 
  maxToasts = 5 
}: ToastContainerProps) {
  const { toasts, removeToast } = useAppStore()

  // Limitar número de toasts visíveis
  const visibleToasts = toasts.slice(0, maxToasts)

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  }

  if (visibleToasts.length === 0) return null

  return (
    <div className={cn('fixed z-[9999] pointer-events-none', positionClasses[position])}>
      <div className="flex flex-col gap-3 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {visibleToasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </AnimatePresence>

        {/* Indicador de mais toasts */}
        {toasts.length > maxToasts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800/80 text-white text-xs rounded-lg backdrop-blur-sm">
              <span>+{toasts.length - maxToasts} mais</span>
              <button
                onClick={() => {
                  // Remover toasts extras
                  toasts.slice(maxToasts).forEach(toast => removeToast(toast.id))
                }}
                className="hover:text-gray-300 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook para facilitar o uso do sistema de toast
 */
export function useToastSystem() {
  const { addToast, removeToast, clearToasts } = useAppStore()

  const showToast = (
    type: ToastType,
    message: string,
    options?: {
      description?: string
      duration?: number
      action?: {
        label: string
        onClick: () => void
      }
    }
  ) => {
    addToast({
      type,
      message,
      description: options?.description,
      duration: options?.duration ?? (type === 'error' ? 7000 : 5000),
      action: options?.action
    })
  }

  return {
    success: (message: string, options?: Omit<Parameters<typeof showToast>[2], 'duration'> & { duration?: number }) =>
      showToast('success', message, { duration: 4000, ...options }),
    
    error: (message: string, options?: Omit<Parameters<typeof showToast>[2], 'duration'> & { duration?: number }) =>
      showToast('error', message, { duration: 0, ...options }), // Erros não desaparecem automaticamente
    
    warning: (message: string, options?: Omit<Parameters<typeof showToast>[2], 'duration'> & { duration?: number }) =>
      showToast('warning', message, { duration: 6000, ...options }),
    
    info: (message: string, options?: Omit<Parameters<typeof showToast>[2], 'duration'> & { duration?: number }) =>
      showToast('info', message, { duration: 5000, ...options }),
    
    loading: (message: string, options?: Omit<Parameters<typeof showToast>[2], 'duration'> & { duration?: number }) =>
      showToast('info', message, { duration: 0, ...options }), // Loading não desaparece automaticamente
    
    remove: removeToast,
    clear: clearToasts
  }
}

/**
 * Componente para toasts de carregamento especiais
 */
export function LoadingToast({ message, description }: { message: string; description?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-500/90 text-white rounded-xl shadow-2xl backdrop-blur-sm border border-blue-400">
      <motion.div
        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <div>
        <h4 className="font-semibold text-sm">{message}</h4>
        {description && (
          <p className="text-xs opacity-90 mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Toast specializado para progresso
 */
interface ProgressToastProps {
  message: string
  progress: number // 0-100
  description?: string
  onCancel?: () => void
}

export function ProgressToast({ message, progress, description, onCancel }: ProgressToastProps) {
  return (
    <div className="p-4 bg-blue-500/90 text-white rounded-xl shadow-2xl backdrop-blur-sm border border-blue-400 min-w-[300px]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{message}</h4>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {description && (
        <p className="text-xs opacity-90 mb-3">{description}</p>
      )}
      
      {/* Barra de progresso */}
      <div className="w-full bg-white/20 rounded-full h-2 mb-2">
        <motion.div
          className="bg-white h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      <div className="text-xs opacity-75 text-right">
        {Math.round(progress)}%
      </div>
    </div>
  )
}
