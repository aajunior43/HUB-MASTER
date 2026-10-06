'use client'

import { Square, Circle, Diamond, ArrowRight } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
}

const nodeTypes = [
  { type: 'rectangle', icon: Square, label: 'Retângulo' },
  { type: 'circle', icon: Circle, label: 'Círculo' },
  { type: 'diamond', icon: Diamond, label: 'Losango' },
]

export default function Sidebar({ isOpen }: SidebarProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  if (!isOpen) return null

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Elementos
          </h3>
          <div className="space-y-2">
            {nodeTypes.map(({ type, icon: Icon, label }) => (
              <div
                key={type}
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-move hover:bg-gray-50 transition-colors"
                draggable
                onDragStart={(event) => onDragStart(event, type)}
              >
                <Icon size={20} className="text-gray-600" />
                <span className="text-sm text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Conectores
          </h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
              <ArrowRight size={20} className="text-gray-600" />
              <span className="text-sm text-gray-700">Seta</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Propriedades
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cor de Fundo
              </label>
              <input
                type="color"
                className="w-full h-8 border border-gray-200 rounded"
                defaultValue="#ffffff"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cor da Borda
              </label>
              <input
                type="color"
                className="w-full h-8 border border-gray-200 rounded"
                defaultValue="#e2e8f0"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}