import React, { useState } from 'react';

export const GroupFinder: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (platform: 'whatsapp' | 'telegram') => {
    if (!searchTerm.trim()) return;

    let query = '';
    if (platform === 'whatsapp') {
      query = `${searchTerm.trim()} "chat.whatsapp.com"`;
    } else {
      query = `${searchTerm.trim()} site:t.me`;
    }

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <label htmlFor="group-search">
        <h3>Buscador de Grupos</h3>
      </label>
      <p>
        Digite um tópico para encontrar grupos públicos de WhatsApp ou Telegram.
      </p>
      <input
        id="group-search"
        type="text"
        style={{ width: '100%' }}
        placeholder="Ex: Cibersegurança, OSINT Brasil, Jogos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <br />
      <button
        onClick={() => handleSearch('whatsapp')}
        disabled={!searchTerm.trim()}
      >
        Buscar no WhatsApp
      </button>
      <button
        onClick={() => handleSearch('telegram')}
        disabled={!searchTerm.trim()}
      >
        Buscar no Telegram
      </button>
    </div>
  );
};