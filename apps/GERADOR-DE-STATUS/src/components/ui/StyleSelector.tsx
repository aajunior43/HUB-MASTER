'use client';

import React from 'react';

const StyleSelector = ({ selectedStyle, onStyleChange }: { selectedStyle: string; onStyleChange: (style: string) => void }) => {
  const styles = [
    { id: 'modern', name: 'Moderno', emoji: '✨' },
    { id: 'elegant', name: 'Elegante', emoji: '💎' },
    { id: 'minimalist', name: 'Minimalista', emoji: '⚪' },
    { id: 'vibrant', name: 'Vibrante', emoji: '🌈' },
    { id: 'dark', name: 'Escuro', emoji: '🌑' },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-white font-semibold mb-3 text-sm sm:text-base flex items-center">
        <span className="mr-2">🎨</span>
        Estilo do Status
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onStyleChange(style.id)}
            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border transition-all duration-300 ${
              selectedStyle === style.id
                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                : 'bg-gray-800/50 border-gray-600/50 text-gray-300 hover:text-white hover:border-yellow-500/50'
            }`}
          >
            <span className="text-base sm:text-lg mb-1">{style.emoji}</span>
            <span className="text-xs sm:text-sm">{style.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StyleSelector;