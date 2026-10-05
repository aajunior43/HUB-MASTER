'use client';

import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';

interface GeneratedContent {
  text: string;
  backgroundColor: string;
  textColor: string;
}

const PromptDemo: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const demoThemes = [
    'motivação',
    'sucesso',
    'amor',
    'gratidão',
    'determinação',
    'felicidade'
  ];

  const generateDemoStatus = async (theme: string) => {
    setIsGenerating(true);
    try {
      const prompt = `Tema: ${theme} - Encontre uma citação famosa em português brasileiro relacionada ao tema com o autor entre parênteses.`;
      
      const result = await geminiService.generateStatus({ theme });
      setGeneratedContent(result.generatedContent);
    } catch (error) {
      console.error('Erro ao gerar status:', error);
      // Fallback para demonstração com citações famosas
      const fallbackQuotes: Record<string, any> = {
        'motivação': {
          text: '"O sucesso é ir de fracasso em fracasso sem perder o entusiasmo." 🌟\n(Winston Churchill)',
          backgroundColor: '#1e3a8a',
          textColor: '#dbeafe'
        },
        'sucesso': {
          text: '"O único lugar onde o sucesso vem antes do trabalho é no dicionário." 💪\n(Vidal Sassoon)',
          backgroundColor: '#1a535c',
          textColor: '#f7fff7'
        },
        'amor': {
          text: '"Ser profundamente amado por alguém dá-lhe força, enquanto amar alguém profundamente dá-lhe coragem." ❤️\n(Lao Tzu)',
          backgroundColor: '#8e1e3d',
          textColor: '#ffebf0'
        },
        'gratidão': {
          text: '"A gratidão não é apenas a maior das virtudes, mas a mãe de todas as outras." 🙏\n(Cícero)',
          backgroundColor: '#27ae60',
          textColor: '#f8f9f9'
        },
        'determinação': {
          text: '"A determinação de hoje leva ao sucesso de amanhã." ✨\n(Napoleão Bonaparte)',
          backgroundColor: '#4a235a',
          textColor: '#f9e79f'
        },
        'felicidade': {
          text: '"A felicidade não é algo pronto. Ela vem de suas próprias ações." 😊\n(Dalai Lama)',
          backgroundColor: '#f39c12',
          textColor: '#2c3e50'
        }
      };
      
      setGeneratedContent(fallbackQuotes[theme] || {
        text: `"A vida é o que acontece enquanto você está ocupado fazendo outros planos." 🌟\n(John Lennon)`,
        backgroundColor: '#1e3a8a',
        textColor: '#dbeafe'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Demonstração de Prompt Melhorado
          </h1>
          <p className="text-gray-300 text-lg">
            Veja como o novo prompt cria status mais concisos e impactantes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna esquerda - Controles */}
          <div className="space-y-6">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h2 className="text-2xl font-bold mb-4 text-white">Temas de Exemplo</h2>
              <p className="text-gray-300 mb-6">
                Clique em um dos temas abaixo para ver como o novo prompt gera status mais eficazes:
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {demoThemes.map((demoTheme) => (
                  <button
                    key={demoTheme}
                    onClick={() => generateDemoStatus(demoTheme)}
                    disabled={isGenerating}
                    className="px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded-lg text-gray-200 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoTheme.charAt(0).toUpperCase() + demoTheme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-bold mb-3 text-white flex items-center">
                <span className="mr-2">✨</span>
                Melhorias Implementadas
              </h3>
              <ul className="text-gray-300 space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>Frase principal mais concisa (máximo 120 caracteres)</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>Uso estratégico de emojis (máximo 2)</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>Estrutura padronizada com cores</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>Remoção de frases complementares</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Coluna direita - Preview */}
          <div className="space-y-6">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h2 className="text-2xl font-bold mb-4 text-white">Preview do Status</h2>
              
              {isGenerating ? (
                <div className="aspect-[9/16] bg-gray-800/50 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-gray-300">Gerando status...</p>
                  </div>
                </div>
              ) : generatedContent ? (
                <div 
                  className="aspect-[9/16] rounded-xl flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
                  style={{ 
                    backgroundColor: generatedContent.backgroundColor,
                    color: generatedContent.textColor
                  }}
                >
                  {/* Efeitos decorativos */}
                  <div className="absolute top-4 left-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                  <div className="absolute bottom-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                  
                  {/* Texto do status */}
                  <div className="relative z-10">
                    <p className="text-2xl font-bold leading-tight whitespace-pre-line">
                      {generatedContent.text.split('\n')[0]}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="aspect-[9/16] bg-gray-800/50 rounded-xl flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">Clique em um tema para gerar um status</p>
                  </div>
                </div>
              )}
            </div>

            {generatedContent && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-bold mb-3 text-white">Detalhes do Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Caracteres:</span>
                    <span className="text-white">{generatedContent.text.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Emojis:</span>
                    <span className="text-white">{(generatedContent.text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cor de fundo:</span>
                    <span className="text-white">{generatedContent.backgroundColor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cor do texto:</span>
                    <span className="text-white">{generatedContent.textColor}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptDemo;