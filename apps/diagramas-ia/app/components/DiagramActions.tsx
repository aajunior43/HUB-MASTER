'use client'

import { RefreshCw, Maximize2, Download, Share2, Settings } from 'lucide-react'
import { useState } from 'react'

interface DiagramActionsProps {
  onRegenerate?: () => void
  onFitView?: () => void
  onExport?: () => void
  onShare?: () => void
  isVisible: boolean
}

export default function DiagramActions({ 
  onRegenerate, 
  onFitView, 
  onExport, 
  onShare, 
  isVisible 
}: DiagramActionsProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setIsRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="absolute bottom-4 left-4 flex space-x-2 z-10">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2 flex space-x-1">
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          title="Regenerar diagrama"
        >
          <RefreshCw 
            size={16} 
            className={`text-gray-600 ${isRegenerating ? 'animate-spin' : ''}`} 
          />
        </button>
        
        <button
          onClick={onFitView}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Ajustar visualização"
        >
          <Maximize2 size={16} className="text-gray-600" />
        </button>
        
        <button
          onClick={onExport}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Exportar diagrama"
        >
          <Download size={16} className="text-gray-600" />
        </button>
        
        <button
          onClick={onShare}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Compartilhar"
        >
          <Share2 size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}