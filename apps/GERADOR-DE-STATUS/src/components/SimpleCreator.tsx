'use client';

import React, { useState, useRef, useEffect } from 'react';

const SimpleCreator = () => {
  const [theme, setTheme] = useState('');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeComplementaryPhrase, setIncludeComplementaryPhrase] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateStatus = async () => {
    if (!theme.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const { useGeminiService } = await import('@/services/geminiService');
      const geminiService = useGeminiService();
      
      const response = await geminiService.generateStatus({
        theme,
        style: 'modern',
        aspectRatio: '9:16',
        includeHashtags,
        includeComplementaryPhrase
      });
      
      setGeneratedContent(response.generatedContent);
      
    } catch (error) {
      console.error('Erro ao gerar status:', error);
      // Fallback com citação famosa
      const fallbackContent = {
        text: `"O futuro pertence àqueles que acreditam na beleza de seus sonhos." ✨
(Eleanor Roosevelt)

background: #1a1a2e
text: #f39c12`,
        backgroundColor: '#1a1a2e',
        textColor: '#f39c12',
        fontSize: 20,
        fontFamily: 'Inter'
      };
      setGeneratedContent(fallbackContent);
    } finally {
      setIsGenerating(false);
    }
  };

  // Renderizar status no canvas
  useEffect(() => {
    if (!canvasRef.current || !generatedContent) return;

    console.log('Rendering content:', generatedContent);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    const scale = 2;
    canvas.width = 360 * scale;
    canvas.height = 640 * scale;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.scale(scale, scale);

    // Limpar canvas
    ctx.clearRect(0, 0, 360, 640);

    // Background com gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, 640);
    const baseColor = generatedContent.backgroundColor;
    
    const lighterColor = adjustBrightness(baseColor, 20);
    const darkerColor = adjustBrightness(baseColor, -20);
    
    gradient.addColorStop(0, lighterColor);
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, darkerColor);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 360, 640);

    // Adicionar decorações
    drawDecorations(ctx, baseColor);

    // Processar e desenhar texto
    const textLines = generatedContent.text.split('\n');
    const processedLines: string[] = [];

    textLines.forEach((line: string) => {
      if (line.trim() === '') {
        processedLines.push('');
        return;
      }

      const words = line.split(' ');
      let currentLine = '';

      ctx.font = `${generatedContent.fontSize}px ${generatedContent.fontFamily}`;

      words.forEach((word: string) => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > 320 && currentLine !== '') {
          processedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      
      if (currentLine) {
        processedLines.push(currentLine);
      }
    });

    // Configurar e desenhar texto
    ctx.fillStyle = generatedContent.textColor;
    ctx.font = `${generatedContent.fontSize}px ${generatedContent.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sombra no texto
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const lineHeight = generatedContent.fontSize * 1.4;
    const totalTextHeight = processedLines.length * lineHeight;
    const startY = (640 - totalTextHeight) / 2 + lineHeight / 2;

    processedLines.forEach((line, index) => {
      if (line.trim() !== '') {
        const x = 180;
        const y = startY + (index * lineHeight);
        ctx.fillText(line, x, y);
      }
    });

    // Remover sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

  }, [generatedContent]);

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

  // Função para desenhar decorações
  const drawDecorations = (ctx: CanvasRenderingContext2D, baseColor: string) => {
    ctx.save();
    
    const decorColor = adjustBrightness(baseColor, 15);
    ctx.fillStyle = decorColor;
    ctx.globalAlpha = 0.1;
    
    // Círculos decorativos
    ctx.beginPath();
    ctx.arc(300, 100, 80, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(60, 540, 60, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  // Função para download
  const downloadImage = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `status-${theme.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500 rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-600 rounded-full opacity-10 blur-2xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-8 lg:gap-16 max-w-7xl mx-auto min-h-[80vh]">
          
          {/* Coluna esquerda - Controles */}
          <div className="w-full lg:w-1/2 lg:max-w-lg flex flex-col justify-center">
            
            {/* Título */}
            <div className="text-center lg:text-left mb-8 lg:mb-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                  Status AI
                </span>
              </h1>
              <p className="text-gray-300 text-lg sm:text-xl lg:text-2xl leading-relaxed">
                Digite um tema e crie status profissionais instantaneamente
              </p>
            </div>

            {/* Input e botão */}
            <div className="space-y-6 mb-8">
              {/* Input principal */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Digite seu tema aqui..."
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateStatus()}
                  className="w-full px-6 py-5 text-lg bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all duration-300 shadow-2xl"
                />
                {theme && (
                  <button
                    onClick={() => setTheme('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-xl"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Opções */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hashtags"
                    checked={includeHashtags}
                    onChange={(e) => setIncludeHashtags(e.target.checked)}
                    className="w-4 h-4 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="hashtags" className="ml-2 text-gray-300">
                    Incluir hashtags
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="complementary"
                    checked={includeComplementaryPhrase}
                    onChange={(e) => setIncludeComplementaryPhrase(e.target.checked)}
                    className="w-4 h-4 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="complementary" className="ml-2 text-gray-300">
                    Frase complementar
                  </label>
                </div>
              </div>

              {/* Botão gerar */}
              <button
                onClick={generateStatus}
                disabled={!theme.trim() || isGenerating}
                className="w-full py-5 px-8 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-400 hover:to-yellow-500 hover:shadow-lg hover:shadow-yellow-500/25 transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3"
              >
                {isGenerating && (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                )}
                <span>{isGenerating ? 'Gerando...' : 'Gerar Status'}</span>
              </button>
            </div>

            {/* Informações extras */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <span className="mr-2">✨</span>
                Como funciona
              </h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  Digite um tema (ex: motivação, amor, sucesso)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  A IA cria texto e design automaticamente
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  Baixe e compartilhe nas redes sociais
                </li>
              </ul>
            </div>
          </div>

          {/* Coluna direita - Preview */}
          <div className="w-full lg:w-1/2 flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="relative w-full max-w-sm mx-auto">
                {/* Container do preview com aspect ratio 9:16 */}
                <div className="aspect-[9/16] bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-3xl overflow-hidden border border-gray-600/30 shadow-2xl">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Loading overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-gray-300 text-sm">Criando seu status...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty state */}
                  {!generatedContent && !isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-8">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-sm">
                          Seu status aparecerá aqui
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Elementos decorativos */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-500/20 rounded-full blur-sm"></div>
                <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-yellow-600/30 rounded-full blur-sm"></div>
                <div className="absolute top-1/2 -left-8 w-4 h-4 bg-yellow-400/20 rounded-full blur-sm"></div>
              </div>
            </div>

            {/* Texto gerado */}
            {generatedContent && (
              <div className="w-full max-w-sm bg-gray-800/30 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-2 text-sm flex items-center">
                  <span className="mr-2">📝</span>
                  Texto Gerado:
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">
                  {generatedContent.text}
                </p>
              </div>
            )}

            {/* Botões de ação */}
            {generatedContent && (
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={generateStatus}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-gray-800/50 border border-gray-600/50 text-gray-300 hover:text-white hover:border-yellow-500/50 rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm backdrop-blur-sm"
                >
                  <svg className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Nova Variação</span>
                </button>
                
                <button
                  onClick={downloadImage}
                  className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-all duration-300 flex items-center space-x-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download</span>
                </button>
                
                <button
                  className="px-4 py-2 bg-gray-800/50 border border-gray-600/50 text-gray-300 hover:text-white hover:border-yellow-500/50 rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>Compartilhar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCreator;
