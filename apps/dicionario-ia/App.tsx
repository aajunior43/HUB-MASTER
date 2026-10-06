import React, { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { WordCard } from './components/WordCard';
import { BookIcon, DownloadIcon } from './components/Icons';
import { generateVocabularyList } from './services/geminiService';
import { generatePDF } from './services/pdfService';
import { GenerationState } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    data: null,
    searchedTheme: '',
  });

  const handleSearch = async (theme: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, searchedTheme: theme }));
    
    try {
      const data = await generateVocabularyList(theme);
      setState({
        isLoading: false,
        error: null,
        data,
        searchedTheme: theme,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "ERRO AO GERAR DICIONÁRIO. TENTE NOVAMENTE.",
      }));
    }
  };

  const handleDownload = () => {
    if (state.data && state.searchedTheme) {
      generatePDF(state.searchedTheme, state.data);
    }
  };

  return (
    <div className="min-h-screen bg-brutal-bg text-black font-sans selection:bg-brutal-yellow selection:text-black">
      
      {/* Header Section */}
      <header className="bg-white border-b-4 border-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-2 border-transparent group-hover:bg-white group-hover:text-black group-hover:border-black transition-colors shadow-brutal-sm">
              <BookIcon className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic transform -skew-x-12">
              SUPER <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600" style={{WebkitTextStroke: '1px black', color: 'transparent'}}>DICIONÁRIO</span>
            </h1>
          </div>
          <div className="font-mono text-xs font-bold bg-brutal-yellow border-2 border-black px-3 py-1 shadow-brutal-sm hidden sm:block uppercase">
            Powered by Gemini
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Hero / Search Section */}
        <div className="flex flex-col items-center justify-center mb-16">
          <div className="bg-white border-4 border-black p-6 shadow-brutal-lg mb-8 max-w-4xl w-full transform rotate-1 hover:rotate-0 transition-transform duration-300">
            <h2 className="text-5xl md:text-7xl font-black text-center text-black mb-2 uppercase leading-[0.9]">
              VOCABULÁRIO <br/>
              <span className="bg-brutal-green px-2 text-black">ILIMITADO</span>
            </h2>
          </div>
          
          <p className="text-xl font-mono font-bold text-center max-w-2xl bg-white border-2 border-black p-2 shadow-brutal-sm mb-4">
            DIGITE UM TEMA. RECEBA 50 TERMOS. SEM FRESCURA.
          </p>

          <SearchBar onSearch={handleSearch} isLoading={state.isLoading} />
        </div>

        {/* Results Section */}
        {state.error && (
          <div className="max-w-2xl mx-auto p-6 bg-red-100 border-4 border-red-600 text-center text-red-600 font-bold uppercase shadow-brutal">
            <p>{state.error}</p>
          </div>
        )}

        {state.isLoading && (
          <div className="max-w-4xl mx-auto text-center py-20 bg-white border-4 border-black shadow-brutal-lg">
            <div className="inline-block relative mb-6">
               <div className="w-20 h-20 bg-brutal-yellow border-4 border-black animate-spin"></div>
            </div>
            <p className="text-3xl font-black uppercase italic">
              PROCESSANDO "{state.searchedTheme}"...
            </p>
            <p className="font-mono font-bold mt-4 animate-pulse">AGUARDE...</p>
          </div>
        )}

        {!state.isLoading && state.data && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 border-b-4 border-black pb-6 gap-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <h3 className="text-4xl font-black uppercase italic bg-white inline-block px-4 py-1 border-2 border-black shadow-brutal-sm transform -rotate-1">
                  {state.searchedTheme}
                </h3>
                <span className="bg-black text-white px-4 py-2 font-mono font-bold text-lg border-2 border-black shadow-brutal-sm">
                  {state.data.vocabulary.length} TERMOS
                </span>
              </div>

              <button 
                onClick={handleDownload}
                className="group relative flex items-center gap-2 bg-white px-6 py-3 font-bold font-mono uppercase text-sm border-4 border-black shadow-brutal hover:bg-brutal-purple hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap"
              >
                <span>Baixar PDF</span>
                <DownloadIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
              {state.data.vocabulary.map((entry, index) => (
                <WordCard 
                  key={`${entry.word}-${index}`} 
                  entry={entry} 
                  index={index}
                />
              ))}
            </div>
            
            {/* Related Themes Section */}
            <div className="mt-24 pt-12 border-t-8 border-black border-dashed">
              <h3 className="text-3xl font-black uppercase text-center mb-8 italic">
                CONTINUE EXPLORANDO
              </h3>
              
              <div className="flex flex-wrap justify-center gap-6">
                {state.data.relatedThemes.map((theme, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(theme)}
                    className="group relative bg-white"
                  >
                    <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
                    <div className="relative border-4 border-black px-6 py-4 text-xl font-bold font-mono uppercase bg-white hover:bg-brutal-yellow transition-colors group-hover:-translate-y-1 group-hover:-translate-x-1 group-active:translate-x-0 group-active:translate-y-0">
                      {theme} ->
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-20 text-center">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-black text-white font-black uppercase text-xl px-8 py-4 border-4 border-transparent hover:bg-white hover:text-black hover:border-black transition-all"
              >
                Voltar ao topo
              </button>
            </div>
          </div>
        )}

        {!state.isLoading && !state.data && !state.error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto opacity-30">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 border-4 border-black bg-slate-200 border-dashed"></div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
