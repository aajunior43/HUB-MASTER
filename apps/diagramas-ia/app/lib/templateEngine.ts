'use client'

import { Node, Edge } from '@xyflow/react'
import { DiagramData, DiagramConfig } from '../types'

export interface SmartTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  keywords: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  popularity: number
  usageCount: number
  nodes: Node[]
  edges: Edge[]
  config: Partial<DiagramConfig>
  variables?: TemplateVariable[]
  preview?: string
  createdAt: number
  updatedAt: number
  author?: string
  isPublic: boolean
  rating: number
  examples: string[]
}

export interface TemplateVariable {
  id: string
  name: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'color'
  label: string
  description?: string
  defaultValue: any
  options?: { label: string; value: any }[]
  validation?: {
    required?: boolean
    min?: number
    max?: number
    pattern?: string
  }
}

export type TemplateCategory = 
  | 'business'
  | 'software'
  | 'education'
  | 'flowchart'
  | 'organization'
  | 'process'
  | 'architecture'
  | 'mindmap'
  | 'network'
  | 'database'
  | 'other'

export interface TemplateRecommendation {
  template: SmartTemplate
  score: number
  reasons: string[]
  confidence: number
}

export interface TemplateAnalysis {
  prompt: string
  extractedKeywords: string[]
  detectedCategory: TemplateCategory
  complexity: 'simple' | 'medium' | 'complex'
  suggestedFormat: string
  confidence: number
}

class TemplateEngine {
  private templates: SmartTemplate[] = []
  private userHistory: string[] = []
  private preferences: Record<string, any> = {}

  constructor() {
    this.initializeTemplates()
    this.loadUserPreferences()
  }

  private initializeTemplates() {
    this.templates = [
      // Templates de Negócio
      {
        id: 'user-login-flow',
        name: 'Fluxo de Login de Usuário',
        description: 'Template para processo de autenticação completo',
        category: 'business',
        tags: ['login', 'authentication', 'security', 'user'],
        keywords: ['login', 'senha', 'autenticar', 'usuário', 'acesso', 'entrar'],
        difficulty: 'beginner',
        popularity: 95,
        usageCount: 245,
        nodes: [
          { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Início', type: 'circle' } },
          { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Inserir Credenciais', type: 'rectangle' } },
          { id: '3', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Validar Credenciais', type: 'rectangle' } },
          { id: '4', type: 'custom', position: { x: 250, y: 350 }, data: { label: 'Credenciais Válidas?', type: 'diamond' } },
          { id: '5', type: 'custom', position: { x: 400, y: 450 }, data: { label: 'Acesso Liberado', type: 'rectangle' } },
          { id: '6', type: 'custom', position: { x: 100, y: 450 }, data: { label: 'Mostrar Erro', type: 'rectangle' } },
          { id: '7', type: 'custom', position: { x: 400, y: 550 }, data: { label: 'Fim', type: 'circle' } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e3-4', source: '3', target: '4' },
          { id: 'e4-5', source: '4', target: '5' },
          { id: 'e4-6', source: '4', target: '6' },
          { id: 'e5-7', source: '5', target: '7' },
          { id: 'e6-2', source: '6', target: '2' }
        ],
        config: { format: 'flowchart', complexity: 'medium', style: 'modern' },
        preview: '/templates/login-flow.png',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        author: 'Template Engine',
        isPublic: true,
        rating: 4.8,
        examples: [
          'Processo de login de usuário',
          'Autenticação de sistema',
          'Fluxo de acesso seguro'
        ]
      },
      
      {
        id: 'ecommerce-purchase',
        name: 'Processo de Compra E-commerce',
        description: 'Fluxo completo de compra online',
        category: 'business',
        tags: ['ecommerce', 'purchase', 'shopping', 'payment'],
        keywords: ['compra', 'carrinho', 'pagamento', 'produto', 'checkout', 'pedido'],
        difficulty: 'intermediate',
        popularity: 88,
        usageCount: 189,
        nodes: [
          { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Navegar Produtos', type: 'circle' } },
          { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Selecionar Produto', type: 'rectangle' } },
          { id: '3', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Adicionar ao Carrinho', type: 'rectangle' } },
          { id: '4', type: 'custom', position: { x: 250, y: 350 }, data: { label: 'Revisar Carrinho', type: 'rectangle' } },
          { id: '5', type: 'custom', position: { x: 250, y: 450 }, data: { label: 'Checkout', type: 'rectangle' } },
          { id: '6', type: 'custom', position: { x: 250, y: 550 }, data: { label: 'Pagamento', type: 'rectangle' } },
          { id: '7', type: 'custom', position: { x: 250, y: 650 }, data: { label: 'Confirmação', type: 'circle' } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e3-4', source: '3', target: '4' },
          { id: 'e4-5', source: '4', target: '5' },
          { id: 'e5-6', source: '5', target: '6' },
          { id: 'e6-7', source: '6', target: '7' }
        ],
        config: { format: 'flowchart', complexity: 'medium', style: 'modern' },
        preview: '/templates/ecommerce-flow.png',
        createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        author: 'Template Engine',
        isPublic: true,
        rating: 4.6,
        examples: [
          'Fluxo de compra online',
          'Processo de checkout',
          'Jornada do cliente e-commerce'
        ]
      },

      // Template de Software
      {
        id: 'microservices-architecture',
        name: 'Arquitetura de Microserviços',
        description: 'Estrutura básica de microserviços',
        category: 'software',
        tags: ['microservices', 'architecture', 'api', 'database'],
        keywords: ['microserviço', 'api', 'serviço', 'arquitetura', 'sistema', 'backend'],
        difficulty: 'advanced',
        popularity: 72,
        usageCount: 98,
        nodes: [
          { id: '1', type: 'custom', position: { x: 150, y: 100 }, data: { label: 'API Gateway', type: 'rectangle' } },
          { id: '2', type: 'custom', position: { x: 50, y: 250 }, data: { label: 'User Service', type: 'rectangle' } },
          { id: '3', type: 'custom', position: { x: 150, y: 250 }, data: { label: 'Order Service', type: 'rectangle' } },
          { id: '4', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Payment Service', type: 'rectangle' } },
          { id: '5', type: 'custom', position: { x: 50, y: 400 }, data: { label: 'User DB', type: 'rectangle' } },
          { id: '6', type: 'custom', position: { x: 150, y: 400 }, data: { label: 'Order DB', type: 'rectangle' } },
          { id: '7', type: 'custom', position: { x: 250, y: 400 }, data: { label: 'Payment DB', type: 'rectangle' } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e1-3', source: '1', target: '3' },
          { id: 'e1-4', source: '1', target: '4' },
          { id: 'e2-5', source: '2', target: '5' },
          { id: 'e3-6', source: '3', target: '6' },
          { id: 'e4-7', source: '4', target: '7' }
        ],
        config: { format: 'network', complexity: 'complex', style: 'modern' },
        preview: '/templates/microservices.png',
        createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        author: 'Template Engine',
        isPublic: true,
        rating: 4.4,
        examples: [
          'Arquitetura de microserviços',
          'Sistema distribuído',
          'API Gateway pattern'
        ]
      },

      // Template Educacional
      {
        id: 'learning-process',
        name: 'Processo de Aprendizagem',
        description: 'Mapa mental para processo educacional',
        category: 'education',
        tags: ['learning', 'education', 'mindmap', 'knowledge'],
        keywords: ['aprender', 'educação', 'conhecimento', 'estudo', 'ensino'],
        difficulty: 'beginner',
        popularity: 65,
        usageCount: 156,
        nodes: [
          { id: '1', type: 'custom', position: { x: 250, y: 200 }, data: { label: 'Aprendizagem', type: 'circle' } },
          { id: '2', type: 'custom', position: { x: 100, y: 100 }, data: { label: 'Teoria', type: 'rectangle' } },
          { id: '3', type: 'custom', position: { x: 400, y: 100 }, data: { label: 'Prática', type: 'rectangle' } },
          { id: '4', type: 'custom', position: { x: 100, y: 300 }, data: { label: 'Avaliação', type: 'rectangle' } },
          { id: '5', type: 'custom', position: { x: 400, y: 300 }, data: { label: 'Aplicação', type: 'rectangle' } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e1-3', source: '1', target: '3' },
          { id: 'e1-4', source: '1', target: '4' },
          { id: 'e1-5', source: '1', target: '5' }
        ],
        config: { format: 'mindmap', complexity: 'simple', style: 'colorful' },
        preview: '/templates/learning-mindmap.png',
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
        author: 'Template Engine',
        isPublic: true,
        rating: 4.2,
        examples: [
          'Processo de aprendizagem',
          'Metodologia educacional',
          'Mapa de conhecimento'
        ]
      }
    ]
  }

  private loadUserPreferences() {
    try {
      const saved = localStorage.getItem('diagramas-ia-template-preferences')
      if (saved) {
        this.preferences = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Erro ao carregar preferências de template:', error)
    }
  }

  private saveUserPreferences() {
    try {
      localStorage.setItem('diagramas-ia-template-preferences', JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Erro ao salvar preferências de template:', error)
    }
  }

  // Analisar prompt para extrair intenção e contexto
  analyzePrompt(prompt: string): TemplateAnalysis {
    const lowercasePrompt = prompt.toLowerCase()
    const words = lowercasePrompt.split(/\s+/)
    
    // Extrair palavras-chave
    const extractedKeywords = words.filter(word => 
      word.length > 3 && !this.isStopWord(word)
    )

    // Detectar categoria baseada em palavras-chave
    const detectedCategory = this.detectCategory(lowercasePrompt)
    
    // Determinar complexidade baseada no comprimento e palavras-chave
    const complexity = this.determineComplexity(prompt, extractedKeywords)
    
    // Sugerir formato baseado em palavras-chave
    const suggestedFormat = this.suggestFormat(lowercasePrompt)
    
    // Calcular confiança
    const confidence = this.calculateConfidence(extractedKeywords, detectedCategory)

    return {
      prompt,
      extractedKeywords,
      detectedCategory,
      complexity,
      suggestedFormat,
      confidence
    }
  }

  // Recomendar templates baseado no prompt
  recommendTemplates(prompt: string, limit: number = 5): TemplateRecommendation[] {
    const analysis = this.analyzePrompt(prompt)
    const recommendations: TemplateRecommendation[] = []

    for (const template of this.templates) {
      const score = this.calculateTemplateScore(template, analysis)
      if (score > 0.1) { // Threshold mínimo
        recommendations.push({
          template,
          score,
          reasons: this.generateReasons(template, analysis, score),
          confidence: Math.min(score * analysis.confidence, 1.0)
        })
      }
    }

    // Ordenar por score e limitar resultados
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // Calcular score de relevância do template
  private calculateTemplateScore(template: SmartTemplate, analysis: TemplateAnalysis): number {
    let score = 0

    // Score por categoria
    if (template.category === analysis.detectedCategory) {
      score += 0.4
    }

    // Score por palavras-chave
    const keywordMatches = analysis.extractedKeywords.filter(keyword =>
      template.keywords.some(tk => tk.includes(keyword) || keyword.includes(tk))
    ).length

    if (keywordMatches > 0) {
      score += (keywordMatches / Math.max(analysis.extractedKeywords.length, 1)) * 0.3
    }

    // Score por tags
    const tagMatches = template.tags.filter(tag =>
      analysis.extractedKeywords.some(keyword => tag.includes(keyword) || keyword.includes(tag))
    ).length

    if (tagMatches > 0) {
      score += (tagMatches / template.tags.length) * 0.2
    }

    // Score por popularidade
    score += (template.popularity / 100) * 0.05

    // Score por usage histórico do usuário
    if (this.preferences.favoriteCategories?.includes(template.category)) {
      score += 0.05
    }

    // Penalizar se complexity não bater
    if (template.difficulty === 'beginner' && analysis.complexity === 'complex') {
      score *= 0.7
    } else if (template.difficulty === 'advanced' && analysis.complexity === 'simple') {
      score *= 0.8
    }

    return Math.min(score, 1.0)
  }

  // Gerar razões para a recomendação
  private generateReasons(template: SmartTemplate, analysis: TemplateAnalysis, score: number): string[] {
    const reasons: string[] = []

    if (template.category === analysis.detectedCategory) {
      reasons.push(`Categoria compatível: ${template.category}`)
    }

    const keywordMatches = analysis.extractedKeywords.filter(keyword =>
      template.keywords.some(tk => tk.includes(keyword) || keyword.includes(tk))
    )

    if (keywordMatches.length > 0) {
      reasons.push(`Palavras-chave relacionadas: ${keywordMatches.slice(0, 3).join(', ')}`)
    }

    if (template.popularity > 80) {
      reasons.push('Template muito popular')
    }

    if (template.rating > 4.5) {
      reasons.push('Avaliação excelente pelos usuários')
    }

    if (score > 0.7) {
      reasons.push('Alta compatibilidade com sua solicitação')
    }

    return reasons
  }

  // Detectar categoria do prompt
  private detectCategory(prompt: string): TemplateCategory {
    const categoryKeywords = {
      business: ['negócio', 'empresa', 'vendas', 'cliente', 'compra', 'pedido', 'processo'],
      software: ['api', 'sistema', 'código', 'aplicação', 'software', 'arquitetura', 'microserviço'],
      education: ['ensino', 'aprendizagem', 'educação', 'aula', 'curso', 'estudo'],
      flowchart: ['fluxo', 'processo', 'etapa', 'sequência', 'workflow'],
      organization: ['organização', 'estrutura', 'hierarquia', 'departamento', 'equipe'],
      process: ['processo', 'procedimento', 'metodologia', 'passo'],
      architecture: ['arquitetura', 'infraestrutura', 'componente', 'módulo'],
      mindmap: ['mapa', 'mental', 'brainstorm', 'ideias', 'conceitos'],
      network: ['rede', 'conexão', 'servidor', 'infraestrutura'],
      database: ['banco', 'dados', 'tabela', 'relacionamento', 'entidade']
    }

    let bestCategory: TemplateCategory = 'other'
    let maxMatches = 0

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(keyword => prompt.includes(keyword)).length
      if (matches > maxMatches) {
        maxMatches = matches
        bestCategory = category as TemplateCategory
      }
    }

    return bestCategory
  }

  // Determinar complexidade do diagrama
  private determineComplexity(prompt: string, keywords: string[]): 'simple' | 'medium' | 'complex' {
    const complexityIndicators = {
      simple: ['simples', 'básico', 'rápido', 'pequeno'],
      medium: ['médio', 'normal', 'padrão'],
      complex: ['complexo', 'avançado', 'detalhado', 'completo', 'enterprise']
    }

    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => prompt.toLowerCase().includes(indicator))) {
        return level as 'simple' | 'medium' | 'complex'
      }
    }

    // Determinar pela quantidade de palavras-chave e tamanho do prompt
    if (keywords.length <= 3 && prompt.length < 50) {
      return 'simple'
    } else if (keywords.length > 6 || prompt.length > 100) {
      return 'complex'
    } else {
      return 'medium'
    }
  }

  // Sugerir formato de diagrama
  private suggestFormat(prompt: string): string {
    const formatKeywords = {
      flowchart: ['fluxo', 'processo', 'etapa', 'sequência'],
      mindmap: ['mapa', 'mental', 'brainstorm', 'ideias'],
      sequence: ['sequência', 'tempo', 'ordem', 'cronologia'],
      class: ['classe', 'objeto', 'herança', 'método'],
      er: ['entidade', 'relacionamento', 'banco', 'tabela'],
      gantt: ['cronograma', 'projeto', 'prazo', 'atividade'],
      network: ['rede', 'conexão', 'topologia', 'servidor']
    }

    for (const [format, keywords] of Object.entries(formatKeywords)) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        return format
      }
    }

    return 'flowchart' // Padrão
  }

  // Calcular confiança da análise
  private calculateConfidence(keywords: string[], category: TemplateCategory): number {
    let confidence = 0.5 // Base

    // Aumentar confiança com mais palavras-chave
    confidence += Math.min(keywords.length * 0.1, 0.3)

    // Aumentar confiança se categoria foi detectada com precisão
    if (category !== 'other') {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }

  // Verificar se é stop word
  private isStopWord(word: string): boolean {
    const stopWords = ['de', 'da', 'do', 'para', 'com', 'em', 'um', 'uma', 'o', 'a', 'e', 'ou', 'que', 'se']
    return stopWords.includes(word)
  }

  // Aplicar template com variáveis
  applyTemplate(template: SmartTemplate, variables?: Record<string, any>): DiagramData {
    let nodes = [...template.nodes]
    let edges = [...template.edges]

    // Aplicar variáveis se existirem
    if (variables && template.variables) {
      nodes = this.applyVariablesToNodes(nodes, template.variables, variables)
      edges = this.applyVariablesToEdges(edges, template.variables, variables)
    }

    // Incrementar contador de uso
    this.incrementTemplateUsage(template.id)

    return { nodes, edges }
  }

  // Aplicar variáveis aos nós
  private applyVariablesToNodes(nodes: Node[], templateVars: TemplateVariable[], variables: Record<string, any>): Node[] {
    return nodes.map(node => {
      let label = node.data.label

      // Substituir variáveis no label
      for (const variable of templateVars) {
        const value = variables[variable.id] || variable.defaultValue
        const placeholder = `{{${variable.name}}}`
        label = label.replace(new RegExp(placeholder, 'g'), value)
      }

      return {
        ...node,
        data: {
          ...node.data,
          label
        }
      }
    })
  }

  // Aplicar variáveis às arestas
  private applyVariablesToEdges(edges: Edge[], templateVars: TemplateVariable[], variables: Record<string, any>): Edge[] {
    // Por enquanto, edges não têm variáveis, mas poderia ser implementado
    return edges
  }

  // Incrementar uso do template
  private incrementTemplateUsage(templateId: string) {
    const template = this.templates.find(t => t.id === templateId)
    if (template) {
      template.usageCount++
      template.updatedAt = Date.now()
    }

    // Atualizar histórico do usuário
    this.userHistory.unshift(templateId)
    this.userHistory = this.userHistory.slice(0, 50) // Manter apenas os últimos 50

    // Atualizar preferências
    this.updateUserPreferences(templateId)
  }

  // Atualizar preferências do usuário
  private updateUserPreferences(templateId: string) {
    const template = this.templates.find(t => t.id === templateId)
    if (!template) return

    if (!this.preferences.favoriteCategories) {
      this.preferences.favoriteCategories = []
    }

    // Adicionar categoria às favoritas se não existir
    if (!this.preferences.favoriteCategories.includes(template.category)) {
      this.preferences.favoriteCategories.push(template.category)
    }

    this.saveUserPreferences()
  }

  // Obter templates por categoria
  getTemplatesByCategory(category: TemplateCategory): SmartTemplate[] {
    return this.templates.filter(t => t.category === category)
  }

  // Obter templates populares
  getPopularTemplates(limit: number = 10): SmartTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
  }

  // Obter templates recentes
  getRecentTemplates(limit: number = 10): SmartTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
  }

  // Buscar templates
  searchTemplates(query: string): SmartTemplate[] {
    const lowercaseQuery = query.toLowerCase()
    
    return this.templates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.keywords.some(keyword => keyword.includes(lowercaseQuery)) ||
      template.tags.some(tag => tag.includes(lowercaseQuery))
    ).sort((a, b) => b.popularity - a.popularity)
  }

  // Obter estatísticas de uso
  getUsageStats() {
    const totalUsage = this.templates.reduce((sum, t) => sum + t.usageCount, 0)
    const mostUsed = [...this.templates].sort((a, b) => b.usageCount - a.usageCount)[0]
    const averageRating = this.templates.reduce((sum, t) => sum + t.rating, 0) / this.templates.length

    return {
      totalTemplates: this.templates.length,
      totalUsage,
      mostUsedTemplate: mostUsed,
      averageRating: Math.round(averageRating * 10) / 10,
      categoriesDistribution: this.getCategoriesDistribution()
    }
  }

  // Distribuição por categoria
  private getCategoriesDistribution() {
    const distribution: Record<string, number> = {}
    
    for (const template of this.templates) {
      distribution[template.category] = (distribution[template.category] || 0) + 1
    }

    return distribution
  }
}

// Instância singleton
export const templateEngine = new TemplateEngine()

// Hook para usar o template engine
export function useTemplateEngine() {
  return {
    analyzePrompt: templateEngine.analyzePrompt.bind(templateEngine),
    recommendTemplates: templateEngine.recommendTemplates.bind(templateEngine),
    applyTemplate: templateEngine.applyTemplate.bind(templateEngine),
    getTemplatesByCategory: templateEngine.getTemplatesByCategory.bind(templateEngine),
    getPopularTemplates: templateEngine.getPopularTemplates.bind(templateEngine),
    getRecentTemplates: templateEngine.getRecentTemplates.bind(templateEngine),
    searchTemplates: templateEngine.searchTemplates.bind(templateEngine),
    getUsageStats: templateEngine.getUsageStats.bind(templateEngine)
  }
}
