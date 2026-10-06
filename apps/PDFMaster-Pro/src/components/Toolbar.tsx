'use client';

import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Share2, 
  Printer, 
  Undo, 
  Redo,
  Save,
  Eye,
  Grid3X3,
  Maximize2
} from 'lucide-react';
import { useState } from 'react';

interface ToolbarProps {
  currentTool: string;
  onToolChange: (tool: string) => void;
  pdfFile: File | null;
}

export default function Toolbar({ currentTool, onToolChange, pdfFile }: ToolbarProps) {
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'single' | 'continuous' | 'grid'>('single');

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleDownload = () => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section - File Actions */}
        <div className="flex items-center space-x-2">
          <button
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Salvar"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
          
          <div className="w-px h-6 bg-gray-300"></div>
          
          <button
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Desfazer"
          >
            <Undo className="h-4 w-4" />
          </button>
          
          <button
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refazer"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        {/* Center Section - View Controls */}
        <div className="flex items-center space-x-4">
          {/* View Mode */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'single' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Página única"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('continuous')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'continuous' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Contínuo"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Grade"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                {zoom}%
              </span>
            </div>
            
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Rotation Controls */}
          <div className="flex items-center space-x-1">
            <button
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Girar à esquerda"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Girar à direita"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Section - Export Actions */}
        <div className="flex items-center space-x-2">
          <button
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Imprimir"
          >
            <Printer className="h-4 w-4" />
          </button>
          
          <button
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Compartilhar"
          >
            <Share2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            title="Baixar PDF"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Baixar</span>
          </button>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
            ← Anterior
          </button>
          
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              defaultValue="1"
              className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">de 1</span>
          </div>
          
          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}