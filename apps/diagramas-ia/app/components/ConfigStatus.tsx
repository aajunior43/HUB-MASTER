'use client'

import { Brain, Settings, Zap } from 'lucide-react'
import { DiagramConfig } from './AdvancedSettings'

interface ConfigStatusProps {
  config: DiagramConfig
  isVisible: boolean
}

export default function ConfigStatus({ config, isVisible }: ConfigStatusProps) {
  if (!isVisible) return null

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg z-10">
      <div className="flex items-center space-x-2 mb-2">
        {config.autoMode ? (
          <>
            <Brain size={16} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Modo Automático</span>
          </>
        ) : (
          <>
            <Settings size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Configuração Manual</span>
          </>
        )}
      </div>
      
      {!config.autoMode && (
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Complexidade:</span>
            <span className="font-medium capitalize">{config.complexity}</span>
          </div>
          <div className="flex justify-between">
            <span>Formato:</span>
            <span className="font-medium capitalize">{config.format}</span>
          </div>
          <div className="flex justify-between">
            <span>Estilo:</span>
            <span className="font-medium capitalize">{config.style}</span>
          </div>
        </div>
      )}
      
      {config.autoMode && (
        <div className="text-xs text-purple-600">
          IA escolhe as melhores configurações
        </div>
      )}
    </div>
  )
}