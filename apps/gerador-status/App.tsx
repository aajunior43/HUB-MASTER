import React, { useState, useRef } from 'react';
import { INITIAL_CONFIG, getPaletteByName } from './constants';
import { CardConfig, GeneratedVariant } from './types';
import { Controls } from './components/Controls';
import { Preview } from './components/Preview';
import { ManualEditor } from './components/ManualEditor';
import { generateStatusText } from './services/geminiService';

declare global {
  interface Window {
    html2canvas: any;
  }
}

const Marquee = () => (
  <div className="bg-black text-white border-b-4 border-black font-mono text-xs py-2 marquee-container select-none">
    <div className="marquee-content">
      <span className="mx-4">DEV ALEKSANDRO ALVES</span>
      <span className="mx-4">///</span>
      <span className="mx-4">JRSTATUS</span>
      <span className="mx-4">///</span>
      <span className="mx-4">DEV ALEKSANDRO ALVES</span>
      <span className="mx-4">///</span>
      <span className="mx-4">JRSTATUS</span>
      <span className="mx-4">///</span>
      <span className="mx-4">DEV ALEKSANDRO ALVES</span>
      <span className="mx-4">///</span>
      <span className="mx-4">JRSTATUS</span>
      <span className="mx-4">///</span>
      <span className="mx-4">DEV ALEKSANDRO ALVES</span>
      <span className="mx-4">///</span>
    </div>
  </div>
);

export default function App() {
  // State: Input
  const [themeInput, setThemeInput] = useState('');
  
  // State: AI
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  
  // State: Editor (Driven by AI selection now)
  const [config, setConfig] = useState<CardConfig>(INITIAL_CONFIG);

  // State: Export
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedVariants([]);
    setSelectedVariantId('');
    
    try {
      const results = await generateStatusText(themeInput);
      
      setGeneratedVariants(results);
      
      if (results.length > 0) {
        handleSelectVariant(results[0]);
      }
    } catch (e) {
      console.error("Generate failed:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVariant = (variant: GeneratedVariant) => {
    setSelectedVariantId(variant.id);
    
    // Map variant to config
    setConfig({
      text: variant.text,
      font: variant.font,
      fontSize: variant.fontSize,
      alignment: variant.alignment,
      padding: 12, // Default padding for all AI generated cards
      palette: getPaletteByName(variant.paletteName),
      hasNoise: variant.hasNoise,
      uppercase: variant.uppercase
    });
  };

  const handleExport = async () => {
    if (!exportRef.current || !window.html2canvas) {
      alert("Erro: Biblioteca de exportação não carregada.");
      return;
    }

    setIsExporting(true);

    try {
      const canvas = await window.html2canvas(exportRef.current, {
        scale: 1, // Already 1080x1920 logical pixels
        useCORS: true,
        backgroundColor: config.palette.bg, // Ensure no transparency
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `JRSTATUS-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("Falha ao exportar imagem.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-neon-pink selection:text-white pb-20">
      
      {/* Header */}
      <header className="border-b-4 border-black bg-acid-green p-4 md:p-6 sticky top-0 z-50 shadow-hard relative">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold tracking-widest mb-[-5px]">DESIGN_GENERATOR</span>
            <h1 className="font-display text-2xl md:text-4xl uppercase tracking-tighter">
              JR<span className="text-stroke-white text-transparent" style={{ WebkitTextStroke: '1px black'}}>STATUS</span>
            </h1>
          </div>
          <div className="hidden md:block font-mono text-xs font-bold border-2 border-black px-2 py-1 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            v2.0 // GEMINI
          </div>
        </div>
      </header>
      
      <Marquee />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        
        {/* Left Column: Controls (lg: 7 cols) */}
        <div className="lg:col-span-7">
          <Controls 
            themeInput={themeInput}
            setThemeInput={setThemeInput}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            generatedVariants={generatedVariants}
            onSelectVariant={handleSelectVariant}
            selectedVariantId={selectedVariantId}
          />
        </div>

        {/* Right Column: Preview (lg: 5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-32 w-full flex flex-col items-center">
            <Preview 
              config={config}
              exportRef={exportRef}
              onExport={handleExport}
              isExporting={isExporting}
            />
            <ManualEditor 
              config={config} 
              setConfig={setConfig} 
            />
          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="mt-12 text-center font-mono text-xs text-gray-400 p-4 border-t-2 border-dashed border-gray-300">
        [ SYSTEM_ID: GEMINI_FLASH_2.5 ] // [ RENDER_ENGINE: HTML2CANVAS ]
      </footer>

    </div>
  );
}