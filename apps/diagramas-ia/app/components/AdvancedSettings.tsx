'use client'

import { useState } from 'react'
import { Settings, Zap, Brain, ChevronDown } from 'lucide-react'

export interface DiagramConfig {
  complexity: 'simple' | 'medium' | 'complex'
  format: 'flowchart' | 'mindmap' | 'sequence' | 'class' | 'er' | 'gantt'
  style: 'modern' | 'classic' | 'minimal' | 'colorful'
  autoMode: boolean
  includeLabels: boolean
  showConnections: boolean
}

interface AdvancedSettingsProps {
  config: DiagramConfig
  onChange: (config: DiagramConfig) => void
  isOpen: boolean
  onToggle: () => void
}

export default function AdvancedSettings({ config, onChange, isOpen, onToggle }: AdvancedSettingsProps) {
  const updateConfig = (updates: Partial<DiagramConfig>) => {
    onChange({ ...config, ...updates })
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Settings size={16} />
        <span>Configurações</span>
        <ChevronDown size={14} />
      </button>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Configurações Avançadas</h3>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700"
        >
          <ChevronDown size={16} className="rotate-180" />
        </button>
      </div>

      {/* Modo Automático */}
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.autoMode}
            onChange={(e) => updateConfig({ autoMode: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex items-center space-x-1">
            <Brain size={16} className="text-purple-600" />
            <span className="text-sm font-medium">Modo Automático</span>
          </div>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          IA escolhe as melhores configurações automaticamente
        </p>
      </div>

      {!config.autoMode && (
        <>
          {/* Complexidade */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Complexidade</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'simple', label: 'Simples', icon: '○' },
                { value: 'medium', label: 'Médio', icon: '◐' },
                { value: 'complex', label: 'Complexo', icon: '●' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateConfig({ complexity: option.value as any })}
                  className={`p-2 text-xs rounded-lg border transition-colors ${
                    config.complexity === option.value
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-lg">{option.icon}</span>
                    <span>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Formato</label>
            <select
              value={config.format}
              onChange={(e) => updateConfig({ format: e.target.value as any })}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="flowchart">Fluxograma</option>
              <option value="mindmap">Mapa Mental</option>
              <option value="sequence">Diagrama de Sequência</option>
              <option value="class">Diagrama de Classes</option>
              <option value="er">Diagrama ER</option>
              <option value="gantt">Gráfico de Gantt</option>
            </select>
          </div>

          {/* Estilo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Estilo Visual</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'modern', label: 'Moderno', color: 'bg-gradient-to-r from-blue-500 to-purple-500' },
                { value: 'classic', label: 'Clássico', color: 'bg-gray-600' },
                { value: 'minimal', label: 'Minimalista', color: 'bg-gray-300' },
                { value: 'colorful', label: 'Colorido', color: 'bg-gradient-to-r from-red-400 via-yellow-400 to-green-400' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateConfig({ style: option.value as any })}
                  className={`p-2 text-xs rounded-lg border transition-colors ${
                    config.style === option.value
                      ? 'border-blue-300 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${option.color}`}></div>
                    <span>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Opções Extras */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Opções Extras</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.includeLabels}
                  onChange={(e) => updateConfig({ includeLabels: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Incluir rótulos detalhados</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.showConnections}
                  onChange={(e) => updateConfig({ showConnections: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Mostrar conexões</span>
              </label>
            </div>
          </div>
        </>
      )}

      {config.autoMode && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 text-purple-700">
            <Zap size={16} />
            <span className="text-sm font-medium">Modo Automático Ativo</span>
          </div>
          <p className="text-xs text-purple-600 mt-1">
            A IA analisará seu prompt e escolherá automaticamente a complexidade, formato e estilo mais adequados.
          </p>
        </div>
      )}
    </div>
  )
}