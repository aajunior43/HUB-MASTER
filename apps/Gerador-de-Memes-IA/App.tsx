import React, { useState, useEffect } from 'react';
import MemeGenerator from './components/MemeGenerator';
import { LoadingIcon } from './components/icons';

const ApiKeyPrompt: React.FC<{ onSelectKey: () => void; error?: string | null }> = ({ onSelectKey, error }) => (
    <div className="flex flex-col items-center justify-center min-h-screen text-center text-white p-4">
        <div className="bg-gray-900/50 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm p-8 max-w-lg w-full">
            <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                Chave de API da Gemini Necessária
            </h2>
            <p className="mb-6 text-gray-300">
                Para usar o Gerador de Memes IA, você precisa selecionar uma chave de API da Gemini. 
                Isso permite que o aplicativo faça solicitações ao modelo Gemini em seu nome.
            </p>
            <p className="mb-6 text-gray-400 text-sm">
                Para mais informações sobre cobrança, visite a{' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    documentação de cobrança
                </a>.
            </p>
            {error && <p className="text-red-400 text-sm mb-4 animate-pulse">{error}</p>}
            <button
                onClick={onSelectKey}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-200"
            >
                Selecionar Chave de API
            </button>
        </div>
    </div>
);


const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
        try {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setHasApiKey(hasKey);
        } catch (e) {
            console.error("Could not check for API key", e);
            setHasApiKey(false);
        }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
        await (window as any).aistudio.openSelectKey();
        // Assume success due to potential race condition. If the key is bad,
        // the next API call will fail and bring the user back here.
        setHasApiKey(true);
        setApiKeyError(null);
    } catch (e) {
        console.error("Could not open API key dialog", e);
    }
  };

  const handleApiKeyError = () => {
    setHasApiKey(false);
    setApiKeyError('Sua chave de API é inválida ou não tem permissão. Por favor, selecione outra.');
  };

  if (hasApiKey === null) {
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
            <LoadingIcon />
            <p className="mt-4">Verificando a chave de API...</p>
        </div>
    );
  }

  if (!hasApiKey) {
    return <ApiKeyPrompt onSelectKey={handleSelectKey} error={apiKeyError} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <header className="w-full max-w-5xl text-center mb-6 md:mb-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
          Gerador de Memes IA
        </h1>
        <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
          Dê vida às suas imagens. Faça o upload, adicione seu texto ou deixe a IA da Gemini criar a legenda perfeita.
        </p>
      </header>
      <main className="w-full flex-grow flex justify-center items-start">
        <MemeGenerator onApiKeyError={handleApiKeyError} />
      </main>
      <footer className="w-full max-w-5xl text-center mt-12 text-gray-600 text-sm">
        <p>Criado com React, Tailwind CSS, e a magia da Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;
