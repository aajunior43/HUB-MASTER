'use client'

import { useState, useEffect } from 'react'
import {
  Bot, Settings, Shield, Activity, ExternalLink,
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Globe, Server, Zap, Key, ChevronDown, ChevronUp,
  Search, Wifi, WifiOff, Cpu, HardDrive
} from 'lucide-react'

interface AIApp {
  id: string
  name: string
  description: string
  type: 'nextjs' | 'vite' | 'static' | 'python' | 'extension'
  provider: 'gemini' | 'genai' | 'claude'
  model: string
  envVar: string
  port?: number
  hasApiKey?: boolean
  status: 'online' | 'offline' | 'unknown'
  path: string
  packageManager: 'npm' | 'pip'
  icon: string
}

const AI_APPS: AIApp[] = [
  { id: 'diagramas-ia', name: 'Diagramas IA', description: 'Criação de diagramas com IA', type: 'nextjs', provider: 'gemini', model: 'gemini-1.5-flash', envVar: 'GEMINI_API_KEY', port: 3000, status: 'unknown', path: '/root/hub-master-scaffold/apps/diagramas-ia', packageManager: 'npm', icon: '📊' },
  { id: 'GERADOR-DE-STATUS', name: 'Gerador de Status', description: 'Criação de status para redes sociais', type: 'nextjs', provider: 'gemini', model: 'gemini-2.0-flash', envVar: 'NEXT_PUBLIC_GEMINI_API_KEY', port: 3001, status: 'unknown', path: '/root/hub-master-scaffold/apps/GERADOR-DE-STATUS', packageManager: 'npm', icon: '✨' },
  { id: 'AGENDAIA', name: 'Agenda IA', description: 'Agenda inteligente com IA', type: 'vite', provider: 'genai', model: 'gemini-3-flash-preview', envVar: 'GEMINI_API_KEY', port: 5173, status: 'unknown', path: '/root/hub-master-scaffold/apps/AGENDAIA', packageManager: 'npm', icon: '📅' },
  { id: 'AI-Image-Prompt-Generator', name: 'AI Image Prompt', description: 'Gerador de prompts para imagens', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash + imagen-4.0', envVar: 'GEMINI_API_KEY', port: 5174, status: 'unknown', path: '/root/hub-master-scaffold/apps/AI-Image-Prompt-Generator', packageManager: 'npm', icon: '🎨' },
  { id: 'Analisador-de-Nota-Fiscal-com-IA', name: 'Analisador de Nota Fiscal', description: 'Análise de notas fiscais com IA', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5175, status: 'unknown', path: '/root/hub-master-scaffold/apps/Analisador-de-Nota-Fiscal-com-IA', packageManager: 'npm', icon: '🧾' },
  { id: 'art-narrator', name: 'Art Narrator', description: 'Narração de arte com IA', type: 'vite', provider: 'gemini', model: 'gemini-pro', envVar: 'VITE_GEMINI_API_KEY', port: 5176, status: 'unknown', path: '/root/hub-master-scaffold/apps/art-narrator', packageManager: 'npm', icon: '🖼️' },
  { id: 'Corretor-Ortogr-fico-com-IA', name: 'Corretor Ortográfico', description: 'Correção ortográfica com IA', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5177, status: 'unknown', path: '/root/hub-master-scaffold/apps/Corretor-Ortogr-fico-com-IA', packageManager: 'npm', icon: '✏️' },
  { id: 'dicionario-ia', name: 'Dicionário IA', description: 'Dicionário inteligente', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5178, status: 'unknown', path: '/root/hub-master-scaffold/apps/dicionario-ia', packageManager: 'npm', icon: '📖' },
  { id: 'Expert-Study-Plan-Generator', name: 'Study Plan Generator', description: 'Gerador de planos de estudo', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5179, status: 'unknown', path: '/root/hub-master-scaffold/apps/Expert-Study-Plan-Generator', packageManager: 'npm', icon: '📚' },
  { id: 'fluxograma-com-ia', name: 'Fluxograma IA', description: 'Criação de fluxogramas com IA', type: 'vite', provider: 'genai', model: 'gemini-3-flash-preview', envVar: 'GEMINI_API_KEY', port: 5180, status: 'unknown', path: '/root/hub-master-scaffold/apps/fluxograma-com-ia', packageManager: 'npm', icon: '🔀' },
  { id: 'Gerador-de-Google-Dorks-com-IA', name: 'Gerador de Dorks', description: 'Geração de Google Dorks com IA', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5181, status: 'unknown', path: '/root/hub-master-scaffold/apps/Gerador-de-Google-Dorks-com-IA', packageManager: 'npm', icon: '🔍' },
  { id: 'Gerador-de-Memes-IA', name: 'Gerador de Memes', description: 'Criação de memes com IA', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5182, status: 'unknown', path: '/root/hub-master-scaffold/apps/Gerador-de-Memes-IA', packageManager: 'npm', icon: '😂' },
  { id: 'gerador-status', name: 'Gerador Status (API)', description: 'API para geração de status', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 3002, status: 'unknown', path: '/root/hub-master-scaffold/apps/gerador-status', packageManager: 'npm', icon: '⚙️' },
  { id: 'MELHORADOR-DE-PROMPT', name: 'Melhorador de Prompt', description: 'Otimização de prompts para IA', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5183, status: 'unknown', path: '/root/hub-master-scaffold/apps/MELHORADOR-DE-PROMPT', packageManager: 'npm', icon: '💡' },
  { id: 'Sherlock-', name: 'Sherlock', description: 'Investigação com IA', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5184, status: 'unknown', path: '/root/hub-master-scaffold/apps/Sherlock-', packageManager: 'npm', icon: '🔎' },
  { id: 'Social-Media-Design-Assistant', name: 'Social Media Designer', description: 'Design para redes sociais com IA', type: 'vite', provider: 'genai', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY', port: 5185, status: 'unknown', path: '/root/hub-master-scaffold/apps/Social-Media-Design-Assistant', packageManager: 'npm', icon: '🎯' },
  { id: 'color-gemini-canvas', name: 'Color Gemini Canvas', description: 'Canvas com IA generativa', type: 'vite', provider: 'gemini', model: 'gemini-1.5-flash (REST)', envVar: 'VITE_GEMINI_API_KEY', port: 5186, status: 'unknown', path: '/root/hub-master-scaffold/apps/color-gemini-canvas', packageManager: 'npm', icon: '🎨' },
  { id: 'countdown-sub-sync', name: 'Countdown Sub Sync', description: 'Sincronização de legendas', type: 'vite', provider: 'gemini', model: 'gemini-pro (REST)', envVar: 'VITE_GEMINI_API_KEY', port: 5187, status: 'unknown', path: '/root/hub-master-scaffold/apps/countdown-sub-sync', packageManager: 'npm', icon: '⏱️' },
  { id: 'extensao-extrator-designer', name: 'Extrator Designer', description: 'Extrator de design com IA (Chrome Extension)', type: 'extension', provider: 'gemini', model: 'gemini-1.5-flash (REST)', envVar: 'GEMINI_API_KEY', status: 'unknown', path: '/root/hub-master-scaffold/apps/extensao-extrator-designer', packageManager: 'npm', icon: '🧩' },
  { id: 'gemini-pdf-rename-magic', name: 'PDF Rename Magic', description: 'Renomeação inteligente de PDFs', type: 'vite', provider: 'gemini', model: 'gemini-2.5-flash (REST)', envVar: 'VITE_GEMINI_API_KEY', port: 5188, status: 'unknown', path: '/root/hub-master-scaffold/apps/gemini-pdf-rename-magic', packageManager: 'npm', icon: '📄' },
  { id: 'prompt-spark-keeper', name: 'Prompt Spark Keeper', description: 'Gerenciador de prompts', type: 'vite', provider: 'gemini', model: 'gemini-1.5-flash (REST)', envVar: 'VITE_GEMINI_API_KEY', port: 5189, status: 'unknown', path: '/root/hub-master-scaffold/apps/prompt-spark-keeper', packageManager: 'npm', icon: '⚡' },
  { id: 'reinado', name: 'Reinado', description: 'Jogo com IA generativa', type: 'static', provider: 'gemini', model: 'gemini-pro (REST)', envVar: 'GEMINI_API_KEY', status: 'unknown', path: '/root/hub-master-scaffold/apps/reinado', packageManager: 'npm', icon: '👑' },
  { id: 'quick-notes-ai', name: 'Quick Notes AI', description: 'Notas rápidas com IA', type: 'static', provider: 'gemini', model: 'gemini-2.5-flash (REST)', envVar: 'GEMINI_API_KEY', status: 'unknown', path: '/root/hub-master-scaffold/apps/quick-notes-ai', packageManager: 'npm', icon: '📝' },
  { id: 'extensao-navegador-bloco-de-nota-ia', name: 'Bloco de Nota IA', description: 'Bloco de notas com IA (Chrome Extension)', type: 'extension', provider: 'gemini', model: 'gemini-2.5-flash (REST)', envVar: 'GEMINI_API_KEY', status: 'unknown', path: '/root/hub-master-scaffold/apps/extensao-navegador-bloco-de-nota-ia', packageManager: 'npm', icon: '📓' },
  { id: 'organizador', name: 'Organizador', description: 'Organizador de extratos (Python)', type: 'python', provider: 'gemini', model: 'gemini-1.5-flash', envVar: 'GEMINI_API_KEY', status: 'unknown', path: '/root/hub-master-scaffold/apps/organizador', packageManager: 'pip', icon: '📁' },
  { id: 'pixel-agents', name: 'Pixel Agents', description: 'Agentes com Claude AI', type: 'vite', provider: 'claude', model: 'Claude Sonnet', envVar: 'ANTHROPIC_API_KEY', port: 5190, status: 'unknown', path: '/root/hub-master-scaffold/apps/pixel-agents', packageManager: 'npm', icon: '🤖' },
]

type FilterType = 'all' | 'online' | 'offline' | 'nextjs' | 'vite' | 'static' | 'python' | 'extension' | 'gemini' | 'genai' | 'claude'

export default function AdminPage() {
  const [apps, setApps] = useState<AIApp[]>(AI_APPS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState('')

  useEffect(() => {
    setSavedKey(localStorage.getItem('hub_gemini_api_key') || '')
  }, [])

  const saveApiKey = () => {
    localStorage.setItem('hub_gemini_api_key', apiKey)
    setSavedKey(apiKey)
    setApiKey('')
  }

  const checkStatus = async (app: AIApp) => {
    if (!app.port) {
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: a.status === 'online' ? 'offline' : 'unknown' } : a))
      return
    }
    try {
      const res = await fetch(`http://localhost:${app.port}`, { mode: 'no-cors', signal: AbortSignal.timeout(3000) })
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'online' } : a))
    } catch {
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'offline' } : a))
    }
  }

  const checkAllStatus = async () => {
    for (const app of apps) {
      if (app.port) {
        await checkStatus(app)
      }
    }
  }

  const filtered = apps.filter(app => {
    const matchSearch = !search || app.name.toLowerCase().includes(search.toLowerCase()) || app.description.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || app.type === filter || app.provider === filter || (filter === 'online' && app.status === 'online') || (filter === 'offline' && app.status === 'offline')
    return matchSearch && matchFilter
  })

  const typeColor = (type: string) => {
    const colors: Record<string, string> = {
      nextjs: '#000',
      vite: '#646cff',
      static: '#e67e22',
      python: '#3776ab',
      extension: '#2ecc71',
    }
    return colors[type] || '#999'
  }

  const providerIcon = (provider: string) => {
    switch (provider) {
      case 'gemini': case 'genai': return '🔶'
      case 'claude': return '🟣'
      default: return '🔵'
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'online': return <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={14} /> Online</span>
      case 'offline': return <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><WifiOff size={14} /> Offline</span>
      default: return <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><Wifi size={14} /> Desconhecido</span>
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', color: '#fff', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 8, display: 'flex' }}>
                <Bot size={28} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Hub Admin</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.7 }}>Central de gerenciamento de apps IA</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={checkAllStatus} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
                <RefreshCw size={14} /> Verificar Todos
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px' }}>
        {/* API Key Section */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Key size={18} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Chave de API Centralizada</h2>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
            Configure a chave Gemini uma vez para todos os apps que usam <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>GEMINI_API_KEY</code>.
            Apps com <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>VITE_*</code> ou <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>NEXT_PUBLIC_*</code> precisam de .env local.
          </p>
          {savedKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 12, fontSize: 13, color: '#166534' }}>
              <CheckCircle size={14} />
              Chave configurada: <code style={{ background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>{savedKey.slice(0, 8)}...{savedKey.slice(-4)}</code>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Cole sua chave Gemini API aqui..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
            />
            <button onClick={saveApiKey} disabled={!apiKey.trim()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: apiKey.trim() ? '#1e3a5f' : '#94a3b8', color: '#fff', cursor: apiKey.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 14 }}>
              Salvar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar apps..."
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {(['all', 'online', 'offline', 'nextjs', 'vite', 'static', 'python', 'extension', 'gemini', 'genai', 'claude'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: filter === f ? '#1e3a5f' : '#fff',
                color: filter === f ? '#fff' : '#475569',
                cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}
            >
              {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 'auto' }}>
            {filtered.length} de {apps.length} apps
          </span>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total de Apps', value: apps.length, icon: <Server size={18} />, color: '#1e3a5f' },
            { label: 'Gemini SDK', value: apps.filter(a => a.provider === 'gemini').length, icon: <Cpu size={18} />, color: '#f59e0b' },
            { label: 'GenAI SDK', value: apps.filter(a => a.provider === 'genai').length, icon: <Zap size={18} />, color: '#8b5cf6' },
            { label: 'Claude', value: apps.filter(a => a.provider === 'claude').length, icon: <Bot size={18} />, color: '#ec4899' },
          ].map(card => (
            <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: card.color + '15', color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Apps List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(app => (
            <div key={app.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer', transition: 'background 0.15s' }}
              >
                <div style={{ fontSize: 24 }}>{app.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {app.name}
                    <span style={{ fontSize: 11, color: '#fff', background: typeColor(app.type), padding: '2px 8px', borderRadius: 4 }}>{app.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{app.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span title={app.provider}>{providerIcon(app.provider)}</span>
                  {statusIcon(app.status)}
                  {expandedId === app.id ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                </div>
              </div>

              {expandedId === app.id && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>MODELO</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{app.model}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>ENV VAR</div>
                      <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{app.envVar}</code>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>PROVEDOR</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{app.provider === 'genai' ? 'Google GenAI SDK' : app.provider === 'gemini' ? 'Google Gemini (REST/SDK)' : 'Anthropic Claude'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>PACOTE</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{app.packageManager === 'npm' ? 'npm / Node.js' : 'pip / Python'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>CAMINHO</div>
                      <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{app.path}</code>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      {app.port && (
                        <button onClick={() => checkStatus(app)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                          <Activity size={12} /> Testar Conexão
                        </button>
                      )}
                      <a href={`http://localhost:${app.port || ''}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e3a5f', textDecoration: 'none', fontSize: 12 }}>
                        <ExternalLink size={12} /> Abrir App
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
            <p>Nenhum app encontrado com os filtros atuais.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #e2e8f0', marginTop: 32 }}>
        Hub Admin — Gerenciamento centralizado de aplicações com IA
      </footer>
    </div>
  )
}
