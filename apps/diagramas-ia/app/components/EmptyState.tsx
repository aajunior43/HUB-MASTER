'use client'

import { 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Brain, 
  Lightbulb, 
  Rocket, 
  Users, 
  Target, 
  Layers,
  GitBranch,
  Database,
  Workflow,
  TrendingUp,
  Award,
  Play
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmptyStateProps {
  onOpenPrompt: () => void
}

const features = [
  { 
    icon: Brain, 
    text: "IA Avançada", 
    desc: "Powered by Google Gemini",
    color: "from-blue-500 to-cyan-500"
  },
  { 
    icon: Lightbulb, 
    text: "Criação Inteligente", 
    desc: "Diagramas automáticos",
    color: "from-yellow-500 to-orange-500"
  },
  { 
    icon: Rocket, 
    text: "Super Rápido", 
    desc: "Resultados em segundos",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Layers,
    text: "Multi-formato",
    desc: "Fluxograma, ER, Classes e mais",
    color: "from-green-500 to-emerald-500"
  }
]

const examples = [
  {
    text: "Sistema de autenticação com OAuth",
    category: "Segurança",
    icon: Users,
    complexity: "Médio"
  },
  {
    text: "Pipeline de CI/CD para microserviços",
    category: "DevOps",
    icon: GitBranch,
    complexity: "Complexo"
  },
  {
    text: "Arquitetura de e-commerce moderna",
    category: "Negócios",
    icon: TrendingUp,
    complexity: "Complexo"
  },
  {
    text: "Fluxo de aprovação de documentos",
    category: "Processos",
    icon: Workflow,
    complexity: "Simples"
  },
  {
    text: "Modelo de dados para CRM",
    category: "Banco de Dados",
    icon: Database,
    complexity: "Médio"
  },
  {
    text: "Sistema de gamificação",
    category: "Engajamento",
    icon: Award,
    complexity: "Médio"
  }
]

const quickTemplates = [
  { 
    name: "Processo de Negócio", 
    desc: "Fluxos empresariais simples",
    icon: Target,
    prompt: "Criar um fluxograma para processo de aprovação de férias de funcionários"
  },
  { 
    name: "Arquitetura de Sistema", 
    desc: "Sistemas e componentes",
    icon: Layers,
    prompt: "Arquitetura de um sistema de chat em tempo real com WebSockets"
  },
  { 
    name: "Workflow DevOps", 
    desc: "Pipelines e deploys",
    icon: GitBranch,
    prompt: "Pipeline de CI/CD para aplicação React com testes automatizados"
  }
]

const stats = [
  { number: "50K+", label: "Diagramas Criados" },
  { number: "99.9%", label: "Precisão da IA" },
  { number: "<5s", label: "Tempo Médio" },
  { number: "15+", label: "Tipos de Diagrama" }
]

export default function EmptyState({ onOpenPrompt }: EmptyStateProps) {
  const [currentExample, setCurrentExample] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % examples.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleTemplateClick = (template: any) => {
    // Aqui você pode implementar a lógica para usar o template
    onOpenPrompt()
  }

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Orbs */}
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{ 
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        {/* Floating Elements */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="text-center max-w-6xl px-6 relative z-10 w-full">
        {/* Header Section */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo Icon */}
          <motion.div 
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity }
            }}
          >
            <Sparkles size={32} className="text-white" />
          </motion.div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Diagramas IA
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 font-light">
            Transforme ideias em diagramas visuais com
            <span className="font-semibold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text"> Inteligência Artificial</span>
          </p>

          {/* Dynamic Example */}
          <div className="h-8 mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentExample}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400"
              >
                {examples[currentExample].icon && (
                  <examples[currentExample].icon size={16} />
                )}
                <span className="text-sm">"{examples[currentExample].text}"</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {examples[currentExample].complexity}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main CTA */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.button
            onClick={onOpenPrompt}
            className="group inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 text-white rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Button Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <Zap size={24} className="group-hover:animate-pulse" />
            <span>Criar Diagrama com IA</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Descreva sua ideia e deixe a IA criar o diagrama perfeito para você
          </p>
        </motion.div>

        {/* Quick Templates */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            🚀 Templates Rápidos
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {quickTemplates.map((template, index) => (
              <motion.button
                key={index}
                onClick={() => handleTemplateClick(template)}
                className="group p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 text-left shadow-soft hover:shadow-medium"
                whileHover={{ y: -2 }}
                onHoverStart={() => setSelectedTemplate(index)}
                onHoverEnd={() => setSelectedTemplate(null)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${features[index % features.length].color}`}>
                    <template.icon size={18} className="text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {template.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {template.desc}
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  <Play size={14} className="mr-1" />
                  Usar Template
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            ✨ Por que escolher Diagramas IA?
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}>
                  <feature.icon size={24} className="text-white" />
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.text}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2 + index * 0.1 }}
            >
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                {stat.number}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}