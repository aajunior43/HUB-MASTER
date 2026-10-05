import React, { useState } from 'react';
import { SearchIcon, SparklesIcon } from './Icons';

interface SearchBarProps {
  onSearch: (theme: string) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 mb-16 relative z-10">
      <form onSubmit={handleSubmit} className="relative flex flex-col md:flex-row gap-4">
        
        <div className="relative flex-grow">
          <div className="absolute inset-0 bg-black translate-x-2 translate-y-2"></div>
          <div className="relative bg-white border-4 border-black flex items-center p-0 h-16 w-full">
            <div className="pl-4 text-black border-r-4 border-black h-full flex items-center bg-brutal-yellow px-4">
              <SearchIcon className="w-6 h-6" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Digite um tema (ex: Cyberpunk...)"
              className="w-full h-full bg-white p-4 text-xl font-bold font-mono text-black placeholder-slate-500 outline-none uppercase"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`
            relative h-16 px-8 font-black text-lg uppercase tracking-wider transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            group outline-none
          `}
        >
           <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
           <div className={`
             absolute inset-0 border-4 border-black flex items-center justify-center gap-2
             transition-transform group-hover:-translate-y-1 group-hover:-translate-x-1 group-active:translate-x-0 group-active:translate-y-0
             ${isLoading ? 'bg-slate-200' : 'bg-brutal-green hover:bg-green-400'}
           `}>
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Gerar</span>
                <SparklesIcon className="w-6 h-6" />
              </>
            )}
           </div>
        </button>
      </form>
    </div>
  );
};
