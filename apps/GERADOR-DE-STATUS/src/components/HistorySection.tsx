'use client';

import React, { useState, useEffect } from 'react';
import { History, Trash2, Download, Share2 } from 'lucide-react';

interface HistoryItem {
  generatedContent: {
    text: string;
    backgroundColor: string;
    textColor: string;
  };
  metadata: {
    timestamp: number;
    prompt: string;
  };
}

const HistorySection: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('statusai_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('statusai_history');
  };

  const reuseStatus = (status: HistoryItem) => {
    // Esta função seria implementada para passar o status de volta ao creator
    console.log('Reutilizando status:', status);
    // Aqui você pode adicionar a lógica para preencher o creator com este status
  };

  return (
    <section className="py-16 bg-gradient-to-b from-black via-gray-dark to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white-pure mb-4">
            Seu <span className="text-gradient">Histórico</span> de Criações
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Acesse seus status criados anteriormente e reutilize quando quiser
          </p>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white-pure mb-2">Nenhum status criado ainda</h3>
            <p className="text-gray-400 mb-6">Comece criando seu primeiro status incrível</p>
            <a 
              href="#creator-section" 
              className="btn-primary inline-flex items-center space-x-2"
            >
              <span>Criar Status</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-400">
                {history.length} {history.length === 1 ? 'status' : 'status'} no histórico
              </p>
              <button
                onClick={clearHistory}
                className="px-4 py-2 bg-gray-800/50 border border-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all duration-300 text-sm"
              >
                Limpar Histórico
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((item, index) => (
                <div 
                  key={index}
                  className="glass-effect rounded-xl overflow-hidden border border-gray-700/50 hover:border-gold-luxury/30 transition-all duration-300"
                >
                  <div 
                    className="h-48 flex items-center justify-center p-4 relative"
                    style={{ 
                      backgroundColor: item.generatedContent?.backgroundColor || '#1e3a8a',
                      color: item.generatedContent?.textColor || '#dbeafe'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                    <p className="text-lg font-medium text-center z-10 leading-tight">
                      {item.generatedContent?.text.split('\n')[0] || 'Status'}
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-gray-400">
                        {new Date(item.metadata?.timestamp || Date.now()).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => reuseStatus(item)}
                          className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition-colors"
                          title="Reutilizar"
                        >
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            // Função para download
                            console.log('Download:', item);
                          }}
                          className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition-colors"
                          title="Download"
                        >
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      Tema: {item.metadata?.prompt?.split('Tema: ')[1]?.split(' - ')[0] || 'Não especificado'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HistorySection;