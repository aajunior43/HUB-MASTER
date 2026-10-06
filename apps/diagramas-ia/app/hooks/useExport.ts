'use client'

import { useCallback } from 'react'
import { getRectOfNodes, getTransformForBounds } from 'reactflow'
import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'

export const useExport = () => {
  const exportAsImage = useCallback(async (nodes: any[], edges: any[]) => {
    const nodesBounds = getRectOfNodes(nodes)
    const transform = getTransformForBounds(nodesBounds, 1024, 768, 0.5, 2)
    
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!viewport) return

    try {
      const canvas = await html2canvas(viewport, {
        backgroundColor: '#ffffff',
        width: 1024,
        height: 768,
      })
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, 'diagrama.png')
        }
      })
    } catch (error) {
      console.error('Erro ao exportar imagem:', error)
    }
  }, [])

  const exportAsJSON = useCallback((nodes: any[], edges: any[]) => {
    const data = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    
    saveAs(blob, 'diagrama.json')
  }, [])

  const exportAsSVG = useCallback((nodes: any[], edges: any[]) => {
    // Implementação básica de exportação SVG
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768">
        <rect width="100%" height="100%" fill="white"/>
        ${nodes.map(node => `
          <rect x="${node.position.x}" y="${node.position.y}" 
                width="120" height="40" 
                fill="white" stroke="#e5e7eb" stroke-width="2" rx="8"/>
          <text x="${node.position.x + 60}" y="${node.position.y + 25}" 
                text-anchor="middle" font-family="Arial" font-size="14">
            ${node.data.label}
          </text>
        `).join('')}
      </svg>
    `
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    saveAs(blob, 'diagrama.svg')
  }, [])

  return {
    exportAsImage,
    exportAsJSON,
    exportAsSVG,
  }
}