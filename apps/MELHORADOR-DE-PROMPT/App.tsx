
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Zap, Target, ArrowRight, RotateCcw, PenTool, Wand2, AlertCircle, Layers, Settings2, Code, Dna, Gauge, Flame, Microscope } from 'lucide-react';
import { improvePrompt } from './services/geminiService';
import { PromptVersion, OptimizationConfig, PromptFramework } from './types';
import { Button } from './components/Button';
import { HistoryItem } from './components/HistoryItem';

const MAX_SAFETY_LOOPS = 8; 

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  
  // Default configurations
  const [config, setConfig] = useState<OptimizationConfig>({
    mode: 'improve',
    
    // Improve Defaults
    strategy: 'iterations',
    targetIterations: 3,
    targetScore: 90,
    
    // Create Defaults
    creativityLevel: 50,
    
    // Evolution Defaults
    mutationIntensity: 'medium',
    evolutionGenerations: 4,
    
    selectedTechnique: 'auto'
  });
  
  const [history, setHistory] = useState<PromptVersion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const runEvolution = async (startText: string, appendHistory: boolean = false) => {
    setIsProcessing(true);
    setError(null);
    
    if (!appendHistory) {
        setHistory([]);
    }

    let loopCount = 0;
    let shouldContinue = true;
    let currentText = startText;
    
    // Determine loop limit based on mode
    let maxLoops = 1;
    if (config.mode === 'improve' && config.strategy === 'iterations') maxLoops = config.targetIterations;
    if (config.mode === 'improve' && config.strategy === 'score') maxLoops = MAX_SAFETY_LOOPS; // Limit for score mode
    if (config.mode === 'evolution') maxLoops = config.evolutionGenerations;
    if (config.mode === 'create') maxLoops = 1; // Create is usually 1-shot unless we want to iterate immediately

    // Determine initial history state
    if (!appendHistory && (config.mode === 'improve' || config.mode === 'evolution')) {
        const initialVersion: PromptVersion = {
          step: 0,
          content: startText,
          score: 0,
          critique: "População Inicial (Original)",
          changes: "",
          usedTechnique: "N/A"
        };
        setHistory([initialVersion]);
    }

    try {
      while (shouldContinue) {
        loopCount++;
        
        // Safety break
        if (loopCount > MAX_SAFETY_LOOPS) {
          shouldContinue = false;
          break;
        }

        const result = await improvePrompt(currentText, loopCount, config);

        const newVersion: PromptVersion = {
          step: (appendHistory ? history.length : 0) + loopCount + (config.mode === 'create' && !appendHistory ? -1 : 0),
          content: result.improvedPrompt,
          score: result.score,
          critique: result.critique,
          changes: result.changes,
          usedTechnique: result.usedTechnique,
          techniqueExplanation: result.techniqueExplanation,
          techniqueApplication: result.techniqueApplication
        };

        setHistory(prev => [...prev, newVersion]);
        currentText = result.improvedPrompt;
        
        // Continuation Logic
        if (config.mode === 'create') {
            shouldContinue = false; // Stop after creation
        }
        else if (config.mode === 'evolution') {
            if (loopCount >= config.evolutionGenerations) shouldContinue = false;
        }
        else if (config.mode === 'improve') {
             if (config.strategy === 'iterations') {
                if (loopCount >= config.targetIterations) shouldContinue = false;
             } else {
                if (result.score >= config.targetScore) shouldContinue = false;
             }
        }
        
        if (shouldContinue) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    } catch (err) {
      setError("Ocorreu um erro ao conectar com a IA. Verifique sua chave de API ou tente novamente.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStart = () => {
    if (!inputText.trim()) return;
    runEvolution(inputText, false);
  };

  const handleContinueFromVersion = (content: string) => {
    // Logic to switch modes if needed when continuing
    if (config.mode === 'create') {
        setConfig(prev => ({ ...prev, mode: 'improve' }));
    }
    setHistory([]);
    setInputText(content);
    runEvolution(content, false);
  };

  const handleReset = () => {
    setHistory([]);
    setError(null);
    setIsProcessing(false);
  };

  const getPlaceholder = () => {
    if (config.mode === 'create') return "Descreva sua ideia, objetivo e quem vai usar...";
    if (config.mode === 'evolution') return "Cole seu prompt aqui para iniciar a mutação genética...";
    return "Cole o prompt que você quer corrigir e melhorar...";
  };

  const getProcessLabel = () => {
    if (config.mode === 'create') return "CRIANDO...";
    if (config.mode === 'evolution') return "EVOLUINDO DNA...";
    return "OTIMIZANDO...";
  };

  // --- RENDER HELPERS ---

  const renderCreateSettings = () => (
    <div className="space-y-6 animate-fade-in-up">
       <div className="neo-pressed rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
             <span className="text-xs font-bold text-cyan-400 uppercase flex items-center">
                <Flame className="w-3 h-3 mr-2" /> Criatividade
             </span>
             <span className="text-xs font-bold text-slate-400">
                {config.creativityLevel < 30 ? 'Técnico' : config.creativityLevel > 70 ? 'Imaginativo' : 'Balanceado'}
             </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={config.creativityLevel}
            onChange={(e) => setConfig({ ...config, creativityLevel: parseInt(e.target.value) })}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-cyan-400"
          />
          <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase">
             <span>Rígido</span>
             <span>Livre</span>
          </div>
       </div>

       <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider flex items-center">
            <Layers className="w-3 h-3 mr-1" /> Framework Inicial
          </label>
          <div className="relative">
             <select 
               value={config.selectedTechnique}
               onChange={(e) => setConfig({ ...config, selectedTechnique: e.target.value as PromptFramework })}
               className="w-full appearance-none neo-pressed rounded-xl p-4 bg-transparent text-sm font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
             >
               <option value="auto">🤖 Auto (Recomendado)</option>
               <option value="costar">★ CO-STAR (Padrão Ouro)</option>
               <option value="persona">🎭 Persona (Baseado em Papel)</option>
               <option value="tag">🏷️ TAG (Simples e Direto)</option>
             </select>
             <Settings2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
       </div>
    </div>
  );

  const renderImproveSettings = () => (
    <div className="space-y-6 animate-fade-in-up">
       {/* Strategy Toggle */}
       <div>
         <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">
           Critério de Parada
         </label>
         <div className="grid grid-cols-2 gap-4 mb-4">
           <div 
             onClick={() => setConfig({ ...config, strategy: 'iterations' })}
             className={`cursor-pointer neo-flat-sm rounded-2xl p-3 flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${config.strategy === 'iterations' ? 'text-indigo-400 ring-1 ring-indigo-500/30 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <Zap className="w-4 h-4" />
             <span className="text-[10px] font-bold">Iterações</span>
           </div>
           <div 
             onClick={() => setConfig({ ...config, strategy: 'score' })}
             className={`cursor-pointer neo-flat-sm rounded-2xl p-3 flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${config.strategy === 'score' ? 'text-indigo-400 ring-1 ring-indigo-500/30 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <Target className="w-4 h-4" />
             <span className="text-[10px] font-bold">Nota Alvo</span>
           </div>
         </div>

         {/* Contextual Slider */}
         {config.strategy === 'iterations' ? (
           <div className="neo-pressed rounded-xl p-4">
             <div className="flex justify-between mb-3">
               <span className="text-xs font-bold text-slate-400">Passos de Refinamento</span>
               <span className="text-xs font-bold text-indigo-400">{config.targetIterations}x</span>
             </div>
             <input
               type="range"
               min="1"
               max="5"
               step="1"
               value={config.targetIterations}
               onChange={(e) => setConfig({ ...config, targetIterations: parseInt(e.target.value) })}
               className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-indigo-400"
             />
           </div>
         ) : (
           <div className="neo-pressed rounded-xl p-4">
             <div className="flex justify-between mb-3">
               <span className="text-xs font-bold text-slate-400">Nota Mínima</span>
               <span className="text-xs font-bold text-indigo-400">{config.targetScore}%</span>
             </div>
             <input
               type="range"
               min="80"
               max="100"
               step="5"
               value={config.targetScore}
               onChange={(e) => setConfig({ ...config, targetScore: parseInt(e.target.value) })}
               className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-indigo-400"
             />
           </div>
         )}
       </div>

       {/* Frameworks */}
       <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider flex items-center">
            <Layers className="w-3 h-3 mr-1" /> Técnica de Engenharia
          </label>
          <div className="relative">
             <select 
               value={config.selectedTechnique}
               onChange={(e) => setConfig({ ...config, selectedTechnique: e.target.value as PromptFramework })}
               className="w-full appearance-none neo-pressed rounded-xl p-4 bg-transparent text-sm font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
             >
               <option value="auto">🤖 Auto (IA Decide)</option>
               <optgroup label="Estrutural">
                 <option value="costar">CO-STAR (Completo)</option>
                 <option value="race">RACE (Ação/Contexto)</option>
                 <option value="rise">RISE (Reflexivo)</option>
               </optgroup>
               <optgroup label="Lógico">
                 <option value="cot">Chain of Thought</option>
                 <option value="decomposition">Decomposição</option>
                 <option value="few-shot">Few-Shot (Exemplos)</option>
               </optgroup>
             </select>
             <Settings2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
       </div>
    </div>
  );

  const renderEvolutionSettings = () => (
    <div className="space-y-6 animate-fade-in-up">
       {/* Generations Slider */}
       <div className="neo-pressed rounded-xl p-4">
          <div className="flex justify-between mb-3">
             <span className="text-xs font-bold text-slate-400 flex items-center">
                <Dna className="w-3 h-3 mr-2" /> Gerações
             </span>
             <span className="text-xs font-bold text-green-400">{config.evolutionGenerations} Ciclos</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={config.evolutionGenerations}
            onChange={(e) => setConfig({ ...config, evolutionGenerations: parseInt(e.target.value) })}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-green-400"
          />
       </div>

       {/* Mutation Intensity */}
       <div>
         <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider flex items-center">
           <Microscope className="w-3 h-3 mr-1" /> Intensidade da Mutação
         </label>
         <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
               <div 
                  key={level}
                  onClick={() => setConfig({ ...config, mutationIntensity: level })}
                  className={`cursor-pointer neo-flat-sm rounded-xl p-3 flex flex-col items-center justify-center transition-all duration-300 ${config.mutationIntensity === level ? 'bg-green-500/10 ring-1 ring-green-500/50 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
               >
                  <Gauge className="w-4 h-4 mb-1" />
                  <span className="text-[9px] font-bold uppercase">{level === 'low' ? 'Leve' : level === 'medium' ? 'Média' : 'Extrema'}</span>
               </div>
            ))}
         </div>
         <p className="text-[10px] text-slate-500 mt-2 text-center italic">
            {config.mutationIntensity === 'low' ? 'Ajustes finos e correções.' : config.mutationIntensity === 'medium' ? 'Mudanças estruturais notáveis.' : 'Reescrita radical e riscos.'}
         </p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-neo selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="bg-neo sticky top-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="neo-flat-sm p-2.5 rounded-xl text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 text-glow-indigo tracking-tight">
              PROMPT MASTER
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-500 hidden sm:block neo-pressed-sm px-3 py-1 rounded-lg">
            v3.5 // ULTRA
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-10 space-y-12">
        
        {/* Intro / Config Section */}
        <section className="neo-flat rounded-3xl p-8 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 transition-colors duration-700 opacity-60
             ${config.mode === 'create' ? 'bg-cyan-500/10' : config.mode === 'evolution' ? 'bg-green-500/10' : 'bg-indigo-500/10'}
          `}></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Left Column: Input */}
            <div className="space-y-6">
              <div className="flex neo-pressed p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto">
                <button
                  onClick={() => setConfig({ ...config, mode: 'create' })}
                  className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${config.mode === 'create' ? 'neo-flat text-cyan-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <PenTool className="w-4 h-4 inline mr-2" />
                  CRIAR
                </button>
                <button
                  onClick={() => setConfig({ ...config, mode: 'improve' })}
                  className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${config.mode === 'improve' ? 'neo-flat text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Wand2 className="w-4 h-4 inline mr-2" />
                  MELHORAR
                </button>
                <button
                  onClick={() => setConfig({ ...config, mode: 'evolution' })}
                  className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${config.mode === 'evolution' ? 'neo-flat text-green-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Dna className="w-4 h-4 inline mr-2" />
                  EVOLUIR
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-3 ml-1 uppercase tracking-wider">
                  {config.mode === 'create' ? 'Ideia ou Tópico' : config.mode === 'evolution' ? 'DNA do Prompt (Base)' : 'Prompt Atual'}
                </label>
                <textarea
                  className={`w-full h-48 p-6 rounded-2xl neo-pressed bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 resize-none transition-all 
                    ${config.mode === 'create' ? 'focus:ring-cyan-500/50' : config.mode === 'evolution' ? 'focus:ring-green-500/50' : 'focus:ring-indigo-500/50'}
                  `}
                  placeholder={getPlaceholder()}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isProcessing}
                ></textarea>
              </div>
            </div>

            {/* Right Column: Settings (Dynamic based on Mode) */}
            <div className="space-y-6 md:border-l md:border-slate-800 md:pl-10 flex flex-col justify-center">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 border-b border-slate-800 pb-2">
                  Configuração: {config.mode === 'create' ? 'Criação' : config.mode === 'evolution' ? 'Genética' : 'Otimização'}
               </h3>

               {/* Dynamic Settings Render */}
               <div className="min-h-[200px]">
                  {config.mode === 'create' && renderCreateSettings()}
                  {config.mode === 'improve' && renderImproveSettings()}
                  {config.mode === 'evolution' && renderEvolutionSettings()}
               </div>

              <Button 
                onClick={handleStart} 
                isLoading={isProcessing}
                disabled={!inputText.trim()}
                className={`w-full py-4 text-lg tracking-wide shadow-lg mt-auto
                    ${config.mode === 'create' ? 'text-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]' : ''}
                    ${config.mode === 'evolution' ? 'text-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}
                `}
                icon={
                    config.mode === 'create' ? <Sparkles className="w-5 h-5" /> : 
                    config.mode === 'evolution' ? <Dna className="w-5 h-5" /> : 
                    <Wand2 className="w-5 h-5" />
                }
              >
                {isProcessing ? getProcessLabel() : 
                 config.mode === 'create' ? 'GERAR PROMPT' : 
                 config.mode === 'evolution' ? 'INICIAR MUTAÇÃO' : 
                 'INICIAR OTIMIZAÇÃO'}
              </Button>
            </div>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="neo-flat border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center shadow-[0_0_20px_rgba(239,68,68,0.1)]">
             <AlertCircle className="w-6 h-6 mr-4" />
             {error}
          </div>
        )}

        {/* Timeline */}
        {history.length > 0 && (
          <section className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between px-2">
              <h2 className={`text-xl font-bold flex items-center ${config.mode === 'evolution' ? 'text-green-300' : config.mode === 'create' ? 'text-cyan-300' : 'text-slate-300'}`}>
                {config.mode === 'evolution' ? (
                    <Dna className="w-5 h-5 mr-3 text-green-500" />
                ) : config.mode === 'create' ? (
                    <Sparkles className="w-5 h-5 mr-3 text-cyan-500" />
                ) : (
                    <ArrowRight className="w-5 h-5 mr-3 text-indigo-500" />
                )}
                {config.mode === 'evolution' ? 'Árvore Evolutiva' : 'Resultado'}
              </h2>
              {!isProcessing && (
                <button 
                  onClick={handleReset}
                  className="neo-flat-sm px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 flex items-center transition-colors active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> REINICIAR
                </button>
              )}
            </div>

            <div className="space-y-8 relative">
              {/* Timeline Line */}
              <div className={`absolute left-9 top-8 bottom-8 w-1 bg-gradient-to-b -z-10 hidden md:block rounded-full 
                 ${config.mode === 'evolution' ? 'from-green-500/50' : config.mode === 'create' ? 'from-cyan-500/50' : 'from-indigo-500/50'} 
                 to-transparent`}>
              </div>

              {history.map((version, idx) => (
                <div key={idx} className="md:pl-24 relative">
                  {/* Timeline Node */}
                  <div className={`hidden md:flex absolute left-9 top-10 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 z-0 shadow-[0_0_15px_currentColor] transition-colors duration-500 
                    ${idx === history.length - 1 && !isProcessing 
                        ? (config.mode === 'evolution' ? 'bg-green-500 border-green-300 text-green-500' : config.mode === 'create' ? 'bg-cyan-500 border-cyan-300 text-cyan-500' : 'bg-indigo-500 border-indigo-300 text-indigo-500') 
                        : 'bg-[#292d3e] border-slate-600 text-slate-600'
                    }`}></div>
                  
                  <HistoryItem 
                    version={version} 
                    isLatest={idx === history.length - 1}
                    onContinue={handleContinueFromVersion}
                  />
                </div>
              ))}
              
              <div ref={scrollRef} />
              
              {isProcessing && (
                <div className="md:pl-24 relative">
                   <div className={`hidden md:flex absolute left-9 top-10 w-4 h-4 rounded-full animate-ping opacity-75 transform -translate-x-1/2 z-0 
                      ${config.mode === 'evolution' ? 'bg-green-500' : config.mode === 'create' ? 'bg-cyan-500' : 'bg-indigo-500'}
                   `}></div>
                   
                   <div className={`neo-pressed border rounded-3xl p-10 flex flex-col items-center justify-center 
                      ${config.mode === 'evolution' ? 'border-green-500/10 text-green-400' : config.mode === 'create' ? 'border-cyan-500/10 text-cyan-400' : 'border-indigo-500/10 text-indigo-400'}
                   `}>
                      {config.mode === 'evolution' ? (
                          <>
                            <Dna className="w-10 h-10 mb-4 animate-bounce" />
                            <p className="text-sm font-bold tracking-widest uppercase animate-pulse">Cruzando DNA & Mutando...</p>
                          </>
                      ) : config.mode === 'create' ? (
                          <>
                            <Sparkles className="w-10 h-10 mb-4 animate-pulse" />
                            <p className="text-sm font-bold tracking-widest uppercase animate-pulse">Gerando Prompt...</p>
                          </>
                      ) : (
                          <>
                            <Wand2 className="w-10 h-10 mb-4 animate-spin-slow" />
                            <p className="text-sm font-bold tracking-widest uppercase animate-pulse">Refinando Técnica...</p>
                          </>
                      )}
                   </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="w-full py-6 text-center border-t border-slate-800/50 mt-auto">
        <p className="flex items-center justify-center text-xs font-bold text-slate-600 tracking-[0.2em] uppercase opacity-70 hover:opacity-100 transition-opacity">
          <Code className="w-3 h-3 mr-2" />
          DEV ALEKSANDRO ALVES
        </p>
      </footer>
    </div>
  );
};

export default App;
