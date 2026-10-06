'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Trash2, Download, Share2 } from 'lucide-react';

interface FavoriteItem {
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

const FavoritesSection: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('statusai_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const removeFavorite = (index: number) => {
    const newFavorites = favorites.filter((_, i) => i !== index);
    setFavorites(newFavorites);
    localStorage.setItem('statusai_favorites', JSON.stringify(newFavorites));
  };

  const clearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem('statusai_favorites');
  };

  const reuseStatus = (status: FavoriteItem) => {
    // Esta função seria implementada para passar o status de volta ao creator
    console.log('Reutilizando status:', status);
    // Aqui você pode adicionar a lógica para preencher o creator com este status
  };

  return (
    <section className="py-16 bg-gradient-to-b from-black via-gray-dark to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white-pure mb-4">
            Seus <span className="text-gradient">Favoritos</span>
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Acesse seus status favoritos e reutilize quando quiser
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white-pure mb-2">Nenhum favorito adicionado ainda</h3>
            <p className="text-gray-400 mb-6">Crie status e marque-os como favoritos para encontrá-los aqui</p>
            <a 
              href="/#creator-section" 
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
                {favorites.length} {favorites.length === 1 ? 'favorito' : 'favoritos'}
              </p>
              <button
                onClick={clearFavorites}
                className="px-4 py-2 bg-gray-800/50 border border-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all duration-300 text-sm"
              >
                Limpar Favoritos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((item, index) => (
                <div 
                  key={index}
                  className="glass-effect rounded-xl overflow-hidden border border-gray-700/50 hover:border-gold-luxury/30 transition-all duration-300 relative"
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
                          onClick={() => removeFavorite(index)}
                          className="p-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition-colors"
                          title="Remover dos favoritos"
                        >
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      Tema: {item.metadata?.prompt?.split('Tema: ')[1]?.split(' - ')[0] || 'Não especificado'}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 bg-gold-luxury rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black-deep" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
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

export default FavoritesSection;