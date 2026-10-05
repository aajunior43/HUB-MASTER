'use client';

import React, { useState, useEffect } from 'react';

const LivePreview = ({ theme, generatedContent }: { theme: string; generatedContent: any }) => {
  const [previewStyle, setPreviewStyle] = useState({
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#f39c12',
    fontSize: '24px',
    fontFamily: 'Inter, sans-serif'
  });

  useEffect(() => {
    if (generatedContent) {
      setPreviewStyle({
        background: `linear-gradient(135deg, ${generatedContent.backgroundColor} 0%, ${adjustBrightness(generatedContent.backgroundColor, -20)} 100%)`,
        color: generatedContent.textColor,
        fontSize: `${generatedContent.fontSize}px`,
        fontFamily: generatedContent.fontFamily
      });
    } else if (theme) {
      // Estilo temporário enquanto gera
      setPreviewStyle({
        background: 'linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%)',
        color: '#ecf0f1',
        fontSize: '24px',
        fontFamily: 'Inter, sans-serif'
      });
    }
  }, [generatedContent, theme]);

  // Função para ajustar brilho
  const adjustBrightness = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  return (
    <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden border border-gray-600/30 shadow-2xl relative">
      <div 
        className="w-full h-full flex items-center justify-center p-6 text-center relative"
        style={previewStyle}
      >
        {/* Efeitos decorativos */}
        <div className="absolute top-4 left-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        
        {/* Conteúdo */}
        <div className="relative z-10">
          {generatedContent ? (
            <div>
              <p className="font-bold leading-tight drop-shadow-lg whitespace-pre-line">
                {generatedContent.text.split('\r\n')[0]}
              </p>
              {generatedContent.text.split('\r\n').length > 1 && (
                <p className="text-sm mt-2 opacity-80">
                  {generatedContent.text.split('\r\n').slice(1).join('\r\n')}
                </p>
              )}
            </div>
          ) : theme ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-current/30 border-t-current rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Gerando status...</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-current/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm opacity-80">
                Seu status aparecerá aqui
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivePreview;