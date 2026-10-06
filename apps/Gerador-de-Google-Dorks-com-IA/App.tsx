import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { QueryInput } from './components/QueryInput';
import { ResultDisplay } from './components/ResultDisplay';
import { generateDorkQuery } from './services/geminiService';
import { GroupFinder } from './components/GroupFinder';

const App: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [generatedDork, setGeneratedDork] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDork = useCallback(async () => {
    if (!userInput.trim()) {
      setError('Por favor, insira uma descrição do que você deseja encontrar.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedDork('');

    try {
      const dork = await generateDorkQuery(userInput);
      setGeneratedDork(dork);
    } catch (err) {
      setError('Falha ao gerar o dork. Por favor, verifique sua chave de API e tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userInput]);

  return (
    <div>
      <Header />

      <main>
        <QueryInput
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onSubmit={handleGenerateDork}
          isLoading={isLoading}
        />
        
        {isLoading && (
          <p>Gerando dork com IA...</p>
        )}

        {error && (
          <p style={{ color: 'red' }}>{error}</p>
        )}

        {generatedDork && !isLoading && (
          <ResultDisplay dork={generatedDork} />
        )}

        <hr />

        <GroupFinder />

      </main>

      <footer style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
        <p>Desenvolvido por Aleksandro Alves</p>
      </footer>
    </div>
  );
};

export default App;