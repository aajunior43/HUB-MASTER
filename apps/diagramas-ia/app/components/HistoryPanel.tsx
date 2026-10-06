'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  Star, 
  Trash2, 
  Download, 
  Eye, 
  Copy,
  Edit3,
  Calendar,
  Tag,
  MoreVertical,
  X
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTimestamp } from '../lib/utils'
import { AIPrompt, SavedDiagram } from '../types'

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onLoadDiagram: (diagram: SavedDiagram) => void
  onReuseDiagram: (prompt: AIPrompt) => void
}

type HistoryTab = 'prompts' | 'diagrams' | 'recent'
type SortBy = 'date' | 'name' | 'usage'
type FilterBy = 'all' | 'success' | 'failed' | 'favorites'

export default function HistoryPanel({ 
  isOpen, 
  onClose, 
  onLoadDiagram, 
  onReuseDiagram 
}: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const {
    promptHistory,
    savedDiagrams,
    recentActions,
    clearPromptHistory,
    clearRecentActions,
    deleteSavedDiagram,
    updateSavedDiagram
  } = useAppStore()

  // Filtrar e ordenar dados
  const filteredPrompts = useMemo(() => {
    let filtered = promptHistory.filter(prompt => {
      const matchesSearch = prompt.text.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'success' && prompt.success) ||
        (filterBy === 'failed' && !prompt.success)
      
      return matchesSearch && matchesFilter
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt - a.createdAt
        case 'name':
          return a.text.localeCompare(b.text)
        case 'usage':
          return (b.processingTime || 0) - (a.processingTime || 0)
        default:
          return 0
      }
    })
  }, [promptHistory, searchQuery, sortBy, filterBy])

  const filteredDiagrams = useMemo(() => {
    let filtered = savedDiagrams.filter(diagram => {
      const matchesSearch = diagram.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (diagram.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      
      return matchesSearch
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.updatedAt - a.updatedAt
        case 'name':
          return a.name.localeCompare(b.name)
        case 'usage':
          return b.views - a.views
        default:
          return 0
      }
    })
  }, [savedDiagrams, searchQuery, sortBy])

  const recentData = useMemo(() => {
    return recentActions
      .filter(action => action.description.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 20)
  }, [recentActions, searchQuery])

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkDelete = () => {
    selectedItems.forEach(id => {
      if (activeTab === 'diagrams') {
        deleteSavedDiagram(id)
      }
      // Para prompts, implementar bulk delete
    })
    setSelectedItems(new Set())
  }

  const handleToggleFavorite = (diagramId: string) => {
    const diagram = savedDiagrams.find(d => d.id === diagramId)
    if (diagram) {
      updateSavedDiagram(diagramId, { 
        tags: diagram.tags.includes('favorite') 
          ? diagram.tags.filter(tag => tag !== 'favorite')
          : [...diagram.tags, 'favorite']
      })
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Histórico
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'recent', label: 'Recente', icon: Clock },
            { key: 'prompts', label: 'Prompts', icon: Edit3 },
            { key: 'diagrams', label: 'Diagramas', icon: Star },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as HistoryTab)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center gap-2 ml-4">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="date">Data</option>
              <option value="name">Nome</option>
              <option value="usage">Uso</option>
            </select>

            {/* Filter */}
            {activeTab === 'prompts' && (
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterBy)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">Todos</option>
                <option value="success">Sucesso</option>
                <option value="failed">Falhou</option>
              </select>
            )}

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedItems.size} selecionados
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'recent' && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >
                {recentData.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {action.description}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(action.timestamp)}
                      </span>
                    </div>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                      {action.type}
                    </span>
                  </div>
                ))}
                
                {recentData.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Nenhuma atividade recente
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'prompts' && (
              <motion.div
                key="prompts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(prompt.id)}
                            onChange={() => handleSelectItem(prompt.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`w-2 h-2 rounded-full ${
                            prompt.success ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(prompt.createdAt)}
                          </span>
                          {prompt.processingTime && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              {prompt.processingTime}ms
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                          {prompt.text}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{prompt.config.format}</span>
                          <span>•</span>
                          <span>{prompt.config.complexity}</span>
                          <span>•</span>
                          <span>{prompt.config.style}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => onReuseDiagram(prompt)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Reutilizar prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        {prompt.result && (
                          <button
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Ver resultado"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredPrompts.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Nenhum prompt encontrado
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'diagrams' && (
              <motion.div
                key="diagrams"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {filteredDiagrams.map((diagram) => (
                  <div
                    key={diagram.id}
                    className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(diagram.id)}
                          onChange={() => handleSelectItem(diagram.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {diagram.name}
                        </h3>
                      </div>
                      
                      <button
                        onClick={() => handleToggleFavorite(diagram.id)}
                        className={`p-1 rounded transition-colors ${
                          diagram.tags.includes('favorite')
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-400 hover:text-yellow-500'
                        }`}
                      >
                        <Star className="w-4 h-4" fill={diagram.tags.includes('favorite') ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    
                    {diagram.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {diagram.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span>{formatTimestamp(diagram.updatedAt)}</span>
                      <div className="flex items-center gap-3">
                        <span>{diagram.data.nodes.length} nós</span>
                        <span>{diagram.views} visualizações</span>
                      </div>
                    </div>
                    
                    {diagram.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {diagram.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {diagram.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{diagram.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onLoadDiagram(diagram)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Abrir
                      </button>
                      
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Exportar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Mais opções"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {filteredDiagrams.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                    Nenhum diagrama salvo encontrado
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'prompts' && `${filteredPrompts.length} prompts`}
            {activeTab === 'diagrams' && `${filteredDiagrams.length} diagramas`}
            {activeTab === 'recent' && `${recentData.length} ações recentes`}
          </div>
          
          <div className="flex gap-2">
            {activeTab === 'prompts' && (
              <button
                onClick={clearPromptHistory}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
              >
                Limpar Histórico
              </button>
            )}
            
            {activeTab === 'recent' && (
              <button
                onClick={clearRecentActions}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
              >
                Limpar Recentes
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
