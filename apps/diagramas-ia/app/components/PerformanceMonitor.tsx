'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  Zap, 
  Clock, 
  Memory, 
  Monitor, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  X,
  Settings,
  BarChart3,
  Cpu,
  HardDrive
} from 'lucide-react'
import { usePerformanceMonitor, useDeviceCapabilities } from '../hooks/useRenderOptimization'
import { useWorkerPerformance } from '../hooks/useWorkerPerformance'

interface PerformanceMonitorProps {
  isVisible?: boolean
  onClose?: () => void
  compact?: boolean
}

export default function PerformanceMonitor({ 
  isVisible = true, 
  onClose,
  compact = false 
}: PerformanceMonitorProps) {
  const { metrics, trackRender } = usePerformanceMonitor()
  const capabilities = useDeviceCapabilities()
  const { metrics: workerMetrics, isWorkerReady } = useWorkerPerformance()
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [showDetails, setShowDetails] = useState(false)

  // Status da performance baseado nas métricas
  const performanceStatus = React.useMemo(() => {
    const { fps, memoryUsage } = metrics
    
    if (fps >= 50 && memoryUsage < 100) {
      return { level: 'good', label: 'Excelente', color: 'green' }
    } else if (fps >= 30 && memoryUsage < 200) {
      return { level: 'warning', label: 'Moderada', color: 'yellow' }
    } else {
      return { level: 'poor', label: 'Baixa', color: 'red' }
    }
  }, [metrics])

  // Recomendações baseadas na performance
  const recommendations = React.useMemo(() => {
    const recs = []
    
    if (metrics.fps < 30) {
      recs.push('Considere ativar o modo performance')
      recs.push('Reduza a complexidade do diagrama')
    }
    
    if (metrics.memoryUsage > 150) {
      recs.push('Use virtualização para economizar memória')
      recs.push('Remova elementos desnecessários')
    }
    
    if (capabilities.isLowEnd) {
      recs.push('Dispositivo de baixa performance detectado')
      recs.push('Recomendado usar configurações otimizadas')
    }
    
    return recs
  }, [metrics, capabilities])

  if (!isVisible) return null

  if (compact && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed top-4 right-4 z-50"
      >
        <button
          onClick={() => setIsExpanded(true)}
          className={`
            p-3 rounded-lg shadow-lg backdrop-blur-sm transition-colors
            ${performanceStatus.color === 'green' ? 'bg-green-500/90 text-white' : ''}
            ${performanceStatus.color === 'yellow' ? 'bg-yellow-500/90 text-white' : ''}
            ${performanceStatus.color === 'red' ? 'bg-red-500/90 text-white' : ''}
          `}
        >
          <Activity className="w-5 h-5" />
        </button>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-80 max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              performanceStatus.color === 'green' ? 'bg-green-100 dark:bg-green-900' :
              performanceStatus.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900' :
              'bg-red-100 dark:bg-red-900'
            }`}>
              <Activity className={`w-4 h-4 ${
                performanceStatus.color === 'green' ? 'text-green-600 dark:text-green-400' :
                performanceStatus.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Performance Monitor
              </h3>
              <p className={`text-xs ${
                performanceStatus.color === 'green' ? 'text-green-600 dark:text-green-400' :
                performanceStatus.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {performanceStatus.label}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {compact && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Monitor className="w-4 h-4 text-gray-500" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* FPS */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">FPS</span>
              </div>
              <div className={`text-2xl font-bold ${
                metrics.fps >= 50 ? 'text-green-500' :
                metrics.fps >= 30 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {Math.round(metrics.fps)}
              </div>
              <div className="flex items-center justify-center gap-1">
                {metrics.fps >= 50 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className="text-xs text-gray-500">
                  {Math.round(metrics.frameTime)}ms
                </span>
              </div>
            </div>

            {/* Memória */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Memory className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Memória</span>
              </div>
              <div className={`text-2xl font-bold ${
                metrics.memoryUsage < 100 ? 'text-green-500' :
                metrics.memoryUsage < 200 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {metrics.memoryUsage}
              </div>
              <div className="text-xs text-gray-500">MB</div>
            </div>
          </div>

          {/* Worker Metrics */}
          {isWorkerReady && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Web Worker
                </span>
                <CheckCircle className="w-3 h-3 text-green-500" />
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(workerMetrics.renderTime)}ms
                  </div>
                  <div className="text-xs text-gray-500">Render</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(workerMetrics.validationTime)}ms
                  </div>
                  <div className="text-xs text-gray-500">Validação</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(workerMetrics.layoutTime)}ms
                  </div>
                  <div className="text-xs text-gray-500">Layout</div>
                </div>
              </div>
            </div>
          )}

          {/* Device Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dispositivo
                </span>
              </div>
              <motion.div
                animate={{ rotate: showDetails ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <TrendingDown className="w-4 h-4 text-gray-400" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 space-y-2 text-sm"
                >
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cores CPU:</span>
                    <span className="font-medium">{capabilities.cores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Memória:</span>
                    <span className="font-medium">{capabilities.memory}GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Conexão:</span>
                    <span className="font-medium">{capabilities.connection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Performance:</span>
                    <span className={`font-medium ${
                      capabilities.isLowEnd ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {capabilities.isLowEnd ? 'Baixa' : 'Alta'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recomendações */}
          {recommendations.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recomendações
                </span>
              </div>
              
              <div className="space-y-2">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <div 
                    key={index}
                    className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <BarChart3 className="w-3 h-3" />
                Detalhes
              </button>
              
              <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <Settings className="w-3 h-3" />
                Configurar
              </button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className={`px-4 py-2 text-xs text-center border-t border-gray-200 dark:border-gray-700 ${
          performanceStatus.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
          performanceStatus.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
          'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {performanceStatus.color === 'green' && 'Performance otimizada ✓'}
          {performanceStatus.color === 'yellow' && 'Performance moderada ⚠️'}
          {performanceStatus.color === 'red' && 'Performance baixa - otimização recomendada ⚠️'}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Mini Performance Widget
export function PerformanceWidget() {
  const { metrics } = usePerformanceMonitor()
  const [showMonitor, setShowMonitor] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowMonitor(true)}
        className={`
          fixed bottom-4 right-4 z-40 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110
          ${metrics.fps >= 50 ? 'bg-green-500/90 text-white' : ''}
          ${metrics.fps >= 30 && metrics.fps < 50 ? 'bg-yellow-500/90 text-white' : ''}
          ${metrics.fps < 30 ? 'bg-red-500/90 text-white' : ''}
        `}
        title={`FPS: ${Math.round(metrics.fps)} | Memória: ${metrics.memoryUsage}MB`}
      >
        <Activity className="w-5 h-5" />
      </button>

      <PerformanceMonitor
        isVisible={showMonitor}
        onClose={() => setShowMonitor(false)}
        compact={true}
      />
    </>
  )
}
