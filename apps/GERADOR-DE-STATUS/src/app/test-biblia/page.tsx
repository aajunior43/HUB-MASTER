'use client';

import React, { useState } from 'react';
import { useGeminiService } from '@/services/geminiService';

export default function TestBiblia() {
  const [theme, setTheme] = useState('versículo de fé');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const geminiService = useGeminiService();

  const generateStatus = async () => {
    if (!theme.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const response = await geminiService.generateStatus({
        theme,
        style: 'modern',
        aspectRatio: '9:16',
        includeComplementaryPhrase: false,
      });
      
      setResult(response.generatedContent);
    } catch (error) {
      console.error('Erro ao gerar status:', error);
      // Fallback com versículo bíblico
      setResult({
        text: '"Porque eu sei os planos que tenho para vocês, diz o Senhor." ✨\nJeremias 29:11',
        backgroundColor: '#1a3c6c',
        textColor: '#fff8e1',
        fontSize: 20,
        fontFamily: 'Inter'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Teste de Temas Bíblicos</h1>
        
        <div className="mb-6">
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4"
            placeholder="Digite um tema bíblico..."
          />
          
          <button
            onClick={generateStatus}
            disabled={isGenerating}
            className="w-full py-3 px-6 bg-yellow-500 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-400 transition-colors"
          >
            {isGenerating ? 'Gerando...' : 'Gerar Status'}
          </button>
        </div>
        
        {result && (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-600">
            <h2 className="text-xl font-semibold mb-4">Resultado:</h2>
            <div className="mb-4">
              <p className="text-lg mb-2">{result.text}</p>
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-sm text-gray-400">Fundo:</span>
                  <div className="flex items-center">
                    <div 
                      className="w-6 h-6 rounded mr-2 border border-gray-600" 
                      style={{ backgroundColor: result.backgroundColor }}
                    ></div>
                    <span>{result.backgroundColor}</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Texto:</span>
                  <div className="flex items-center">
                    <div 
                      className="w-6 h-6 rounded mr-2 border border-gray-600" 
                      style={{ backgroundColor: result.textColor }}
                    ></div>
                    <span>{result.textColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}