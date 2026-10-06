import React, { useState } from 'react';
import type { StyleOption } from '../types';
import { VISUAL_STYLES } from '../constants';

interface ControlPanelProps {
  onGenerate: (prompt: string, style: StyleOption, logo: File | null) => void;
  isLoading: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerate, isLoading }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [style, setStyle] = useState<StyleOption>('corporativo');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoName, setLogoName] = useState<string>('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
      setLogoName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(prompt, style, logo);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg sticky top-24">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            1. Descreva seu design
          </label>
          <textarea
            id="description"
            rows={6}
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-white focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Ex: Um post para uma cafeteria anunciando um novo café especial..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="style" className="block text-sm font-medium text-gray-300 mb-2">
            2. Escolha um estilo visual
          </label>
          <select
            id="style"
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-white focus:ring-blue-500 focus:border-blue-500 transition"
            value={style}
            onChange={(e) => setStyle(e.target.value as StyleOption)}
          >
            {VISUAL_STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            3. Integrar Cores do Logo (opcional)
          </label>
          <label htmlFor="logo-upload" className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:border-blue-500 transition bg-gray-700 hover:bg-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-sm text-gray-300 truncate">{logoName || "Clique para carregar"}</span>
          </label>
          <input id="logo-upload" type="file" className="hidden" onChange={handleLogoChange} accept="image/png, image/jpeg" />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando...
            </>
          ) : 'Gerar Design'}
        </button>
      </form>
    </div>
  );
};