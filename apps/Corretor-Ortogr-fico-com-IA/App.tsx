import React, { useState, useCallback } from 'react';
import { correctText } from './services/geminiService';

const MagicWandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25278V2.75C12 2.47386 12.2239 2.25 12.5 2.25C12.7761 2.25 13 2.47386 13 2.75V6.25278C13 6.52892 12.7761 6.75278 12.5 6.75278C12.2239 6.75278 12 6.52892 12 6.25278Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.7472 7V6.5C17.7472 6.22386 17.9711 6 18.2472 6C18.5233 6 18.7472 6.22386 18.7472 6.5V7C18.7472 7.27614 18.5233 7.5 18.2472 7.5C17.9711 7.5 17.7472 7.27614 17.7472 7Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.25278 7V6.5C6.25278 6.22386 6.02892 6 5.75278 6C5.47664 6 5.25278 6.22386 5.25278 6.5V7C5.25278 7.27614 5.47664 7.5 5.75278 7.5C6.02892 7.5 6.25278 7.27614 6.25278 7Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.25 12.5C21.25 12.2239 21.0261 12 20.75 12H17.2472C16.9711 12 16.7472 12.2239 16.7472 12.5C16.7472 12.7761 16.9711 13 17.2472 13H20.75C21.0261 13 21.25 12.7761 21.25 12.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.75278 12.5C7.75278 12.2239 7.52892 12 7.25278 12H3.75C3.47386 12 3.25 12.2239 3.25 12.5C3.25 12.7761 3.47386 13 3.75 13H7.25278C7.52892 13 7.75278 12.7761 7.75278 12.5Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M8.25166 16.7483C8.25166 14.4533 10.155 12.55 12.45 12.55C14.745 12.55 16.6483 14.4533 16.6483 16.7483C16.6483 19.0433 14.745 20.9467 12.45 20.9467C10.155 20.9467 8.25166 19.0433 8.25166 16.7483ZM12.45 13.55C10.7117 13.55 9.25166 14.965 9.25166 16.7483C9.25166 18.5317 10.7117 20.035 12.45 20.035C14.1883 20.035 15.6483 18.5317 15.6483 16.7483C15.6483 14.965 14.1883 13.55 12.45 13.55Z" />
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function App() {
  const [inputText, setInputText] = useState<string>('');
  const [correctedText, setCorrectedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string>('');

  const handleCorrectText = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Por favor, insira algum texto para corrigir.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setCorrectedText('');
    setCopySuccess('');

    try {
      const result = await correctText(inputText);
      setCorrectedText(result);
    } catch (err) {
      setError('Ocorreu um erro ao contatar a IA. Por favor, tente novamente mais tarde.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [inputText]);

  const handleCopyText = useCallback(() => {
    if (!correctedText) return;
    navigator.clipboard.writeText(correctedText).then(() => {
      setCopySuccess('Texto copiado para a área de transferência!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Falha ao copiar o texto.');
    });
  }, [correctedText]);
  
  const handleClearText = useCallback(() => {
    setInputText('');
    setCorrectedText('');
    setError(null);
    setCopySuccess('');
  }, []);

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-8 font-sans">
      <header className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Corretor Ortográfico com IA
        </h1>
        <p className="text-lg text-gray-400 mt-2">
          Digite seu texto, e a IA fará a mágica da correção e pontuação.
        </p>
      </header>
      
      <main className="w-full max-w-6xl flex flex-col items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Text Area */}
          <div className="flex flex-col">
            <label htmlFor="input-text" className="mb-2 font-semibold text-gray-300">
              Seu Texto
            </label>
            <textarea
              id="input-text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite ou cole seu texto aqui..."
              className="flex-grow bg-gray-800 border border-gray-700 rounded-lg p-4 w-full h-64 md:h-96 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300"
              disabled={isLoading}
            />
            <div className="text-right text-sm text-gray-400 mt-2 px-1">
                <span>
                    {inputText.length > 0 ? countWords(inputText) : 0} palavras / {inputText.length} caracteres
                </span>
            </div>
          </div>

          {/* Corrected Text Area */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="corrected-text" className="font-semibold text-gray-300">
                Texto Corrigido
              </label>
              <button 
                onClick={handleCopyText}
                className="flex items-center px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!correctedText || isLoading}
                title="Copiar texto corrigido"
              >
                <CopyIcon />
                <span className="ml-2">Copiar</span>
              </button>
            </div>
             <div
              id="corrected-text"
              className="flex-grow bg-gray-800 border border-gray-700 rounded-lg p-4 w-full h-64 md:h-96 overflow-y-auto whitespace-pre-wrap text-white"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <SpinnerIcon />
                        <span className="ml-3">Corrigindo...</span>
                    </div>
                ) : (
                    correctedText || <span className="text-gray-400">Aguardando correção...</span>
                )}
            </div>
             <div className="flex justify-between items-center mt-2 px-1 h-5">
                {copySuccess && <p className="text-sm text-green-400">{copySuccess}</p>}
                {correctedText && !isLoading && (
                    <span className="text-right text-sm text-gray-400 ml-auto">
                        {countWords(correctedText)} palavras / {correctedText.length} caracteres
                    </span>
                )}
            </div>
          </div>
        </div>

        <div className="my-8 flex flex-col items-center">
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleCorrectText}
                    disabled={isLoading || !inputText}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
                >
                    {isLoading ? <SpinnerIcon /> : <MagicWandIcon />}
                    <span>{isLoading ? 'Corrigindo...' : 'Corrigir Texto'}</span>
                </button>
                <button 
                    onClick={handleClearText}
                    disabled={isLoading || (!inputText && !correctedText)}
                    className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500"
                >
                    <ClearIcon />
                    <span>Limpar</span>
                </button>
            </div>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      </main>
    </div>
  );
}