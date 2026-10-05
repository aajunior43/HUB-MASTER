'use client';

import React, { useState, useEffect } from 'react';
import { useGeminiService } from '@/services/geminiService';
import { useImageGeneration } from '@/services/imageService';
import { useSwipe } from '@/hooks/useSwipe';
import { hapticFeedback } from '@/utils/haptics';
import { useToast } from '@/components/Toast';
import EnhancedHeader from '@/components/EnhancedHeader';

export default function Home() {
  const [theme, setTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(false);
  const [includeVignette, setIncludeVignette] = useState(false);
  const [includeBackground, setIncludeBackground] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  const { showToast, ToastContainer } = useToast();

  const generateStatus = async () => {
    if (!theme.trim()) return;
    hapticFeedback.medium();
    setIsGenerating(true);

    try {
      const geminiService = useGeminiService();
      const imageService = useImageGeneration();

      const response = await geminiService.generateStatus({
        theme, style: 'modern', aspectRatio: '9:16',
        includeComplementaryPhrase: false, includeHashtags, includeEmojis, includeVignette,
      });

      setGeneratedContent(response.generatedContent);

      // Gerar imagem de fundo se solicitado
      if (includeBackground) {
        try {
          console.log('🖼️ Gerando imagem de fundo...');
          const imageResponse = await imageService.generateBackgroundImage({
            text: response.generatedContent.text,
            theme: theme,
            style: 'realistic',
            aspectRatio: '9:16'
          });
          setBackgroundImage(imageResponse.imageUrl);
          
          // Informar ao usuário qual modelo foi usado
          if (imageResponse.metadata.model === 'gemini-2.5-flash-image-preview') {
            console.log('✅ Imagem IA gerada com Gemini:', imageResponse.imageUrl);
            showToast('Imagem IA gerada com sucesso!', 'success');
          } else {
            console.log('✅ Imagem de stock gerada:', imageResponse.imageUrl);
            showToast('Imagem de stock aplicada!', 'success');
          }
        } catch (imageError) {
          console.warn('⚠️ Erro ao gerar imagem de fundo, continuando sem imagem:', imageError);
          setBackgroundImage(null);
          showToast('Erro na geração de imagem', 'error');
        }
      } else {
        setBackgroundImage(null);
      }

      hapticFeedback.success();
      showToast('Status criado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar status:', error);
      hapticFeedback.error();
      showToast('Erro ao gerar. Usando fallback.', 'error');
      setGeneratedContent({
        text: `"A única forma de fazer um excelente trabalho é amar o que você faz." ✨\n(Steve Jobs)`,
        backgroundColor: '#1a1a2e', textColor: '#f39c12', fontSize: 20, fontFamily: 'Inter'
      });
      setBackgroundImage(null);
    } finally {
      setIsGenerating(false);
    }
  };


  const downloadImage = async () => {
    if (!generatedContent) return;
    hapticFeedback.medium();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuração de alta qualidade
    const scale = 3; // Aumentado para melhor qualidade
    const width = 1080; // Resolução HD para Instagram/WhatsApp
    const height = 1920;
    canvas.width = width;
    canvas.height = height;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Background - imagem ou gradiente
    if (backgroundImage && includeBackground) {
      try {
        // Carregar e desenhar imagem de fundo
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Falha ao carregar imagem'));
          img.src = backgroundImage;
        });
        
        // Desenhar imagem ajustada ao canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Adicionar overlay para melhor legibilidade do texto
        const overlay = ctx.createLinearGradient(0, 0, 0, height);
        overlay.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        overlay.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
        overlay.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, width, height);
        
      } catch (error) {
        console.warn('⚠️ Erro ao carregar imagem de fundo, usando gradiente:', error);
        // Fallback para gradiente
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        const baseColor = generatedContent.backgroundColor;
        gradient.addColorStop(0, adjustBrightness(baseColor, 20));
        gradient.addColorStop(0.2, adjustBrightness(baseColor, 10));
        gradient.addColorStop(0.5, baseColor);
        gradient.addColorStop(0.8, adjustBrightness(baseColor, -10));
        gradient.addColorStop(1, adjustBrightness(baseColor, -25));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // Background com gradiente melhorado
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      const baseColor = generatedContent.backgroundColor;
      gradient.addColorStop(0, adjustBrightness(baseColor, 20));
      gradient.addColorStop(0.2, adjustBrightness(baseColor, 10));
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(0.8, adjustBrightness(baseColor, -10));
      gradient.addColorStop(1, adjustBrightness(baseColor, -25));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Adicionar elementos decorativos modernos
    const baseColor = generatedContent.backgroundColor;
    drawDecorativeElements(ctx, width, height, baseColor);

    // Vinheta melhorada
    if (includeVignette) {
      const vignetteGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.8);
      vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.1)');
      vignetteGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.3)');
      vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Área de texto com sombra e melhor tipografia
    drawEnhancedText(ctx, generatedContent, width, height, backgroundImage, includeBackground);

    // Download em alta qualidade
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `status-hd-${theme.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.png`;
    link.href = canvas.toDataURL('image/png', 0.95);
    link.click();
    showToast('Imagem HD baixada!', 'success');
  };


  // Função para desenhar elementos decorativos
  const drawDecorativeElements = (ctx: CanvasRenderingContext2D, width: number, height: number, baseColor: string) => {
    ctx.save();
    
    // Círculos decorativos sutis
    const circleColor = adjustBrightness(baseColor, 15);
    ctx.fillStyle = circleColor + '15'; // 15 = baixa opacidade
    
    // Círculo grande no topo direito
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.15, width * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // Círculo médio no canto inferior esquerdo
    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.85, width * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Linhas decorativas sutis
    ctx.strokeStyle = adjustBrightness(baseColor, 25) + '20';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 10]);
    
    // Linha diagonal superior
    ctx.beginPath();
    ctx.moveTo(0, height * 0.25);
    ctx.lineTo(width * 0.4, height * 0.1);
    ctx.stroke();
    
    // Linha diagonal inferior
    ctx.beginPath();
    ctx.moveTo(width * 0.6, height * 0.9);
    ctx.lineTo(width, height * 0.75);
    ctx.stroke();
    
    ctx.restore();
  };

  // Função para texto melhorado com sombra e efeitos
  const drawEnhancedText = (ctx: CanvasRenderingContext2D, content: any, width: number, height: number, backgroundImage: string | null = null, includeBackground: boolean = false) => {
    ctx.save();
    
    const paragraphs = content.text.split('\n').filter((p: string) => p.trim());
    const fontSize = Math.min(width * 0.08, 80); // Fonte responsiva
    const fontFamily = getFontFamily(content.fontFamily);
    
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerY = height / 2;
    const lineHeight = fontSize * 1.4;
    const totalTextHeight = paragraphs.length * lineHeight;
    let currentY = centerY - (totalTextHeight / 2) + (lineHeight / 2);
    
    paragraphs.forEach((paragraph: string) => {
      const text = paragraph.trim();
      
      // Sombra do texto (mais forte se há imagem de fundo)
      if (backgroundImage && includeBackground) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(text, width/2 + 3, currentY + 3);
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(text, width/2 + 2, currentY + 2);
      }
      
      // Texto principal
      ctx.fillStyle = backgroundImage && includeBackground ? '#ffffff' : content.textColor;
      ctx.fillText(text, width/2, currentY);
      
      currentY += lineHeight;
    });
    
    // Adicionar uma linha decorativa abaixo do texto se houver autor
    if (content.text.includes('(')) {
      ctx.strokeStyle = (backgroundImage && includeBackground ? '#ffffff' : content.textColor) + '60';
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      
      const lineY = currentY + 30;
      const lineWidth = width * 0.2;
      
      ctx.beginPath();
      ctx.moveTo(width/2 - lineWidth/2, lineY);
      ctx.lineTo(width/2 + lineWidth/2, lineY);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // Função para mapear fontes do sistema
  const getFontFamily = (fontName: string): string => {
    const fontMap: Record<string, string> = {
      'Inter': 'Inter, system-ui, sans-serif',
      'Playfair Display': 'Georgia, serif',
      'Montserrat': 'system-ui, sans-serif',
      'Poppins': 'system-ui, sans-serif',
      'Lato': 'system-ui, sans-serif',
      'Open Sans': 'system-ui, sans-serif',
      'Crimson Text': 'Georgia, serif'
    };
    return fontMap[fontName] || 'system-ui, sans-serif';
  };

  const adjustBrightness = (hex: string, percent: number): string => {
    // Remove '#' se presente
    const cleanHex = hex.replace('#', '');
    
    // Parse RGB
    const num = parseInt(cleanHex, 16);
    const amt = Math.round(2.55 * percent);
    
    // Extrair componentes RGB
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    
    // Garantir que os valores estejam entre 0 e 255
    R = Math.max(0, Math.min(255, R));
    G = Math.max(0, Math.min(255, G));
    B = Math.max(0, Math.min(255, B));
    
    // Converter de volta para hex
    const result = '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    return result;
  };

  const quickThemes = [
    'Motivação', 'Amor', 'Sucesso', 'Sabedoria', 'Força', 'Paz',
    'Felicidade', 'Coragem', 'Esperança', 'Gratidão', 'Família', 'Amizade',
    'Trabalho', 'Sonhos', 'Vida', 'Fé', 'Superação', 'Inspiração'
  ];

  useSwipe({
    onSwipeLeft: () => {
      if (!isGenerating) {
        hapticFeedback.light();
        const nextIndex = (currentThemeIndex + 1) % quickThemes.length;
        setCurrentThemeIndex(nextIndex);
        setTheme(quickThemes[nextIndex]);
      }
    },
    onSwipeRight: () => {
      if (!isGenerating) {
        hapticFeedback.light();
        const prevIndex = currentThemeIndex === 0 ? quickThemes.length - 1 : currentThemeIndex - 1;
        setCurrentThemeIndex(prevIndex);
        setTheme(quickThemes[prevIndex]);
      }
    },
    onSwipeUp: () => {
      if (generatedContent && !isGenerating) {
        hapticFeedback.medium();
        downloadImage();
      }
    }
  });

  useEffect(() => {
    const index = quickThemes.indexOf(theme);
    if (index !== -1 && index !== currentThemeIndex) {
      setCurrentThemeIndex(index);
    }
  }, [theme, quickThemes, currentThemeIndex]);

  const getFontClass = (fontName: string): string => {
    const fontMap: Record<string, string> = {
      'Inter': 'font-inter', 'Playfair Display': 'font-playfair', 'Montserrat': 'font-montserrat',
      'Poppins': 'font-poppins', 'Lato': 'font-lato', 'Open Sans': 'font-opensans', 'Crimson Text': 'font-crimson'
    };
    return fontMap[fontName] || 'font-inter';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 relative">
      <div className="relative z-10">
        {/* Main Container */}
        <main className="py-8">
          <div className="container mx-auto px-6 max-w-7xl">
            
            {/* Hero Section */}
            <section className="text-center py-12 lg:py-16">
              <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight">
                  Status AI
                </h1>
                
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                  Crie status profissionais com inteligência artificial
                </p>
              </div>
            </section>
            
            {/* Main Content */}
            <section className="py-12">
              <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-5 gap-8 lg:gap-16 items-start">
                  
                  {/* Controls - 3 columns */}
                  <div className="lg:col-span-3 space-y-6">
                    
                    {/* Input */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-center text-gray-900">
                          Qual o tema do seu status?
                        </h2>
                        <input
                          type="text"
                          placeholder="Ex: motivação, amor, sucesso, família..."
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && generateStatus()}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 text-center"
                        />
                      </div>
                    </div>
                    
                    {/* Options */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-center text-gray-900">
                          Personalizar
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          
                          {/* Emojis */}
                          <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50" 
                                 style={{ borderColor: includeEmojis ? '#3B82F6' : '#E5E7EB', backgroundColor: includeEmojis ? '#EFF6FF' : 'transparent' }}>
                            <input type="checkbox" checked={includeEmojis} onChange={(e) => setIncludeEmojis(e.target.checked)} className="sr-only" />
                            <div className="text-2xl">😊</div>
                            <span className="text-sm font-medium text-gray-700">Emojis</span>
                          </label>
                          
                          {/* Hashtags */}
                          <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
                                 style={{ borderColor: includeHashtags ? '#3B82F6' : '#E5E7EB', backgroundColor: includeHashtags ? '#EFF6FF' : 'transparent' }}>
                            <input type="checkbox" checked={includeHashtags} onChange={(e) => setIncludeHashtags(e.target.checked)} className="sr-only" />
                            <div className="text-2xl">#️⃣</div>
                            <span className="text-sm font-medium text-gray-700">Hashtags</span>
                          </label>

                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Vinheta */}
                          <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
                                 style={{ borderColor: includeVignette ? '#3B82F6' : '#E5E7EB', backgroundColor: includeVignette ? '#EFF6FF' : 'transparent' }}>
                            <input type="checkbox" checked={includeVignette} onChange={(e) => setIncludeVignette(e.target.checked)} className="sr-only" />
                            <div className="text-2xl">🎞️</div>
                            <span className="text-sm font-medium text-gray-700">Vinheta</span>
                          </label>

                          {/* Fundo com Imagem */}
                          <label className="flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
                                 style={{ borderColor: includeBackground ? '#3B82F6' : '#E5E7EB', backgroundColor: includeBackground ? '#EFF6FF' : 'transparent' }}>
                            <input type="checkbox" checked={includeBackground} onChange={(e) => setIncludeBackground(e.target.checked)} className="sr-only" />
                            <div className="text-2xl">🖼️</div>
                            <span className="text-sm font-medium text-gray-700">Imagem AI</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Buttons */}
                    <div className="space-y-4">
                      <button
                        onClick={generateStatus}
                        disabled={!theme.trim() || isGenerating}
                        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        {isGenerating && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        <span>{isGenerating ? 'Gerando...' : 'Gerar Status'}</span>
                      </button>
                      
                      {generatedContent && (
                        <button
                          onClick={downloadImage}
                          className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                          <span>📱</span>
                          <span>Baixar Imagem</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Preview - 2 columns */}
                  <div className="lg:col-span-2">
                    <div className="sticky top-32 space-y-4">
                      <h2 className="text-lg font-semibold text-center text-gray-900">Preview</h2>
                      
                      <div className="flex justify-center">
                        <div className="relative">
                          <div 
                            className="w-64 lg:w-80 aspect-[9/16] rounded-2xl overflow-hidden shadow-lg border border-gray-200 cursor-pointer transition-transform duration-200 hover:scale-105"
                            onClick={() => generatedContent && downloadImage()}
                          >
                            <div 
                              className={`w-full h-full flex items-center justify-center p-6 lg:p-8 text-center relative ${generatedContent ? getFontClass(generatedContent.fontFamily) : 'font-inter'}`}
                              style={{
                                background: backgroundImage && includeBackground
                                  ? `url('${backgroundImage}') center/cover`
                                  : generatedContent 
                                  ? `linear-gradient(135deg, ${generatedContent.backgroundColor} 0%, ${adjustBrightness(generatedContent.backgroundColor, -15)} 100%)`
                                  : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                                color: generatedContent?.textColor || '#f39c12',
                                fontSize: '14px'
                              }}
                            >
                              {/* Overlay para legibilidade do texto quando há imagem de fundo */}
                              {backgroundImage && includeBackground && (
                                <div 
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)'
                                  }}
                                />
                              )}
                              
                              {includeVignette && (
                                <div className="absolute inset-0 pointer-events-none" style={{
                                  background: 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.6) 100%)'
                                }} />
                              )}
                              
                              {isGenerating ? (
                                <div className="flex flex-col items-center justify-center space-y-4">
                                  <div className="w-8 h-8 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                                  <div className="text-center">
                                    <div className="text-sm">Gerando...</div>
                                  </div>
                                </div>
                              ) : generatedContent ? (
                                <p 
                                  className="font-medium leading-relaxed whitespace-pre-line text-sm relative z-10"
                                  style={{
                                    textShadow: backgroundImage && includeBackground ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                                    color: backgroundImage && includeBackground ? '#ffffff' : (generatedContent?.textColor || '#f39c12')
                                  }}
                                >
                                  {generatedContent.text}
                                </p>
                              ) : (
                                <div className="text-center space-y-4 opacity-60">
                                  <div className="w-12 h-12 border-2 border-current/30 rounded-full flex items-center justify-center mx-auto">
                                    <div className="w-4 h-4 bg-current/50 rounded-full"></div>
                                  </div>
                                  <div>
                                    <div className="text-base mb-1">Preview</div>
                                    <div className="text-sm">Digite um tema acima</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {generatedContent && (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Fonte:</span> {generatedContent.fontFamily}
                          </div>
                        </div>
                      )}
                      
                      {/* Mobile Quick Themes - Only mobile */}
                      <div className="lg:hidden">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                          <h3 className="text-base font-semibold text-center text-gray-900 mb-4">Temas Rápidos</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {quickThemes.slice(0, 6).map((category, index) => (
                              <button
                                key={category}
                                onClick={() => {
                                  setTheme(category);
                                  setCurrentThemeIndex(index);
                                  setTimeout(() => generateStatus(), 100);
                                }}
                                disabled={isGenerating}
                                className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 text-gray-700"
                              >
                                {category}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
        
        <ToastContainer />
      </div>
    </div>
  );
}