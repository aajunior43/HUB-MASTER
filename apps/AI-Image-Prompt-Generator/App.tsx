import React, { useState, useEffect } from 'react';
import { PromptState } from './types';
import { generateCreativePrompt, improveAndTranslatePrompt, generateImage } from './services/geminiService';
import { CopyIcon, ClearIcon, SparklesIcon, CheckIcon, ImageIcon, SquareIcon, LandscapeIcon, PortraitIcon } from './components/Icons';

const INITIAL_STATE: PromptState = {
  subject: '',
};

type AspectRatio = '1:1' | '16:9' | '9:16';

const App: React.FC = () => {
  const [promptState, setPromptState] = useState<PromptState>(INITIAL_STATE);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  useEffect(() => {
    setGeneratedPrompt(promptState.subject);
  }, [promptState]);

  const handleSurpriseMe = async () => {
    setIsGenerating(true);
    setGeneratedImage(null);
    setImageError(null);
    const creativePrompt = await generateCreativePrompt();
    setPromptState({ subject: creativePrompt });
    setIsGenerating(false);
  };
  
  const handleImprovePrompt = async () => {
    if (!promptState.subject.trim()) return;

    setIsImproving(true);
    const improvedPrompt = await improveAndTranslatePrompt(promptState.subject);
    
    if (!improvedPrompt.startsWith('Error:')) {
      setPromptState({ subject: improvedPrompt });
    } else {
      console.error("Failed to improve prompt:", improvedPrompt);
    }
    setIsImproving(false);
  };

  const handleGenerateImage = async () => {
    if (!generatedPrompt || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setImageError(null);

    const result = await generateImage(generatedPrompt, aspectRatio);

    if (result) {
      setGeneratedImage(result);
    } else {
      setImageError("Falha ao gerar a imagem. Por favor, tente novamente.");
    }
    setIsGeneratingImage(false);
  }

  const handleCopyToClipboard = () => {
    if(generatedPrompt && !copySuccess) {
      navigator.clipboard.writeText(generatedPrompt).then(() => {
        setCopySuccess('Copiado!');
        setTimeout(() => setCopySuccess(''), 2000);
      }, () => {
        setCopySuccess('Falha ao copiar');
        setTimeout(() => setCopySuccess(''), 2000);
      });
    }
  };
  
  const handleClearAll = () => {
    setPromptState(INITIAL_STATE);
    setGeneratedImage(null);
    setImageError(null);
  };

  return (
    <div className="min-h-screen text-brand-text p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-brand-light title-gradient">
            Gerador de Prompt para Imagem AI
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-3xl mx-auto">
            Descreva sua ideia em poucas palavras, e nossa IA irá transformá-la em um prompt detalhado e artístico. Você também pode usar o "Surpreenda-me" para inspiração instantânea.
          </p>
        </header>

        <main className="space-y-8">
          
          <div className="glass-panel p-5 rounded-xl shadow-lg">
            <label htmlFor="subject-input" className="text-lg font-semibold text-brand-light mb-3 block">
              Descreva sua ideia (em português ou inglês)
            </label>
            <div className="relative">
              <textarea
                id="subject-input"
                rows={4}
                value={promptState.subject}
                onChange={(e) => setPromptState({ ...promptState, subject: e.target.value })}
                placeholder="Ex: Uma raposa astronauta explorando uma floresta alienígena bioluminescente"
                className="w-full bg-brand-primary/50 border-2 border-gray-700/80 rounded-lg p-3 text-brand-light focus:ring-2 focus:ring-brand-accent focus:border-transparent transition placeholder-gray-500 resize-none"
              />
              <button
                onClick={handleImprovePrompt}
                disabled={isImproving || !promptState.subject.trim()}
                className="absolute bottom-3 right-3 flex items-center justify-center gap-1.5 bg-brand-accent text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm btn-glow-accent transform hover:scale-105"
                title="Melhorar e traduzir a ideia para um prompt detalhado em inglês usando IA"
              >
                <SparklesIcon className="w-4 h-4" />
                {isImproving ? 'Melhorando...' : 'Melhorar com IA'}
              </button>
            </div>
          </div>
          
          <div className="glass-panel p-5 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-brand-light">Seu Prompt Final</h3>
              <button
                onClick={handleCopyToClipboard}
                disabled={!generatedPrompt || isGenerating || !!copySuccess}
                className="flex items-center gap-2 bg-brand-primary/50 text-brand-text px-3 py-1.5 rounded-lg hover:bg-brand-accent hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copiar Prompt"
              >
                {copySuccess ? 
                  <><CheckIcon className="w-4 h-4 text-green-400" /> {copySuccess}</> : 
                  <><CopyIcon className="w-4 h-4" /> Copiar</>
                }
              </button>
            </div>
            <div className="w-full min-h-[8rem] bg-brand-primary/50 border border-gray-700/50 rounded-lg p-4 text-brand-text overflow-y-auto">
                {isGenerating && !generatedPrompt ? (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="italic text-gray-400 animate-pulse">Gerando prompt criativo com Gemini...</p>
                </div>
              ) : generatedPrompt ? (
                <p className="whitespace-pre-wrap text-brand-light">{generatedPrompt}</p>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="italic text-gray-400">Seu prompt aprimorado aparecerá aqui.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
                onClick={handleGenerateImage}
                disabled={!generatedPrompt || isGeneratingImage}
                className="flex items-center justify-center gap-2 w-full bg-brand-accent text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 btn-glow-accent"
            >
                <ImageIcon />
                {isGeneratingImage ? 'Gerando Imagem...' : 'Gerar Imagem'}
            </button>
            <button 
              onClick={handleSurpriseMe} 
              disabled={isGenerating || isGeneratingImage}
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 btn-glow-primary">
              <SparklesIcon />
              Surpreenda-me
            </button>
            <button 
              onClick={handleClearAll}
              className="flex items-center justify-center gap-2 w-full bg-red-600/80 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 btn-glow-danger">
              <ClearIcon />
              Limpar Tudo
            </button>
          </div>

          <div className="glass-panel p-5 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-brand-light mb-4">Proporção da Imagem</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {(['1:1', '16:9', '9:16'] as const).map((id) => {
                  const isSelected = aspectRatio === id;
                  const baseClasses = "flex items-center justify-center gap-2 w-full sm:w-auto flex-1 px-4 py-3 text-sm font-semibold rounded-lg shadow-sm focus:outline-none transition-all duration-200 transform hover:scale-105 focus-ring-brand";
                  const selectedClasses = "bg-brand-accent text-white shadow-lg shadow-brand-accent/30";
                  const unselectedClasses = "bg-brand-secondary text-brand-text hover:bg-gray-600";
                  
                  const icons: Record<AspectRatio, { icon: React.ReactElement, label: string }> = {
                    '1:1': { icon: <SquareIcon />, label: 'Quadrado' },
                    '16:9': { icon: <LandscapeIcon />, label: 'Paisagem' },
                    '9:16': { icon: <PortraitIcon />, label: 'Retrato' },
                  };

                  return (
                    <button
                      key={id}
                      type="button"
                      className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
                      onClick={() => setAspectRatio(id)}
                    >
                      {React.cloneElement(icons[id].icon, { className: 'w-5 h-5' })}
                      <span>{icons[id].label} ({id})</span>
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-brand-light mb-4">Imagem Gerada</h3>
            <div className="aspect-square w-full bg-brand-primary/50 border border-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden">
              {isGeneratingImage ? (
                <div className="text-center p-4">
                  <p className="italic text-gray-400 animate-pulse">Gerando sua imagem com IA...</p>
                  <p className="text-xs text-gray-500 mt-2">Isso pode levar alguns instantes.</p>
                </div>
              ) : imageError ? (
                  <p className="text-center p-4 text-red-400">{imageError}</p>
              ) : generatedImage ? (
                <img src={generatedImage} alt="AI generated image" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-12 h-12 mx-auto text-gray-600" />
                  <p className="italic text-gray-400 mt-2">Sua imagem gerada aparecerá aqui.</p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;