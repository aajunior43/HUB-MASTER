'use client';

import { 
  MousePointer, 
  Type, 
  Highlighter, 
  StickyNote, 
  Signature, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  Pencil, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Share2,
  Lock,
  Scissors,
  Copy,
  RotateCw
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentTool: string;
  onToolChange: (tool: string) => void;
}

const tools = [
  { id: 'select', icon: MousePointer, label: 'Selecionar', category: 'basic' },
  { id: 'text', icon: Type, label: 'Texto', category: 'edit' },
  { id: 'highlight', icon: Highlighter, label: 'Destacar', category: 'annotate' },
  { id: 'note', icon: StickyNote, label: 'Nota', category: 'annotate' },
  { id: 'signature', icon: Signature, label: 'Assinatura', category: 'sign' },
  { id: 'image', icon: ImageIcon, label: 'Imagem', category: 'edit' },
  { id: 'rectangle', icon: Square, label: 'Retângulo', category: 'draw' },
  { id: 'circle', icon: Circle, label: 'Círculo', category: 'draw' },
  { id: 'draw', icon: Pencil, label: 'Desenhar', category: 'draw' },
];

const actions = [
  { id: 'download', icon: Download, label: 'Baixar' },
  { id: 'share', icon: Share2, label: 'Compartilhar' },
  { id: 'protect', icon: Lock, label: 'Proteger' },
  { id: 'split', icon: Scissors, label: 'Dividir' },
  { id: 'copy', icon: Copy, label: 'Duplicar' },
  { id: 'rotate', icon: RotateCw, label: 'Girar' },
];

export default function Sidebar({ isOpen, onToggle, currentTool, onToolChange }: SidebarProps) {
  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${
        isOpen ? 'w-64' : 'w-14 sm:w-16'
      }`}
      role="complementary"
      aria-label="Barra lateral de ferramentas"
    >
      {/* Toggle Button */}
      <div className="p-2 sm:p-4 border-b border-gray-200">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={isOpen ? "Recolher barra lateral" : "Expandir barra lateral"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>
      </div>

      {/* Tools Section */}
      <div className="p-2 sm:p-4">
        {isOpen && <h3 className="text-sm font-semibold text-gray-700 mb-3">Ferramentas</h3>}
        <div className="space-y-1 sm:space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`w-full flex items-center p-2 sm:p-3 rounded-lg transition-colors ${
                  currentTool === tool.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                title={!isOpen ? tool.label : undefined}
                aria-label={tool.label}
                aria-pressed={currentTool === tool.id}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                {isOpen && <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium">{tool.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions Section */}
      <div className="p-2 sm:p-4 border-t border-gray-200">
        {isOpen && <h3 className="text-sm font-semibold text-gray-700 mb-3">Ações</h3>}
        <div className="space-y-1 sm:space-y-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onToolChange(action.id)}
                className="w-full flex items-center p-2 sm:p-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                title={!isOpen ? action.label : undefined}
                aria-label={action.label}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                {isOpen && <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium">{action.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Properties Panel */}
      {isOpen && currentTool !== 'select' && (
        <div className="p-2 sm:p-4 border-t border-gray-200 flex-grow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Propriedades</h3>
          <div className="space-y-2 sm:space-y-3">
            {currentTool === 'text' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tamanho</label>
                  <select className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm">
                    <option>12px</option>
                    <option>14px</option>
                    <option>16px</option>
                    <option>18px</option>
                    <option>24px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
                  <input
                    type="color"
                    className="w-full h-6 sm:h-8 border border-gray-300 rounded cursor-pointer"
                    defaultValue="#000000"
                  />
                </div>
              </>
            )}

            {currentTool === 'highlight' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
                <div className="grid grid-cols-4 gap-1 sm:gap-2">
                  <button className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-300 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"></button>
                  <button className="w-6 h-6 sm:w-8 sm:h-8 bg-green-300 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"></button>
                  <button className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-300 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"></button>
                  <button className="w-6 h-6 sm:w-8 sm:h-8 bg-pink-300 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"></button>
                </div>
              </div>
            )}

            {(currentTool === 'rectangle' || currentTool === 'circle') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cor da Borda</label>
                  <input
                    type="color"
                    className="w-full h-6 sm:h-8 border border-gray-300 rounded cursor-pointer"
                    defaultValue="#000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Espessura</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    defaultValue="2"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}

            {currentTool === 'draw' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
                  <input
                    type="color"
                    className="w-full h-6 sm:h-8 border border-gray-300 rounded cursor-pointer"
                    defaultValue="#000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Espessura</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    defaultValue="3"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}