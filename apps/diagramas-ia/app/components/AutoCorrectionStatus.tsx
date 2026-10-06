'use client'

import { CheckCircle, AlertTriangle, RefreshCw, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface AutoCorrectionStatusProps {
  isVisible: boolean
  status: 'correcting' | 'success' | 'fallback' | 'error'
  message: string
  onClose: () => void
  details?: string[]
}

export default function AutoCorrectionStatus({ 
  isVisible, 
  status, 
  message, 
  onClose, 
  details = [] 
}: AutoCorrectionStatusProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (status === 'success' || status === 'fallback') {
      // Auto-close after 5 seconds for success states
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [status, onClose])

  if (!isVisible) return null

  const getIcon = () => {
    switch (status) {
      case 'correcting':
        return <RefreshCw size={20} className="text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />
      case 'fallback':
        return <AlertTriangle size={20} className="text-yellow-500" />
      case 'error':
        return <X size={20} className="text-red-500" />
    }
  }

  const getStyles = () => {
    switch (status) {
      case 'correcting':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'fallback':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
    }
  }

  const getTitle = () => {
    switch (status) {
      case 'correcting':
        return 'Corrigindo Diagrama'
      case 'success':
        return 'Correção Concluída'
      case 'fallback':
        return 'Diagrama de Fallback'
      case 'error':
        return 'Erro na Correção'
    }
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
      <div className={`flex flex-col space-y-3 p-4 rounded-lg border shadow-lg max-w-md ${getStyles()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div>
              <h4 className="font-medium text-sm">{getTitle()}</h4>
              <p className="text-xs opacity-90">{message}</p>
            </div>
          </div>
          
          {status !== 'correcting' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {details.length > 0 && (
          <div className="border-t pt-2 opacity-75">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs underline hover:no-underline"
            >
              {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
            
            {showDetails && (
              <div className="mt-2 space-y-1">
                {details.map((detail, index) => (
                  <div key={index} className="text-xs bg-white bg-opacity-50 p-2 rounded">
                    • {detail}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status === 'correcting' && (
          <div className="flex items-center space-x-2 text-xs opacity-75">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>A IA está analisando e corrigindo os erros...</span>
          </div>
        )}
      </div>
    </div>
  )
}