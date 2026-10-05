import React from 'react';
import { GeneratedVariant } from '../types';

interface ControlsProps {
  themeInput: string;
  setThemeInput: (v: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  generatedVariants: GeneratedVariant[];
  onSelectVariant: (variant: GeneratedVariant) => void;
  selectedVariantId?: string;
}

export const Controls: React.FC<ControlsProps> = ({
  themeInput, setThemeInput, isGenerating, onGenerate,
  generatedVariants, onSelectVariant, selectedVariantId
}) => {

  const getFontClasses = (font: string) => {
    switch (font) {
      case 'font-sans': return 'font-black tracking-tighter';
      case 'font-mono': return 'font-bold tracking-tighter';
      case 'font-serif': return 'font-serif italic font-semibold tracking-wide';
      default: return 'font-display tracking-tighter';
    }
  };

  const buttonText = isGenerating ? 'PROCESSANDO...' : '/// INICIAR GERAÇÃO';

  return (
    <div className="flex flex-col gap-8">
      
      {/* INPUT SECTION */}
      <div className="bg-white border-4 border-black shadow-hard-lg p-1 relative">
         {/* Decorative Corner */}
         <div className="absolute top-0 right-0 w-4 h-4 bg-black"></div>

        <div className="p-5 space-y-4 border border-black">
            <div className="flex justify-between items-end">
                <h2 className="font-display text-2xl bg-black text-white inline-block px-2 py-1 transform -rotate-1">1. INPUT</h2>
                <span className="font-mono text-[10px] text-gray-500">REQ_USER_DATA</span>
            </div>
            
            <div className="flex flex-col gap-1 relative group">
            <label className="font-mono text-xs font-bold uppercase mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-acid-green border border-black rounded-full"></span>
                Tema / Contexto
            </label>
            <input
                type="text"
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating && themeInput.trim()) {
                    onGenerate();
                  }
                }}
                placeholder="DIGITE AQUI..."
                className="w-full bg-off-white border-b-4 border-black p-4 font-mono text-lg focus:outline-none focus:bg-black focus:text-acid-green focus:placeholder-gray-700 transition-colors placeholder-gray-400"
            />
            </div>

            <button
            onClick={onGenerate}
            disabled={isGenerating || !themeInput.trim()}
            data-text={buttonText}
            className={`glitch-btn w-full border-4 border-black p-4 font-display text-xl uppercase tracking-wider transition-all mt-4
                ${isGenerating ? 'bg-gray-300 cursor-wait opacity-80' : 'bg-acid-green hover:bg-white hover:shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none'}
            `}
            >
            {buttonText}
            </button>
        </div>
      </div>

      {/* VARIANTS SELECTION */}
      <div className="space-y-4">
        <div className="flex justify-between items-end px-2">
            <h2 className="font-display text-2xl bg-black text-white inline-block px-2 py-1 transform rotate-1">2. SELEÇÃO</h2>
            <span className="font-mono text-[10px] text-gray-500">SELECT_OUTPUT</span>
        </div>
        
        {generatedVariants.length === 0 ? (
          <div className="p-12 border-4 border-dashed border-gray-300 bg-white/50 text-center font-mono text-sm text-gray-400 flex flex-col items-center gap-2">
            <span className="text-2xl opacity-20">WAITING</span>
            <span>AGUARDANDO DADOS...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 animate-fade-in">
            {generatedVariants.map((variant, idx) => {
                const isSelected = selectedVariantId === variant.id;
                return (
                <button
                    key={variant.id}
                    onClick={() => onSelectVariant(variant)}
                    className={`group text-left border-4 p-4 transition-all duration-150 ease-out relative overflow-hidden flex gap-4
                    active:scale-[0.98] active:translate-x-0 active:translate-y-0 active:shadow-none
                    ${isSelected 
                        ? 'border-black bg-acid-green shadow-hard -translate-y-1 -translate-x-1 z-10 scale-[1.01]' 
                        : 'border-gray-300 bg-off-white text-gray-600 grayscale hover:grayscale-0 hover:text-black hover:border-black hover:bg-white hover:shadow-hard hover:-translate-y-1 hover:-translate-x-1 hover:scale-[1.02] hover:z-10'
                    }`}
                >
                    <div className={`flex flex-col justify-between items-center w-8 shrink-0 border-r-2 pr-4 transition-colors ${isSelected ? 'border-black' : 'border-gray-300 group-hover:border-black'}`}>
                        <span className="font-mono text-lg font-bold">{isSelected ? '[X]' : '[ ]'}</span>
                        <span className="font-mono text-[10px] rotate-90 whitespace-nowrap mt-4 origin-center translate-y-2 opacity-50">OPT_0{idx + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`font-mono text-[10px] font-bold uppercase px-1 transition-colors border border-transparent ${isSelected ? 'bg-black text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-black group-hover:text-acid-green'}`}>
                                {variant.tone}
                            </span>
                        </div>
                        <p className={`text-lg leading-tight whitespace-pre-wrap line-clamp-3 transition-colors ${getFontClasses(variant.font)}`}>
                        {variant.text}
                        </p>
                    </div>
                </button>
                )
            })}
          </div>
        )}
      </div>
    </div>
  );
};