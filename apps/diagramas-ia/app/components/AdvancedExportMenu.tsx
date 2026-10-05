'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Image, 
  Download, 
  Settings, 
  X, 
  FileDown,
  Presentation,
  File,
  ImageIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAdvancedExport, ExportOptions } from '../hooks/useAdvancedExport'
import { Node, Edge } from '@xyflow/react'

interface AdvancedExportMenuProps {
  nodes: Node[]
  edges: Edge[]
  isOpen: boolean
  onClose: () => void
  onExportComplete?: (result: any) => void
}

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  extension: string
  color: string
}

const exportFormats: ExportFormat[] = [
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Documento PDF de alta qualidade',
    icon: <File className="w-5 h-5" />,
    extension: 'pdf',
    color: 'bg-red-500'
  },
  {
    id: 'docx',
    name: 'Word Document',
    description: 'Documento Word com metadados',
    icon: <FileText className="w-5 h-5" />,
    extension: 'docx',
    color: 'bg-blue-500'
  },
  {
    id: 'pptx',
    name: 'PowerPoint',
    description: 'Formato para apresentações',
    icon: <Presentation className="w-5 h-5" />,
    extension: 'html',
    color: 'bg-orange-500'
  },
  {
    id: 'png-hd',
    name: 'PNG HD',
    description: 'Imagem PNG alta resolução',
    icon: <ImageIcon className="w-5 h-5" />,
    extension: 'png',
    color: 'bg-green-500'
  },
  {
    id: 'jpg-hd',
    name: 'JPG HD',
    description: 'Imagem JPG alta resolução',
    icon: <Image className="w-5 h-5" />,
    extension: 'jpg',
    color: 'bg-purple-500'
  }
]

export default function AdvancedExportMenu({ 
  nodes, 
  edges, 
  isOpen, 
  onClose, 
  onExportComplete 
}: AdvancedExportMenuProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    quality: 1.0,
    includeBackground: true,
    includeWatermark: false,
    customSize: { width: 1200, height: 800 },
    metadata: {
      title: 'Diagrama IA',
      author: 'Diagramas IA',
      description: '',
      subject: 'Diagrama automatizado'
    }
  })

  const { 
    exportAsPDF, 
    exportAsDOCX, 
    exportAsPowerPoint, 
    exportAsHighQualityImage 
  } = useAdvancedExport()

  const handleExport = async () => {
    if (nodes.length === 0) {
      setExportResult({
        success: false,
        errorMessage: 'Nenhum diagrama para exportar'
      })
      return
    }

    setIsExporting(true)
    setExportResult(null)

    try {
      let result
      const options = { ...exportOptions, format: selectedFormat as any }

      switch (selectedFormat) {
        case 'pdf':
          result = await exportAsPDF(nodes, edges, options)
          break
        case 'docx':
          result = await exportAsDOCX(nodes, edges, options)
          break
        case 'pptx':
          result = await exportAsPowerPoint(nodes, edges, options)
          break
        case 'png-hd':
          result = await exportAsHighQualityImage(nodes, edges, { ...options, format: 'png' })
          break
        case 'jpg-hd':
          result = await exportAsHighQualityImage(nodes, edges, { ...options, format: 'jpg' })
          break
        default:
          throw new Error('Formato de exportação não suportado')
      }

      setExportResult(result)
      if (onExportComplete) {
        onExportComplete(result)
      }
    } catch (error) {
      setExportResult({
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const selectedFormatData = exportFormats.find(f => f.id === selectedFormat)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Exportação Avançada
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {nodes.length} elementos, {edges.length} conexões
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* Formatos de Exportação */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                  Escolha o Formato
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {exportFormats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`
                        p-4 rounded-lg border-2 transition-all text-left
                        ${selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg text-white ${format.color}`}>
                          {format.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {format.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {format.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configurações Avançadas */}
              <div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Settings className="w-4 h-4" />
                  Configurações Avançadas
                </button>
                
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4"
                    >
                      {/* Qualidade */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Qualidade: {Math.round(exportOptions.quality! * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="1"
                          step="0.1"
                          value={exportOptions.quality}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            quality: parseFloat(e.target.value)
                          }))}
                          className="w-full"
                        />
                      </div>

                      {/* Dimensões */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Largura</label>
                          <input
                            type="number"
                            value={exportOptions.customSize?.width}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              customSize: {
                                ...prev.customSize!,
                                width: parseInt(e.target.value)
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Altura</label>
                          <input
                            type="number"
                            value={exportOptions.customSize?.height}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              customSize: {
                                ...prev.customSize!,
                                height: parseInt(e.target.value)
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                          />
                        </div>
                      </div>

                      {/* Metadados */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Título</label>
                        <input
                          type="text"
                          value={exportOptions.metadata?.title}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            metadata: {
                              ...prev.metadata!,
                              title: e.target.value
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                          placeholder="Título do diagrama"
                        />
                      </div>

                      {/* Opções */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exportOptions.includeBackground}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              includeBackground: e.target.checked
                            }))}
                            className="rounded"
                          />
                          <span className="text-sm">Incluir fundo</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={exportOptions.includeWatermark}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              includeWatermark: e.target.checked
                            }))}
                            className="rounded"
                          />
                          <span className="text-sm">Incluir marca d'água</span>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Resultado da Exportação */}
              {exportResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    p-4 rounded-lg flex items-center gap-3
                    ${exportResult.success 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }
                  `}
                >
                  {exportResult.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">
                      {exportResult.success 
                        ? `Exportação concluída: ${exportResult.filename}` 
                        : 'Erro na exportação'
                      }
                    </div>
                    {exportResult.errorMessage && (
                      <div className="text-sm opacity-80">
                        {exportResult.errorMessage}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Formato: {selectedFormatData?.name} (.{selectedFormatData?.extension})
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || nodes.length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exportar
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
