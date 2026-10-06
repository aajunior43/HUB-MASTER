'use client'

import { useState } from 'react'
import { X, Sparkles, Send, Zap, Lightbulb } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import PromptExamples from './PromptExamples'

interface GeminiDialogProps {
  onClose: () => void
  onDiagramGenerated?: (diagram: any) => void
}

export default function GeminiDialog({ onClose, onDiagramGenerated }: GeminiDialogProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [mode, setMode] = useState<'suggestion' | 'generate'>('generate')
  const [showExamples, setShowExamples] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    try {
      if (mode === 'generate') {
        // Gerar diagrama automaticamente
        const res = await fetch('/api/generate-diagram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        })

        const data = await res.json()
        if (data.diagram && onDiagramGenerated) {
          onDiagramGenerated(data.diagram)
          setResponse(`✅ Diagrama gerado com sucesso!\n\n${data.suggestion || 'Diagrama criado baseado na sua solicitação.'}`)
        } else {
          setResponse('Erro ao gerar diagrama automaticamente')
        }
      } else {
        // Apenas sugestões
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        })

        const data = await res.json()
        setResponse(data.response || 'Erro ao processar solicitação')
      }
    } catch (error) {
      setResponse('Erro ao conectar com a API do Gemini')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden flex">
        {/* Sidebar com exemplos */}
        {showExamples && (
          <div className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Lightbulb className="text-yellow-500" size={18} />
                <h3 className="font-medium text-gray-900">Exemplos</h3>
              </div>
              <button
                onClick={() => setShowExamples(false)}
                className="p-1 hover:bg-gray-100 rounded text-gray-400"
              >
                <X size={16} />
              </button>
            </div>
            <PromptExamples onSelectPrompt={(selectedPrompt) => {
              setPrompt(selectedPrompt)
              setShowExamples(false)
            }} />
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Sparkles className="text-primary" size={20} />
              <h2 className="text-lg font-semibold">Assistente IA Gemini</h2>
            </div>
            <div className="flex items-center space-x-2">
              {!showExamples && (
                <button
                  onClick={() => setShowExamples(true)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500"
                  title="Mostrar exemplos"
                >
                  <Lightbulb size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="text-sm text-gray-600">
            Descreva o diagrama que você gostaria de criar. Escolha entre obter sugestões ou gerar automaticamente.
          </div>

          {/* Mode Selection */}
          <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('suggestion')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'suggestion'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles size={16} />
              <span>Sugestões</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('generate')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'generate'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap size={16} />
              <span>Gerar Diagrama</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'generate'
                  ? "Ex: Fluxograma de processo de login com validação de usuário..."
                  : "Ex: Crie um fluxograma para processo de login de usuário..."
              }
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
            />

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <LoadingSpinner /> : mode === 'generate' ? <Zap size={16} /> : <Send size={16} />}
                <span>
                  {isLoading 
                    ? 'Processando...' 
                    : mode === 'generate' 
                      ? 'Gerar Diagrama' 
                      : 'Obter Sugestões'
                  }
                </span>
              </button>
              
              {mode === 'generate' && (
                <div className="text-xs text-gray-500 flex items-center">
                  ⚡ Criará o diagrama automaticamente no editor
                </div>
              )}
            </div>
          </form>

            {response && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Resposta da IA:</h3>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {response}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}