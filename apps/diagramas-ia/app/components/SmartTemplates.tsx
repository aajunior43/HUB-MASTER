'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Template, 
  Search, 
  Star, 
  Clock, 
  TrendingUp, 
  Filter,
  Grid,
  List,
  ChevronDown,
  Play,
  Eye,
  Copy,
  Sparkles,
  Target,
  Brain,
  Zap
} from 'lucide-react'
import { useTemplateEngine, SmartTemplate, TemplateRecommendation, TemplateCategory } from '../lib/templateEngine'
import { DiagramData } from '../types'

interface SmartTemplatesProps {
  isOpen: boolean
  onClose: () => void
  onTemplateSelect?: (template: SmartTemplate, data: DiagramData) => void
  currentPrompt?: string
}

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | 'recommended' | 'popular' | 'recent' | TemplateCategory

const categoryLabels: Record<TemplateCategory, string> = {
  business: 'Negócios',
  software: 'Software',
  education: 'Educação',
  flowchart: 'Fluxograma',
  organization: 'Organização',
  process: 'Processo',
  architecture: 'Arquitetura',
  mindmap: 'Mapa Mental',
  network: 'Rede',
  database: 'Banco de Dados',
  other: 'Outros'
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800'
}

const difficultyLabels = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado'
}

export default function SmartTemplates({ 
  isOpen, 
  onClose, 
  onTemplateSelect,
  currentPrompt = ''
}: SmartTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [templates, setTemplates] = useState<SmartTemplate[]>([])
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<SmartTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const {
    analyzePrompt,
    recommendTemplates,
    applyTemplate,
    getTemplatesByCategory,
    getPopularTemplates,
    getRecentTemplates,
    searchTemplates,
    getUsageStats
  } = useTemplateEngine()

  // Carregar templates iniciais
  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      if (currentPrompt) {
        generateRecommendations()
      }
    }
  }, [isOpen, currentPrompt, selectedFilter])

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      let loadedTemplates: SmartTemplate[] = []

      switch (selectedFilter) {
        case 'popular':
          loadedTemplates = getPopularTemplates(20)
          break
        case 'recent':
          loadedTemplates = getRecentTemplates(20)
          break
        case 'recommended':
          loadedTemplates = recommendations.map(r => r.template)
          break
        default:
          if (selectedFilter !== 'all') {
            loadedTemplates = getTemplatesByCategory(selectedFilter as TemplateCategory)
          } else {
            loadedTemplates = getPopularTemplates(50) // Carrega todos populares como fallback
          }
      }

      // Aplicar busca se existir
      if (searchQuery) {
        loadedTemplates = searchTemplates(searchQuery)
      }

      setTemplates(loadedTemplates)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedFilter, searchQuery, recommendations, getTemplatesByCategory, getPopularTemplates, getRecentTemplates, searchTemplates])

  const generateRecommendations = useCallback(async () => {
    if (!currentPrompt) return

    setLoading(true)
    try {
      const analysis = analyzePrompt(currentPrompt)
      const recs = recommendTemplates(currentPrompt, 10)
      setRecommendations(recs)
      
      if (selectedFilter === 'recommended') {
        setTemplates(recs.map(r => r.template))
      }
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPrompt, analyzePrompt, recommendTemplates, selectedFilter])

  const handleTemplateSelect = useCallback((template: SmartTemplate) => {
    try {
      const diagramData = applyTemplate(template)
      if (onTemplateSelect) {
        onTemplateSelect(template, diagramData)
      }
      onClose()
    } catch (error) {
      console.error('Erro ao aplicar template:', error)
    }
  }, [applyTemplate, onTemplateSelect, onClose])

  const handlePreviewTemplate = useCallback((template: SmartTemplate) => {
    setSelectedTemplate(template)
    setShowPreview(true)
  }, [])

  const getRecommendationScore = useCallback((template: SmartTemplate) => {
    const rec = recommendations.find(r => r.template.id === template.id)
    return rec ? Math.round(rec.score * 100) : 0
  }, [recommendations])

  const getRecommendationReasons = useCallback((template: SmartTemplate) => {
    const rec = recommendations.find(r => r.template.id === template.id)
    return rec ? rec.reasons : []
  }, [recommendations])

  const filterOptions = [
    { value: 'all' as FilterType, label: 'Todos', icon: Grid },
    { value: 'recommended' as FilterType, label: 'Recomendados', icon: Target },
    { value: 'popular' as FilterType, label: 'Populares', icon: TrendingUp },
    { value: 'recent' as FilterType, label: 'Recentes', icon: Clock },
    ...Object.entries(categoryLabels).map(([key, label]) => ({
      value: key as FilterType,
      label,
      icon: Template
    }))
  ]

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
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Templates Inteligentes
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentPrompt ? 'Recomendações baseadas no seu prompt' : 'Escolha um template para começar rapidamente'}
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

            {/* Barra de Busca e Filtros */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
              {/* Análise do Prompt */}
              {currentPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Análise IA do Prompt
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    "{currentPrompt}"
                  </p>
                  {recommendations.length > 0 && (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      {recommendations.length} templates recomendados com base na análise
                    </div>
                  )}
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Busca */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as FilterType)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {filterOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {/* View Mode Toggle */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-white dark:bg-gray-600 shadow-sm' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-white dark:bg-gray-600 shadow-sm' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Templates */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600 dark:text-gray-400">Carregando templates...</span>
                  </div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <Template className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum template encontrado
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Tente ajustar os filtros ou termo de busca
                  </p>
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-3'
                }>
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      viewMode={viewMode}
                      isRecommended={recommendations.some(r => r.template.id === template.id)}
                      recommendationScore={getRecommendationScore(template)}
                      recommendationReasons={getRecommendationReasons(template)}
                      onSelect={() => handleTemplateSelect(template)}
                      onPreview={() => handlePreviewTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Template Preview Modal */}
            <AnimatePresence>
              {showPreview && selectedTemplate && (
                <TemplatePreview
                  template={selectedTemplate}
                  onClose={() => setShowPreview(false)}
                  onSelect={() => handleTemplateSelect(selectedTemplate)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Componente do Card de Template
interface TemplateCardProps {
  template: SmartTemplate
  viewMode: ViewMode
  isRecommended: boolean
  recommendationScore: number
  recommendationReasons: string[]
  onSelect: () => void
  onPreview: () => void
}

function TemplateCard({ 
  template, 
  viewMode, 
  isRecommended, 
  recommendationScore,
  recommendationReasons,
  onSelect, 
  onPreview 
}: TemplateCardProps) {
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
      >
        {/* Preview/Icon */}
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <Template className="w-8 h-8 text-gray-400" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
            {isRecommended && (
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  {recommendationScore}% match
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{template.description}</p>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[template.difficulty]}`}>
              {difficultyLabels[template.difficulty]}
            </span>
            <span className="text-xs text-gray-500">{categoryLabels[template.category]}</span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-gray-500">{template.rating}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onSelect}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Usar
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-500 transition-colors group cursor-pointer"
      onClick={onPreview}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
            {template.name}
          </h3>
          {isRecommended && (
            <div className="flex items-center gap-1 mb-2">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                {recommendationScore}% compatível
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500" />
          <span className="text-xs text-gray-500">{template.rating}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="w-full h-24 bg-gray-100 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
        <Template className="w-8 h-8 text-gray-400" />
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
        {template.description}
      </p>

      {/* Tags */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[template.difficulty]}`}>
          {difficultyLabels[template.difficulty]}
        </span>
        <span className="text-xs text-gray-500">{template.usageCount} usos</span>
      </div>

      {/* Recommendation Reasons */}
      {isRecommended && recommendationReasons.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
            Por que recomendamos:
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {recommendationReasons[0]}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <Play className="w-3 h-3" />
          Usar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPreview()
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Eye className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}

// Componente de Preview do Template
interface TemplatePreviewProps {
  template: SmartTemplate
  onClose: () => void
  onSelect: () => void
}

function TemplatePreview({ template, onClose, onSelect }: TemplatePreviewProps) {
  return (
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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {template.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {template.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {template.nodes.length}
              </div>
              <div className="text-sm text-gray-500">Elementos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {template.edges.length}
              </div>
              <div className="text-sm text-gray-500">Conexões</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {template.usageCount}
              </div>
              <div className="text-sm text-gray-500">Usos</div>
            </div>
          </div>

          {/* Preview Visual */}
          <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center">
              <Template className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">
                Preview do template estará disponível em breve
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Informações</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Categoria:</span>
                  <span>{categoryLabels[template.category]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dificuldade:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${difficultyColors[template.difficulty]}`}>
                    {difficultyLabels[template.difficulty]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avaliação:</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>{template.rating}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Popularidade:</span>
                  <span>{template.popularity}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {template.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Examples */}
          {template.examples.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Exemplos de Uso</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {template.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Criado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={onSelect}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Usar Template
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
