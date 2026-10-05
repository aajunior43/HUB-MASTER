
import React, { useState, useEffect } from 'react';
import { PromptVersion } from '../types';
import { ProgressBar } from './ProgressBar';
import { TestPlayground } from './TestPlayground';
import { Copy, Check, ChevronDown, ChevronUp, Sparkles, AlertCircle, Wrench, Edit3, Save, Play, ArrowRightCircle, Lightbulb, BookOpen, Download } from 'lucide-react';

interface HistoryItemProps {
  version: PromptVersion;
  isLatest: boolean;
  onContinue: (content: string) => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ version, isLatest, onContinue }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(isLatest);
  const [isEditing, setIsEditing] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);
  
  const [editableContent, setEditableContent] = useState(version.content);

  useEffect(() => {
    setExpanded(isLatest);
  }, [isLatest]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const element = document.createElement("a");
    const file = new Blob([editableContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    // Nome do arquivo: prompt-master-v{step}.txt
    const fileName = `prompt-master-v${version.step}.txt`;
    element.download = fileName;
    document.body.appendChild(element); // Required for FireFox
    element.click();
    document.body.removeChild(element);
  };

  const toggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(!isEditing);
  };

  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContinue(editableContent);
  };

  return (
    <div className={`neo-flat rounded-2xl transition-all duration-300 overflow-hidden mb-8 border border-transparent ${isEditing ? 'border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : ''}`}>
      <div 
        className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => !isEditing && setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold shadow-inner ${isLatest ? 'bg-indigo-500/10 text-indigo-400 neo-pressed-sm' : 'bg-slate-700/30 text-slate-500 neo-pressed-sm'}`}>
            {version.step}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className={`font-semibold ${isLatest ? 'text-indigo-300 text-glow-indigo' : 'text-slate-400'}`}>
                {version.step === 0 ? "Prompt Original" : `Iteração #${version.step}`}
              </h3>
              {version.usedTechnique && version.step > 0 && (
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#292d3e] text-cyan-400 neo-pressed-sm border border-cyan-900/30">
                  <Wrench className="w-3 h-3 mr-2" />
                  {version.usedTechnique}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs mt-1">
              {version.changes || "Versão inicial"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4 sm:space-x-6">
          {version.score > 0 && !isEditing && (
            <div className="hidden sm:block w-28">
              <div className="w-full neo-pressed-sm rounded-full h-2 p-[1px]">
                <div 
                  className={`h-full rounded-full ${version.score >= 80 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-yellow-500 shadow-[0_0_8px_#eab308]'}`} 
                  style={{ width: `${version.score}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleEdit}
              className={`p-2 rounded-full transition-all ${isEditing ? 'bg-indigo-500 text-white shadow-lg' : 'neo-flat-sm text-slate-400 hover:text-indigo-400'}`}
              title="Editar Prompt Manualmente"
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            
            {!isEditing && (
              <div className="neo-flat-sm p-2 rounded-full text-slate-400 hover:text-indigo-400 transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-8 pt-0">
          <div className="w-full h-px bg-slate-700/50 mb-6 mx-auto"></div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              
              {isEditing ? (
                 <div className="relative group">
                    <span className="absolute -top-3 left-4 text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">Modo de Edição</span>
                    <textarea
                      value={editableContent}
                      onChange={(e) => setEditableContent(e.target.value)}
                      className="w-full h-64 p-5 rounded-xl neo-pressed bg-slate-800/30 text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
                    />
                 </div>
              ) : (
                <div className="neo-pressed rounded-xl p-5 font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[120px]">
                  {editableContent}
                </div>
              )}
              
              <div className="flex flex-wrap gap-3 justify-end pt-2">
                 {/* Test Button */}
                 <button
                  onClick={(e) => { e.stopPropagation(); setShowPlayground(!showPlayground); }}
                  className={`neo-flat-sm px-4 py-2 rounded-xl flex items-center text-xs font-bold transition-all duration-300 active:scale-95 ${showPlayground ? 'text-cyan-400 ring-1 ring-cyan-500/50' : 'text-slate-400 hover:text-cyan-400'}`}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {showPlayground ? 'Fechar Teste' : 'Testar Prompt'}
                </button>

                {/* Continue Button */}
                <button
                  onClick={handleContinue}
                  className="neo-flat-sm px-4 py-2 rounded-xl flex items-center text-xs font-bold text-slate-400 hover:text-indigo-400 transition-all duration-300 active:scale-95 border border-transparent hover:border-indigo-500/30"
                  title="Usar esta versão para continuar evoluindo"
                >
                  <ArrowRightCircle className="w-4 h-4 mr-2" />
                  Continuar Daqui
                </button>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="neo-flat-sm px-4 py-2 rounded-xl flex items-center text-xs font-bold text-slate-400 hover:text-green-400 transition-all duration-300 active:scale-95 border border-transparent hover:border-green-500/30"
                  title="Baixar prompt em TXT"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar TXT
                </button>

                {/* Copy Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  className={`neo-flat-sm px-5 py-2 rounded-xl relative flex items-center justify-center text-xs font-bold transition-all duration-300 active:scale-95 ${
                    copied 
                      ? 'text-green-400 shadow-[inset_0_0_8px_rgba(34,197,94,0.1)]' 
                      : 'text-indigo-400 hover:text-indigo-300'
                  }`}
                  style={{ minWidth: '140px' }}
                >
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                     <Check className="w-4 h-4 mr-2" />
                     Copiado!
                  </div>

                  <div className={`flex items-center transition-all duration-300 ${copied ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                     <Copy className="w-4 h-4 mr-2" />
                     Copiar Prompt
                  </div>
                </button>
              </div>

              {/* TEST PLAYGROUND AREA */}
              {showPlayground && (
                <TestPlayground promptToTest={editableContent} />
              )}
            </div>

            <div className="space-y-5">
              <ProgressBar score={version.score} />

              {/* Enhanced Technique Block */}
              {version.usedTechnique && version.step > 0 && (
                <div className="neo-flat-sm rounded-xl overflow-hidden border-l-2 border-indigo-500/50">
                  <div className="p-4 bg-indigo-500/5 border-b border-indigo-500/10">
                    <h4 className="flex items-center text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <Wrench className="w-3 h-3 mr-2" /> Técnica: {version.usedTechnique}
                    </h4>
                  </div>
                  
                  <div className="p-4 space-y-4">
                     {version.techniqueExplanation && (
                        <div className="space-y-1">
                           <div className="flex items-center text-[10px] font-bold text-indigo-300/70 uppercase tracking-wider">
                              <BookOpen className="w-3 h-3 mr-1.5" /> O que é?
                           </div>
                           <p className="text-xs text-slate-400 leading-relaxed bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                              {version.techniqueExplanation}
                           </p>
                        </div>
                     )}
                     
                     {version.techniqueApplication && (
                        <div className="space-y-1">
                           <div className="flex items-center text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider">
                              <Lightbulb className="w-3 h-3 mr-1.5" /> Como foi aplicado?
                           </div>
                           <p className="text-xs text-slate-400 leading-relaxed bg-cyan-500/5 p-2 rounded-lg border border-cyan-500/10">
                              {version.techniqueApplication}
                           </p>
                        </div>
                     )}
                  </div>
                </div>
              )}
              
              {/* Critique Block */}
              <div className="neo-flat-sm p-4 rounded-xl border-l-2 border-amber-500/50">
                <h4 className="flex items-center text-xs font-bold text-amber-500 uppercase mb-2 tracking-wider">
                  <AlertCircle className="w-3 h-3 mr-2" /> Análise
                </h4>
                <p className="text-sm text-slate-400 italic">
                  "{version.critique}"
                </p>
              </div>

              {/* Changes Block */}
              {version.changes && (
                <div className="neo-flat-sm p-4 rounded-xl border-l-2 border-cyan-500/50">
                  <h4 className="flex items-center text-xs font-bold text-cyan-400 uppercase mb-2 tracking-wider">
                    <Sparkles className="w-3 h-3 mr-2" /> Melhorias
                  </h4>
                  <p className="text-sm text-slate-400">
                    {version.changes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
