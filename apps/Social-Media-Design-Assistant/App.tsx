import React, { useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ResultsDisplay } from './components/ResultsDisplay';
import { generateImage, determineAspectRatio, extractLogoColors } from './services/geminiService';
import type { StyleOption } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = useCallback(async (prompt: string, style: StyleOption, logo: File | null) => {
    if (!prompt) {
      setError("Por favor, insira uma descrição para o design.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      setLoadingStep('Analisando o prompt...');
      let logoColors: string[] | null = null;
      if (logo) {
        setLoadingStep('Extraindo cores do logo...');
        logoColors = await extractLogoColors(logo);
      }

      setLoadingStep('Definindo o formato ideal...');
      const aspectRatio = await determineAspectRatio(prompt);

      setLoadingStep('Criando seu design...');
      
      const imagePrompt = `Crie um design gráfico para redes sociais com base na descrição: "${prompt}". O estilo deve ser ${style}. ${logoColors ? `A paleta de cores deve ser inspirada nestas cores de marca: ${logoColors.join(', ')}.` : ''} O design deve ser limpo, profissional e com espaço para texto se aplicável.`;
      
      const imageData = await generateImage(imagePrompt, aspectRatio);
      
      const finalImage = `data:image/jpeg;base64,${imageData}`;
      setGeneratedImage(finalImage);

    } catch (e) {
      console.error(e);
      setError("Ocorreu um erro ao gerar o design. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <ControlPanel onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <ResultsDisplay
              isLoading={isLoading}
              loadingStep={loadingStep}
              error={error}
              generatedImage={generatedImage}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;