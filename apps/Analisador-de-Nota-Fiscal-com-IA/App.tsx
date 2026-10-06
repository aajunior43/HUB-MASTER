import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisResult as AnalysisResultComponent } from './components/AnalysisResult';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { ArrowPathIcon } from './components/icons/ArrowPathIcon';
import { analyzeInvoice } from './services/geminiService';
import { AnalysisResult, HistoryItem, AnalysisDecision } from './types';

type FileStatus = 'analyzing' | 'success' | 'error';
type AppStatus = 'idle' | 'analyzing' | 'finished';

interface FileAnalysisState {
  status: FileStatus;
  result: AnalysisResult | null;
  error: string | null;
}

const HISTORY_KEY = 'invoiceAnalysisHistory';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [appStatus, setAppStatus] = useState<AppStatus>('idle');
  const [analysisStates, setAnalysisStates] = useState<Map<string, FileAnalysisState>>(new Map());
  const [fileUploadKey, setFileUploadKey] = useState(Date.now());
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load or parse history from localStorage", error);
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  const handleFileChange = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    if (appStatus === 'finished') {
      setAppStatus('idle');
      setAnalysisStates(new Map());
    }
  }, [appStatus]);

  const runAnalysisForFile = async (file: File) => {
    try {
      const analysisResult = await analyzeInvoice(file);
      setAnalysisStates(prev => new Map(prev).set(file.name, { status: 'success', result: analysisResult, error: null }));
      
      const newHistoryItem: HistoryItem = {
          fileName: file.name,
          timestamp: new Date().toISOString(),
          result: analysisResult,
      };
      setHistory(prevHistory => {
          const updatedHistory = [newHistoryItem, ...prevHistory];
          try {
              localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
          } catch (error) {
              console.error("Failed to save history to localStorage", error);
          }
          return updatedHistory;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setAnalysisStates(prev => new Map(prev).set(file.name, { status: 'error', result: null, error: `Falha na análise: ${errorMessage}`}));
    }
  };

  const handleAnalyzeClick = async () => {
    if (files.length === 0) return;

    setAppStatus('analyzing');
    
    const initialStates = new Map<string, FileAnalysisState>();
    files.forEach(file => {
        initialStates.set(file.name, { status: 'analyzing', result: null, error: null });
    });
    setAnalysisStates(initialStates);
    
    // Run all analyses in parallel for better performance
    await Promise.all(files.map(file => runAnalysisForFile(file)));
    
    setAppStatus('finished');
  };

  const handleRetryAnalysis = async (fileToRetry: File) => {
    setAppStatus('analyzing');
    setAnalysisStates(prev => new Map(prev).set(fileToRetry.name, { status: 'analyzing', result: null, error: null }));
    await runAnalysisForFile(fileToRetry);
    setAppStatus('finished');
  };
  
  const handleReset = () => {
      setFiles([]);
      setAppStatus('idle');
      setAnalysisStates(new Map());
      setFileUploadKey(Date.now());
  };

  const handleClearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const renderContent = () => {
    if (appStatus === 'idle') {
      return <FileUpload key={fileUploadKey} onFileChange={handleFileChange} disabled={appStatus === 'analyzing'} />;
    }

    return (
      <div className="w-full max-h-[60vh] overflow-y-auto space-y-4 pr-2">
        {files.map((file, index) => {
          const state = analysisStates.get(file.name);
          return (
            <div key={`${file.name}-${index}`} className="bg-gray-900/40 p-4 rounded-lg animate-fade-in">
              <p className="font-semibold text-white truncate mb-3">{file.name}</p>
              {state?.status === 'analyzing' && (
                <div className="flex items-center gap-3 text-white">
                  <SpinnerIcon className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Analisando...</span>
                </div>
              )}
              {state?.status === 'success' && state.result && (
                <AnalysisResultComponent result={state.result} />
              )}
              {state?.status === 'error' && (
                <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-red-400">Erro na Análise</h3>
                      <p className="mt-2 text-gray-300 text-sm">{state.error}</p>
                    </div>
                    <button
                      onClick={() => handleRetryAnalysis(file)}
                      disabled={isAnalyzing}
                      className="flex-shrink-0 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold rounded-md shadow-sm transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      aria-label={`Tentar novamente a análise para ${file.name}`}
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const isAnalyzing = appStatus === 'analyzing';

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-900 text-white">
      <div className="w-full max-w-2xl mx-auto my-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Analisador de Nota Fiscal
          </h1>
          <p className="text-gray-400 mt-2">
            Use o poder da IA do Gemini para validar seus documentos fiscais.
          </p>
        </header>

        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl shadow-indigo-900/20 p-6 md:p-8 min-h-[250px] flex flex-col justify-center items-center">
          {renderContent()}
        </div>
        
        <footer className="mt-8 flex justify-center gap-4">
            {(appStatus === 'finished' || isAnalyzing) && (
                <button
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? 'Analisando...' : 'Analisar Novos Documentos'}
                </button>
            )}

            {appStatus === 'idle' && files.length > 0 && (
                 <button
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzing}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:scale-105"
                >
                    Analisar {files.length} {files.length > 1 ? 'Notas Fiscais' : 'Nota Fiscal'}
                </button>
            )}
        </footer>
        
        {history.length > 0 && (appStatus === 'idle' || appStatus === 'finished') && (
          <section className="mt-12 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-300">Histórico de Análises</h2>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
              >
                Limpar Histórico
              </button>
            </div>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {history.map((item) => (
                <details key={`${item.fileName}-${item.timestamp}`} className="bg-gray-800 border border-gray-700 rounded-lg open:shadow-lg open:shadow-indigo-900/20 transition-shadow">
                  <summary className="p-4 cursor-pointer list-none flex justify-between items-center font-semibold text-white">
                    <div className="flex flex-col min-w-0 mr-4">
                      <span className="truncate">{item.fileName}</span>
                      <span className="text-xs text-gray-400 font-normal">
                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                      item.result.status === AnalysisDecision.DEFERIDO ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {item.result.status}
                    </span>
                  </summary>
                  <div className="p-4 border-t border-gray-700">
                    <AnalysisResultComponent result={item.result} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}