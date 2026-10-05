import React, { useState, useCallback } from 'react';

interface ResultDisplayProps {
  dork: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ dork }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copiar');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(dork);
    setCopyButtonText('Copiado!');
    setTimeout(() => setCopyButtonText('Copiar'), 2000);
  }, [dork]);

  const handleSearch = () => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(dork)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ border: '1px solid black', padding: '10px', marginTop: '20px' }}>
      <h3>Dork Gerado pela IA</h3>
      <p style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {dork}
      </p>
      <br />
      <button onClick={handleCopy}>{copyButtonText}</button>
      <button onClick={handleSearch}>Buscar no Google</button>
    </div>
  );
};