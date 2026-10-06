
import { useState } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { ColorPalette, Color } from '@/components/ColorPalette';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { GeminiService } from '@/services/geminiService';
import { toast } from 'sonner';

const Index = () => {
  const [colors, setColors] = useState<Color[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [imageName, setImageName] = useState('');

  const handleImageSelect = async (imageSource: File | string, name: string, colorCount: number) => {
    if (!apiKey) {
      toast.error('Configure sua API Key do Gemini primeiro');
      return;
    }

    setIsProcessing(true);
    setImageName(name);
    
    try {
      const geminiService = new GeminiService(apiKey);
      const extractedColors = await geminiService.extractColorPalette(imageSource, colorCount);
      setColors(extractedColors);
      toast.success(`${extractedColors.length} cores extraídas com sucesso!`);
    } catch (error) {
      console.error('Erro ao extrair cores:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar imagem');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Analisador de Paleta IA
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Extraia cores dominantes de qualquer imagem usando inteligência artificial do Google Gemini
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-12">
          <ApiKeyInput onApiKeySet={setApiKey} />
          
          {apiKey && (
            <ImageUpload 
              onImageSelect={handleImageSelect} 
              isProcessing={isProcessing} 
            />
          )}
          
          {colors.length > 0 && (
            <ColorPalette colors={colors} imageName={imageName} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
