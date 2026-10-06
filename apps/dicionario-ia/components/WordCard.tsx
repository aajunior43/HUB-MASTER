import React, { useState } from 'react';
import { DictionaryEntry } from '../types';
import { CopyIcon, CheckIcon } from './Icons';

interface WordCardProps {
  entry: DictionaryEntry;
  index: number;
}

export const WordCard: React.FC<WordCardProps> = ({ entry, index }) => {
  const [copiedWord, setCopiedWord] = useState(false);
  const [copiedDef, setCopiedDef] = useState(false);

  const copyToClipboard = async (text: string, isDefinition: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isDefinition) {
        setCopiedDef(true);
        setTimeout(() => setCopiedDef(false), 2000);
      } else {
        setCopiedWord(true);
        setTimeout(() => setCopiedWord(false), 2000);
      }
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  // Rotate colors for variety based on index
  const bgColors = ['bg-white', 'bg-brutal-blue', 'bg-brutal-purple', 'bg-white', 'bg-brutal-yellow'];
  const accentColor = bgColors[index % bgColors.length];

  return (
    <div className="break-inside-avoid mb-8 relative group">
      {/* Hard Shadow Background */}
      <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-all duration-200"></div>
      
      {/* Main Card Content */}
      <div className={`relative ${accentColor === 'bg-white' ? 'bg-white' : 'bg-white'} border-4 border-black p-6 flex flex-col h-full transition-transform duration-200 group-hover:-translate-y-1 group-hover:-translate-x-1`}>
        
        {/* Index Badge */}
        <div className="absolute -top-4 -right-4 bg-black text-white font-mono font-bold text-lg w-10 h-10 flex items-center justify-center border-2 border-white">
          {index + 1}
        </div>

        <div className="flex flex-col gap-2 mb-4 border-b-4 border-black pb-4">
           {entry.context && (
              <span className="self-start text-xs font-black uppercase tracking-widest px-2 py-1 bg-black text-white inline-block mb-1">
                {entry.context}
              </span>
            )}
            <h3 className="text-3xl font-black text-black uppercase break-words leading-none">
              {entry.word}
            </h3>
        </div>
          
        <div className="flex-grow mb-6">
          <p className="text-black font-mono text-sm leading-relaxed font-medium">
            {entry.definition}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-2 mt-auto">
          <button
            onClick={() => copyToClipboard(entry.word, false)}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-bold border-2 border-black bg-white hover:bg-black hover:text-white transition-colors px-2 py-2 uppercase"
            title="Copiar termo"
          >
            {copiedWord ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            <span>Termo</span>
          </button>
          
          <button
            onClick={() => copyToClipboard(entry.definition, true)}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-bold border-2 border-black bg-white hover:bg-black hover:text-white transition-colors px-2 py-2 uppercase"
            title="Copiar definição"
          >
            {copiedDef ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            <span>Definição</span>
          </button>
        </div>
      </div>
    </div>
  );
};
