
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, Sparkles, Send, Download, Code, Eye, 
  Share2, LayoutGrid, AlertCircle, ChevronLeft, FileText, 
  Copy, RotateCcw, Check
} from 'lucide-react';
import { generateDiagram } from './services/geminiService';
import MermaidRenderer from './components/MermaidRenderer';
import HistorySidebar from './components/HistorySidebar';
import { DiagramData, ViewMode } from './types';
import { jsPDF } from "jspdf";

function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DiagramData[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<DiagramData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSvg, setCurrentSvg] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Responsive sidebar initial state
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('flowgen_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('flowgen_history', JSON.stringify(history));
  }, [history]);

  const executeGeneration = async (targetPrompt: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateDiagram(targetPrompt);
      const newDiagram: DiagramData = {
        id: crypto.randomUUID(),
        title: result.title,
        mermaidCode: result.mermaidCode,
        explanation: result.explanation,
        createdAt: Date.now()
      };
      setHistory(prev => [newDiagram, ...prev]);
      setCurrentDiagram(newDiagram);
      // Close sidebar on small screens after generating
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (err) {
      setError("Falha na comunicação com a IA. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim() || loading) return;
    executeGeneration(prompt);
    setPrompt('');
  };

  const handleRegenerate = () => {
    if (!currentDiagram || loading) return;
    executeGeneration(`Melhore este diagrama ou corrija-o se necessário: ${currentDiagram.explanation}`);
  };

  const handleExportPDF = useCallback(() => {
    if (!currentSvg || !currentDiagram) return;
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(currentSvg, "image/svg+xml");
    const svgEl = svgDoc.documentElement;
    
    const viewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 1000, 1000];
    const [,, w, h] = viewBox;
    
    const targetW = 3500;
    const targetH = (h / w) * targetW;
    svgEl.setAttribute('width', `${targetW}px`);
    svgEl.setAttribute('height', `${targetH}px`);

    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const pdf = new jsPDF({
        orientation: targetW > targetH ? 'l' : 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / targetW, ph / targetH);
      const finalW = targetW * ratio;
      const finalH = targetH * ratio;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pw - finalW) / 2, (ph - finalH) / 2, finalW, finalH);
      pdf.save(`${currentDiagram.title.replace(/\s+/g, '_')}.pdf`);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [currentSvg, currentDiagram]);

  const handleCopySVG = () => {
    if (!currentSvg) return;
    navigator.clipboard.writeText(currentSvg);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleNewDiagram = () => {
    setCurrentDiagram(null);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-neu-base text-slate-600 font-sans overflow-hidden">
      <HistorySidebar 
        isOpen={isSidebarOpen}
        history={history}
        selectedId={currentDiagram?.id || null}
        onSelect={(diag) => {
          setCurrentDiagram(diag);
          if (window.innerWidth < 1024) setIsSidebarOpen(false);
        }}
        onDelete={(id, e) => {
          e.stopPropagation();
          setHistory(h => h.filter(d => d.id !== id));
          if (currentDiagram?.id === id) setCurrentDiagram(null);
        }}
        onNew={handleNewDiagram}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col relative transition-all duration-300 w-full overflow-hidden">
        {/* Responsive Header */}
        <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 sm:p-3 rounded-full shadow-neu-flat active:shadow-neu-pressed text-primary-600 hover:scale-105 transition-all"
              aria-label="Toggle Menu"
            >
              {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 group cursor-default">
              <div className="p-1.5 sm:p-2 rounded-lg shadow-neu-flat text-primary-600">
                <Sparkles size={16} className="fill-current sm:w-5 sm:h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-700">FlowGen <span className="text-primary-500 hidden xs:inline">AI</span></h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3">
            {currentDiagram && !loading && (
              <>
                <div className="hidden sm:flex p-1 rounded-xl shadow-neu-pressed gap-1 bg-neu-base/50">
                  <button onClick={() => setViewMode(ViewMode.PREVIEW)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === ViewMode.PREVIEW ? 'shadow-neu-flat text-primary-600 bg-neu-base' : 'text-slate-400'}`}>Preview</button>
                  <button onClick={() => setViewMode(ViewMode.CODE)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === ViewMode.CODE ? 'shadow-neu-flat text-primary-600 bg-neu-base' : 'text-slate-400'}`}>Code</button>
                </div>

                <div className="hidden xs:flex items-center gap-1.5">
                  <button onClick={handleRegenerate} className="p-2 sm:p-3 rounded-full shadow-neu-flat hover:text-primary-600 active:shadow-neu-pressed transition-all" title="Regerar">
                    <RotateCcw size={16} className="sm:w-[18px]" />
                  </button>
                  <button onClick={handleCopySVG} className="p-2 sm:p-3 rounded-full shadow-neu-flat hover:text-primary-600 active:shadow-neu-pressed transition-all" title="Copiar SVG">
                    {copyFeedback ? <Check size={16} className="text-green-500 sm:w-[18px]" /> : <Copy size={16} className="sm:w-[18px]" />}
                  </button>
                </div>

                <button onClick={handleExportPDF} className="p-2 sm:p-3 sm:px-4 rounded-full sm:rounded-xl shadow-neu-flat text-red-500 font-bold text-xs hover:scale-105 transition-all flex items-center gap-2">
                  <FileText size={16} className="sm:w-[18px]" />
                  <span className="hidden sm:inline">PDF HD</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content Area - Maximized on Mobile */}
        <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 pt-0 overflow-hidden">
          <div className="flex-1 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-neu-pressed bg-neu-base overflow-hidden flex flex-col relative">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 px-6">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-100 border-t-primary-500 animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-500 animate-pulse" size={20} />
                </div>
                <div className="text-center">
                  <h3 className="text-base sm:text-lg font-bold text-slate-700">Construindo diagrama...</h3>
                  <p className="text-xs sm:text-sm text-slate-400 animate-pulse">Isso leva apenas alguns segundos.</p>
                </div>
              </div>
            ) : currentDiagram ? (
              <div className="flex flex-col h-full">
                <div className="p-4 sm:p-6 pb-0 flex flex-col gap-1 sm:gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight truncate">{currentDiagram.title}</h2>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium line-clamp-2 sm:line-clamp-1">{currentDiagram.explanation}</p>
                </div>
                <div className="flex-1">
                  {viewMode === ViewMode.PREVIEW ? (
                    <MermaidRenderer code={currentDiagram.mermaidCode} onSvgReady={setCurrentSvg} />
                  ) : (
                    <div className="h-full p-4 sm:p-8 font-mono text-[10px] sm:text-sm overflow-auto text-slate-500">
                      <pre className="p-4 sm:p-6 rounded-2xl bg-neu-base shadow-neu-pressed leading-relaxed whitespace-pre-wrap">
                        {currentDiagram.mermaidCode}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 max-w-xl mx-auto text-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[1.5rem] sm:rounded-[2rem] shadow-neu-flat flex items-center justify-center text-primary-400 mb-6 sm:mb-8 animate-bounce-slow">
                  <LayoutGrid size={40} className="sm:w-14 sm:h-14" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3 tracking-tight">Visualize suas <span className="text-primary-500 underline decoration-primary-200 underline-offset-4 sm:underline-offset-8">Ideias</span></h2>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-medium mb-8 sm:mb-10 px-4">Qualquer processo, arquitetura ou banco de dados vira arte em segundos.</p>
                
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 w-full px-2">
                  {["Fluxo de Checkout", "Arquitetura API", "Modelagem SQL", "Mapa Mental"].map(t => (
                    <button key={t} onClick={() => setPrompt(t)} className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-neu-flat text-[10px] sm:text-xs font-bold text-slate-600 hover:shadow-neu-pressed hover:text-primary-600 transition-all active:scale-95">{t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Floating Action Bar */}
          <div className="mt-4 sm:mt-6 max-w-4xl mx-auto w-full flex flex-col gap-2">
            <div className="shadow-neu-flat rounded-[1.25rem] sm:rounded-[1.5rem] p-1.5 flex bg-neu-base items-center focus-within:shadow-neu-pressed transition-all relative">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleGenerate())}
                placeholder="Descreva seu diagrama..."
                className="flex-1 bg-transparent border-none py-3 sm:py-4 px-4 sm:px-6 focus:ring-0 text-slate-700 font-medium placeholder:text-slate-400 text-sm sm:text-base resize-none h-12 sm:h-14 overflow-hidden"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-neu-flat active:shadow-neu-pressed shrink-0 ${
                  !prompt.trim() || loading ? 'text-slate-300' : 'text-primary-600 hover:scale-105 active:scale-90'
                }`}
                aria-label="Send"
              >
                {loading ? (
                   <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                ) : (
                   <Send size={18} className={prompt.trim() ? 'fill-primary-100 sm:w-5 sm:h-5' : 'sm:w-5 sm:h-5'} />
                )}
              </button>
            </div>
            {error && <p className="text-[10px] sm:text-xs font-bold text-red-400 flex items-center justify-center gap-1.5 animate-pulse"><AlertCircle size={12} />{error}</p>}
          </div>
        </div>
      </main>
      
      <style>{`
        .animate-bounce-slow { animation: bounce 4s infinite ease-in-out; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        
        @media (max-width: 640px) {
          ::-webkit-scrollbar { width: 3px; height: 3px; }
        }

        /* Prevent overscroll bounce on iOS */
        html, body {
          position: fixed;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
        #root {
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;
