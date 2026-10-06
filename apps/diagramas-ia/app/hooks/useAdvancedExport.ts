'use client'

import { useCallback } from 'react'
import { getRectOfNodes, getTransformForBounds } from '@xyflow/react'
import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, ImageRun, AlignmentType } from 'docx'
import { Node, Edge } from '@xyflow/react'

export interface ExportOptions {
  format: 'png' | 'svg' | 'json' | 'pdf' | 'docx' | 'pptx'
  quality?: number
  includeBackground?: boolean
  includeWatermark?: boolean
  customSize?: {
    width: number
    height: number
  }
  metadata?: {
    title?: string
    author?: string
    description?: string
    subject?: string
  }
}

export interface ExportResult {
  success: boolean
  data?: Blob | string
  filename: string
  errorMessage?: string
  downloadUrl?: string
}

export const useAdvancedExport = () => {
  
  const exportAsPDF = useCallback(async (
    nodes: Node[], 
    edges: Edge[], 
    options: ExportOptions = {}
  ): Promise<ExportResult> => {
    try {
      const { 
        quality = 1.0, 
        customSize = { width: 1200, height: 800 }, 
        metadata = {},
        includeBackground = true 
      } = options

      // Capturar o diagrama como canvas
      const canvas = await captureAsCanvas(nodes, edges, customSize, includeBackground)
      
      // Criar PDF
      const pdf = new jsPDF({
        orientation: customSize.width > customSize.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [customSize.width, customSize.height]
      })

      // Adicionar metadados
      if (metadata.title) pdf.setProperties({ title: metadata.title })
      if (metadata.author) pdf.setProperties({ author: metadata.author })
      if (metadata.subject) pdf.setProperties({ subject: metadata.subject })

      // Adicionar imagem ao PDF
      const imgData = canvas.toDataURL('image/jpeg', quality)
      pdf.addImage(imgData, 'JPEG', 0, 0, customSize.width, customSize.height)

      // Adicionar informações do diagrama
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, customSize.height - 20)
      pdf.text(`Nós: ${nodes.length} | Conexões: ${edges.length}`, 10, customSize.height - 10)

      // Gerar blob
      const pdfBlob = pdf.output('blob')
      const filename = `diagrama_${Date.now()}.pdf`

      saveAs(pdfBlob, filename)

      return {
        success: true,
        data: pdfBlob,
        filename,
        downloadUrl: URL.createObjectURL(pdfBlob)
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      return {
        success: false,
        filename: '',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }, [])

  const exportAsDOCX = useCallback(async (
    nodes: Node[], 
    edges: Edge[], 
    options: ExportOptions = {}
  ): Promise<ExportResult> => {
    try {
      const { 
        customSize = { width: 1200, height: 800 }, 
        metadata = {},
        includeBackground = true 
      } = options

      // Capturar o diagrama como canvas
      const canvas = await captureAsCanvas(nodes, edges, customSize, includeBackground)
      const imageArrayBuffer = await canvasToArrayBuffer(canvas)

      // Criar documento DOCX
      const doc = new Document({
        properties: {
          title: metadata.title || 'Diagrama IA',
          author: metadata.author || 'Diagramas IA',
          subject: metadata.subject || 'Diagrama gerado automaticamente',
          description: metadata.description || `Diagrama com ${nodes.length} elementos e ${edges.length} conexões`
        },
        sections: [{
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageArrayBuffer,
                  transformation: {
                    width: Math.min(600, customSize.width * 0.6),
                    height: Math.min(400, customSize.height * 0.6),
                  },
                })
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: `Informações do Diagrama:`,
              heading: 'Heading2',
            }),
            new Paragraph({
              text: `• Número de elementos: ${nodes.length}`,
            }),
            new Paragraph({
              text: `• Número de conexões: ${edges.length}`,
            }),
            new Paragraph({
              text: `• Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            }),
            new Paragraph({
              text: `• Ferramenta: Diagramas IA`,
            }),
          ],
        }],
      })

      // Gerar arquivo DOCX
      const docxBuffer = await Packer.toBuffer(doc)
      const docxBlob = new Blob([docxBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      const filename = `diagrama_${Date.now()}.docx`

      saveAs(docxBlob, filename)

      return {
        success: true,
        data: docxBlob,
        filename,
        downloadUrl: URL.createObjectURL(docxBlob)
      }
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error)
      return {
        success: false,
        filename: '',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }, [])

  const exportAsPowerPoint = useCallback(async (
    nodes: Node[], 
    edges: Edge[], 
    options: ExportOptions = {}
  ): Promise<ExportResult> => {
    try {
      // Para PowerPoint, vamos usar uma implementação simplificada
      // criando um HTML que pode ser copiado para PowerPoint
      const { 
        customSize = { width: 1200, height: 800 }, 
        metadata = {} 
      } = options

      const canvas = await captureAsCanvas(nodes, edges, customSize, true)
      const imageData = canvas.toDataURL('image/png', 1.0)

      // Criar conteúdo HTML para PowerPoint
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${metadata.title || 'Diagrama IA'}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 20px; 
              text-align: center;
            }
            .diagram-container { 
              margin: 20px 0; 
              border: 1px solid #ddd; 
              border-radius: 8px; 
              overflow: hidden;
            }
            .diagram-image { 
              max-width: 100%; 
              height: auto; 
            }
            .metadata { 
              text-align: left; 
              background: #f5f5f5; 
              padding: 15px; 
              margin-top: 20px; 
              border-radius: 5px;
            }
            .metadata h3 { 
              margin-top: 0; 
              color: #333; 
            }
            .stats { 
              display: flex; 
              justify-content: space-around; 
              margin: 10px 0;
            }
            .stat-item { 
              text-align: center; 
              padding: 10px;
            }
            .stat-number { 
              font-size: 24px; 
              font-weight: bold; 
              color: #2563eb;
            }
          </style>
        </head>
        <body>
          <h1>${metadata.title || 'Diagrama Gerado por IA'}</h1>
          
          <div class="diagram-container">
            <img src="${imageData}" alt="Diagrama" class="diagram-image" />
          </div>

          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${nodes.length}</div>
              <div>Elementos</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${edges.length}</div>
              <div>Conexões</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${(nodes.length + edges.length)}</div>
              <div>Total</div>
            </div>
          </div>

          <div class="metadata">
            <h3>Informações do Diagrama</h3>
            <p><strong>Autor:</strong> ${metadata.author || 'Diagramas IA'}</p>
            <p><strong>Data de Criação:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Descrição:</strong> ${metadata.description || 'Diagrama criado automaticamente'}</p>
            <p><strong>Dimensões:</strong> ${customSize.width} x ${customSize.height} pixels</p>
          </div>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Para usar no PowerPoint: Copie e cole este conteúdo ou salve como HTML e importe.
          </p>
        </body>
        </html>
      `

      const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' })
      const filename = `diagrama_powerpoint_${Date.now()}.html`

      saveAs(htmlBlob, filename)

      return {
        success: true,
        data: htmlBlob,
        filename,
        downloadUrl: URL.createObjectURL(htmlBlob)
      }
    } catch (error) {
      console.error('Erro ao exportar PowerPoint:', error)
      return {
        success: false,
        filename: '',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }, [])

  const exportAsHighQualityImage = useCallback(async (
    nodes: Node[], 
    edges: Edge[], 
    options: ExportOptions = {}
  ): Promise<ExportResult> => {
    try {
      const { 
        format = 'png',
        quality = 1.0,
        customSize = { width: 2400, height: 1600 }, // Alta resolução
        includeBackground = true 
      } = options

      const canvas = await captureAsCanvas(nodes, edges, customSize, includeBackground)
      
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const extension = format === 'jpg' ? 'jpg' : 'png'
      
      canvas.toBlob((blob) => {
        if (blob) {
          const filename = `diagrama_hd_${Date.now()}.${extension}`
          saveAs(blob, filename)
        }
      }, mimeType, quality)

      return {
        success: true,
        filename: `diagrama_hd_${Date.now()}.${extension}`
      }
    } catch (error) {
      console.error('Erro ao exportar imagem HD:', error)
      return {
        success: false,
        filename: '',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }, [])

  // Função auxiliar para capturar diagrama como canvas
  const captureAsCanvas = async (
    nodes: Node[], 
    edges: Edge[], 
    size: { width: number; height: number },
    includeBackground: boolean
  ): Promise<HTMLCanvasElement> => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!viewport) {
      throw new Error('Viewport do diagrama não encontrado')
    }

    const nodesBounds = getRectOfNodes(nodes)
    const transform = getTransformForBounds(nodesBounds, size.width, size.height, 0.1, 2)

    return html2canvas(viewport, {
      backgroundColor: includeBackground ? '#ffffff' : 'transparent',
      width: size.width,
      height: size.height,
      scale: 2, // Para melhor qualidade
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
    })
  }

  // Função auxiliar para converter canvas para ArrayBuffer
  const canvasToArrayBuffer = async (canvas: HTMLCanvasElement): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = reject
          reader.readAsArrayBuffer(blob)
        } else {
          reject(new Error('Falha ao converter canvas para blob'))
        }
      }, 'image/png', 1.0)
    })
  }

  return {
    exportAsPDF,
    exportAsDOCX,
    exportAsPowerPoint,
    exportAsHighQualityImage
  }
}
