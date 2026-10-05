'use client'

import { BarChart3, Circle, GitBranch, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface DiagramStatsProps {
  nodes: any[]
  edges: any[]
  isVisible: boolean
}

export default function DiagramStats({ nodes, edges, isVisible }: DiagramStatsProps) {
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalEdges: 0,
    nodeTypes: { rectangle: 0, circle: 0, diamond: 0 },
    createdAt: new Date().toLocaleTimeString()
  })

  useEffect(() => {
    const nodeTypes = { rectangle: 0, circle: 0, diamond: 0 }
    nodes.forEach(node => {
      if (node.data?.type) {
        nodeTypes[node.data.type as keyof typeof nodeTypes]++
      }
    })

    setStats({
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      createdAt: new Date().toLocaleTimeString()
    })
  }, [nodes, edges])

  if (!isVisible || nodes.length === 0) return null

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 min-w-[200px] z-10">
      <div className="flex items-center space-x-2 mb-3">
        <BarChart3 size={16} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-800">Estatísticas</h3>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Circle size={12} className="text-gray-500" />
            <span className="text-gray-600">Nós:</span>
          </div>
          <span className="font-medium text-gray-800">{stats.totalNodes}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitBranch size={12} className="text-gray-500" />
            <span className="text-gray-600">Conexões:</span>
          </div>
          <span className="font-medium text-gray-800">{stats.totalEdges}</span>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="text-gray-600 mb-1">Tipos:</div>
          <div className="space-y-1">
            {stats.nodeTypes.rectangle > 0 && (
              <div className="flex justify-between">
                <span className="text-blue-600">Processos:</span>
                <span className="font-medium">{stats.nodeTypes.rectangle}</span>
              </div>
            )}
            {stats.nodeTypes.circle > 0 && (
              <div className="flex justify-between">
                <span className="text-green-600">Início/Fim:</span>
                <span className="font-medium">{stats.nodeTypes.circle}</span>
              </div>
            )}
            {stats.nodeTypes.diamond > 0 && (
              <div className="flex justify-between">
                <span className="text-orange-600">Decisões:</span>
                <span className="font-medium">{stats.nodeTypes.diamond}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-2 mt-2 flex items-center space-x-2">
          <Clock size={12} className="text-gray-400" />
          <span className="text-gray-500">Criado: {stats.createdAt}</span>
        </div>
      </div>
    </div>
  )
}