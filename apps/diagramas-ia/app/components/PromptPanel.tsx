'use client'

import { useState, useEffect } from 'react'
import { X, Zap, Send, History, Trash2, Copy, Brain } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import PromptExamples from './PromptExamples'
import AdvancedSettings, { DiagramConfig } from './AdvancedSettings'

interface PromptPanelProps {
  onDiagramGenerated: (diagram: { nodes: any[]; edges: any[] }, prompt?: string, config?: DiagramConfig) => void
  onClose: () => void
}

export default function PromptPanel({ onDiagramGenerated, onClose }: PromptPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastResponse, setLastResponse] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Configuração padrão do diagrama
  const [config, setConfig] = useState<DiagramConfig>({
    complexity: 'medium',
    format: 'flowchart',
    style: 'modern',
    autoMode: true, // Modo automático ativado por padrão
    includeLabels: true,
    showConnections: true
  })

  // Carregar histórico do localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('diagram-history')
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    }
    
    // Carregar configurações salvas
    const savedConfig = localStorage.getItem('diagram-config')
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig))
    }
  }, [])

  // Salvar configurações quando mudarem
  useEffect(() => {
    localStorage.setItem('diagram-config', JSON.stringify(config))
  }, [config])

  // Salvar no histórico
  const saveToHistory = (promptText: string) => {
    const newHistory = [promptText, ...history.filter(h => h !== promptText)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem('diagram-history', JSON.stringify(newHistory))
  }

  // Limpar histórico
  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('diagram-history')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setLastResponse('')
    
    try {
      // Preparar prompt com configurações se não estiver em modo automático
      let enhancedPrompt = prompt
      
      if (!config.autoMode) {
        const configText = `
Configurações específicas:
- Complexidade: ${config.complexity}
- Formato: ${config.format}
- Estilo: ${config.style}
- Incluir rótulos: ${config.includeLabels ? 'sim' : 'não'}
- Mostrar conexões: ${config.showConnections ? 'sim' : 'não'}

Prompt original: ${prompt}`
        enhancedPrompt = configText
      } else {
        enhancedPrompt = `[MODO AUTOMÁTICO] Analise este prompt e escolha automaticamente a melhor complexidade, formato e estilo para o diagrama: ${prompt}`
      }

      const res = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          config: config
        }),
      })

      const data = await res.json()
      
      if (data.diagram) {
        onDiagramGenerated(data.diagram, prompt, config)
        
        const successMsg = config.autoMode 
          ? '✅ Criado com IA automática!' 
          : `✅ Criado (${config.format}, ${config.complexity})!`
        
        setLastResponse(successMsg)
        saveToHistory(prompt)
        setPrompt('')
      } else {
        setLastResponse('❌ Erro na geração')
      }
    } catch (error) {
      setLastResponse('❌ Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col text-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain size={20} className="text-purple-600" />
          <h2 className="font-semibold">Gerador IA</h2>
          {config.autoMode && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              Auto
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={config.autoMode 
                ? "Descreva o diagrama... (IA escolherá as melhores configurações)"
                : "Descreva o diagrama..."
              }
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent form-input"
              disabled={isLoading}
            />
          </div>

          {/* Configurações Avançadas */}
          <AdvancedSettings
            config={config}
            onChange={setConfig}
            isOpen={showAdvanced}
            onToggle={() => setShowAdvanced(!showAdvanced)}
          />

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isLoading ? <LoadingSpinner /> : (config.autoMode ? <Brain size={18} /> : <Zap size={18} />)}
            <span className="font-medium">
              {isLoading ? 'Gerando...' : (config.autoMode ? 'Gerar com IA' : 'Gerar')}
            </span>
          </button>
        </form>

        {/* Response */}
        {lastResponse && (
          <div className={`p-4 rounded-lg ${
            lastResponse.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`text-sm whitespace-pre-wrap ${
              lastResponse.includes('✅') ? 'text-green-800' : 'text-red-800'
            }`}>
              {lastResponse}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <History size={16} className="text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">Histórico</h4>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-primary hover:text-blue-600"
                >
                  {showHistory ? 'Ocultar' : 'Mostrar'}
                </button>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            
            {showHistory && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                  >
                    <span className="flex-1 truncate text-gray-700">{item}</span>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => setPrompt(item)}
                        className="text-primary hover:text-blue-600"
                        title="Usar este prompt"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Examples */}
        <div className="border-t pt-4">
          <PromptExamples onSelectPrompt={(selectedPrompt) => {
            setPrompt(selectedPrompt)
          }} />
        </div>

        {/* Quick Config Presets */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Configurações Rápidas</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfig({
                complexity: 'simple',
                format: 'flowchart',
                style: 'minimal',
                autoMode: false,
                includeLabels: false,
                showConnections: true
              })}
              className="p-2 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              🔵 Simples
            </button>
            <button
              onClick={() => setConfig({
                complexity: 'complex',
                format: 'mindmap',
                style: 'colorful',
                autoMode: false,
                includeLabels: true,
                showConnections: true
              })}
              className="p-2 text-xs bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
            >
              🟢 Complexo
            </button>
            <button
              onClick={() => setConfig({
                complexity: 'medium',
                format: 'sequence',
                style: 'modern',
                autoMode: false,
                includeLabels: true,
                showConnections: true
              })}
              className="p-2 text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
            >
              🟣 Sequência
            </button>
            <button
              onClick={() => setConfig({
                complexity: 'medium',
                format: 'flowchart',
                style: 'modern',
                autoMode: true,
                includeLabels: true,
                showConnections: true
              })}
              className="p-2 text-xs bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border border-purple-200 rounded-lg transition-colors"
            >
              🤖 IA Auto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}