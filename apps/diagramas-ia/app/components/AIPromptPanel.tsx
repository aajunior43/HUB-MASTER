'use client'

import { useState } from 'react'
import { Sparkles, Send, X, Lightbulb } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

interface AIPromptPanelProps {
  onDiagramGenerated: (nodes: any[], edges: any[]) => void
  onClose: () => void
}

const examplePrompts = [
  "Processo de login de usuário",
  "Fluxo de compra online",
  "Sistema de aprovação de documentos",
  "Ciclo de vida de desenvolvimento de software",
  "Processo de contratação de funcionários",
  "Fluxo de atendimento ao cliente"
]

export default function AIPromptPanel({ onDiagramGenerated, onClose }: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const generateDiagram = async (description: string) => {
    if (!description.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.nodes && data.edges) {
        onDiagramGenerated(data.nodes, data.edges)
      }
    } catch (err) {
      setError('Erro ao gerar diagrama. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generateDiagram(prompt)
  }

  const handleExampleClick = (example: string) => {
    setPrompt(example)
    generateDiagram(example)
  }

  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="text-primary" size={20} />
          <h2 className="font-semibold text-gray-900">Gerador de Diagramas IA</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Lightbulb className="text-blue-600 mt-0.5" size={16} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Como usar:</p>
                <p>Descreva o processo ou fluxo que você quer visualizar e a IA criará o diagrama automaticamente.</p>
              </div>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descreva seu diagrama:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Crie um fluxograma para o processo de aprovação de férias de funcionários..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : <Send size={16} />}
              <span>{isLoading ? 'Gerando diagrama...' : 'Gerar Diagrama'}</span>
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Example Prompts */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Exemplos rápidos:
            </h3>
            <div className="space-y-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  disabled={isLoading}
                  className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}