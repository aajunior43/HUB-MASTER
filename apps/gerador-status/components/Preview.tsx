import React from 'react';
import { CardConfig } from '../types';

interface PreviewProps {
  config: CardConfig;
  exportRef: React.RefObject<HTMLDivElement>;
  onExport: () => void;
  isExporting: boolean;
}

export const Preview: React.FC<PreviewProps> = ({ config, exportRef, onExport, isExporting }) => {
  
  // Helper to map font styles to Tailwind classes for maximum weight/impact
  const getFontClasses = (font: string) => {
    switch (font) {
      case 'font-sans': return 'font-black tracking-tighter'; // Inter 900
      case 'font-mono': return 'font-bold tracking-tighter';  // Space Mono 700
      case 'font-display': return 'font-normal tracking-tighter'; // Archivo Black (400 is heavy)
      case 'font-serif': return 'font-serif italic font-semibold tracking-wide'; // Playfair Display
      default: return 'font-black';
    }
  };

  const fontClasses = getFontClasses(config.font);

  // Base styles for content
  const baseStyle = {
    backgroundColor: config.palette.bg,
    color: config.palette.text,
    fontFamily: config.font === 'font-sans' ? 'Inter, sans-serif' : config.font === 'font-mono' ? '"Space Mono", monospace' : config.font === 'font-serif' ? '"Playfair Display", serif' : '"Archivo Black", sans-serif',
  };

  // Uneven thick border style for the 1080p export
  // Scaled up for 1920x1080
  const exportBorderStyle = {
    borderColor: config.palette.border, // Use palette border color (usually black or white)
    borderStyle: 'solid',
    borderTopWidth: '40px',
    borderRightWidth: '60px',
    borderBottomWidth: '50px',
    borderLeftWidth: '50px',
    boxSizing: 'border-box' as const,
  };

  // Scaled down uneven border for the preview (~3.5x smaller)
  const previewBorderStyle = {
    borderColor: config.palette.border,
    borderStyle: 'solid',
    borderTopWidth: '11px',
    borderRightWidth: '17px',
    borderBottomWidth: '14px',
    borderLeftWidth: '14px',
    boxSizing: 'border-box' as const,
  };

  const buttonText = isExporting ? 'GERANDO PNG...' : 'BAIXAR PNG (HD)';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
       <div className="w-full flex justify-between items-end mb-2">
         <h2 className="font-display text-2xl bg-black text-white inline-block px-2 py-1">3. PREVIEW</h2>
         <span className="font-mono text-xs font-bold bg-white border border-black px-1">9:16 AR</span>
       </div>

      {/* TECHNICAL FRAME CONTAINER */}
      <div className="relative p-6 border-2 border-black/10 bg-white shadow-hard-xl">
        
        {/* Decorative Crop Marks */}
        <div className="absolute top-0 left-0 w-4 h-1 bg-black"></div>
        <div className="absolute top-0 left-0 w-1 h-4 bg-black"></div>
        <div className="absolute top-0 right-0 w-4 h-1 bg-black"></div>
        <div className="absolute top-0 right-0 w-1 h-4 bg-black"></div>
        <div className="absolute bottom-0 left-0 w-4 h-1 bg-black"></div>
        <div className="absolute bottom-0 left-0 w-1 h-4 bg-black"></div>
        <div className="absolute bottom-0 right-0 w-4 h-1 bg-black"></div>
        <div className="absolute bottom-0 right-0 w-1 h-4 bg-black"></div>

        {/* Center Top Marker */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black"></div>

        {/* 
            VISUAL PREVIEW CONTAINER 
            This is what the user sees. It scales responsibly.
        */}
        <div className="relative w-full max-w-[300px] aspect-[9/16] bg-gray-800 overflow-hidden ring-1 ring-black/20">
            
            {/* Render content scaled to fit this container */}
            <div 
                className="w-full h-full flex flex-col relative transition-all duration-300"
                style={{ ...baseStyle, ...previewBorderStyle }}
            >
                {/* Noise Layer - Scaled for preview */}
                {config.hasNoise && (
                <div 
                    className="absolute inset-0 bg-noise pointer-events-none mix-blend-overlay z-10 opacity-40"
                    style={{ backgroundSize: '128px' }}
                ></div>
                )}
                
                {/* Content Content */}
                <div 
                className={`flex-1 flex flex-col justify-center h-full w-full ${config.alignment}`}
                style={{ padding: `${config.padding * 4}px` }}
                >
                <p 
                    className={`leading-[0.95] break-words whitespace-pre-wrap ${config.uppercase ? 'uppercase' : ''} ${fontClasses}`}
                    style={{ 
                    fontSize: `${config.fontSize / 3.5}px` /* Scale down font for preview roughly */
                    }}
                >
                    {config.text || "SEU TEXTO AQUI"}
                </p>
                </div>
            </div>
        </div>
      </div>

      <button
        onClick={onExport}
        disabled={isExporting}
        data-text={buttonText}
        className="glitch-btn w-full max-w-[320px] border-4 border-black bg-black text-white p-4 font-display text-xl uppercase tracking-wider hover:bg-neon-pink hover:text-black hover:shadow-hard active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 mt-4"
      >
        {buttonText}
      </button>

      {/* 
        HIDDEN EXPORT CONTAINER 
        Fixed 1080x1920 resolution. Rendered off-screen or hidden.
        We use `fixed top-0 left-[-9999px]` to keep it out of view but renderable by html2canvas.
      */}
      <div 
        ref={exportRef}
        className="fixed top-0 left-[-9999px] w-[1080px] h-[1920px] flex flex-col overflow-hidden"
        style={{ ...baseStyle, ...exportBorderStyle }}
      >
          {/* Noise Layer - Scaled for 1080p (approx 3.375x larger than preview) */}
          {config.hasNoise && (
            <div 
              className="absolute inset-0 bg-noise pointer-events-none mix-blend-overlay z-10 w-full h-full opacity-40" 
              style={{ backgroundSize: '432px' }}
            ></div>
          )}
          
          <div 
            className={`flex-1 flex flex-col justify-center h-full w-full relative z-0 ${config.alignment}`}
            style={{ padding: `${config.padding * 8}px` }} 
          >
            <p 
              className={`leading-[0.95] break-words whitespace-pre-wrap ${config.uppercase ? 'uppercase' : ''} ${fontClasses}`}
              style={{ 
                fontSize: `${config.fontSize * 1.8}px` /* True scale for 1080p */
              }}
            >
              {config.text || "SEU TEXTO AQUI"}
            </p>
          </div>
      </div>

    </div>
  );
};