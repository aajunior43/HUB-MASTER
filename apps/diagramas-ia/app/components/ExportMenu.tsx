'use client'

import { Image, FileText, Code } from 'lucide-react'

interface ExportMenuProps {
  onExport: (type: 'png' | 'svg' | 'json') => void
  onClose: () => void
}

export default function ExportMenu({ onExport, onClose }: ExportMenuProps) {
  const handleExport = (type: 'png' | 'svg' | 'json') => {
    onExport(type)
    onClose()
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <div className="py-2">
        <button
          onClick={() => handleExport('png')}
          className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Image size={16} />
          <span>Exportar como PNG</span>
        </button>
        
        <button
          onClick={() => handleExport('svg')}
          className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <FileText size={16} />
          <span>Exportar como SVG</span>
        </button>
        
        <button
          onClick={() => handleExport('json')}
          className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Code size={16} />
          <span>Exportar como JSON</span>
        </button>
      </div>
    </div>
  )
}