
import React, { useState } from 'react';
import { Play, RotateCcw, MessageSquare } from 'lucide-react';
import { testPrompt } from '../services/geminiService';
import { Button } from './Button';

interface TestPlaygroundProps {
  promptToTest: string;
}

export const TestPlayground: React.FC<TestPlaygroundProps> = ({ promptToTest }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRunTest = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setOutput('');
    
    try {
      const result = await testPrompt(promptToTest, input);
      setOutput(result);
    } catch (e) {
      setOutput("Erro ao executar teste.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-700/50 pt-6 animate-fade-in-up">
      <div className="flex items-center space-x-2 mb-4">
        <div className="neo-pressed-sm p-1.5 rounded-lg text-cyan-400">
           <Play className="w-4 h-4" />
        </div>
        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Playground de Teste</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 ml-1">ENTRADA DO USUÁRIO / VARIÁVEIS</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite aqui o texto ou dados que o prompt deve processar..."
            className="w-full h-40 p-4 rounded-xl neo-pressed bg-slate-800/20 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none text-sm font-mono"
          ></textarea>
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-500 ml-1">RESPOSTA DA IA</label>
            {output && (
              <button onClick={() => setOutput('')} className="text-xs text-slate-500 hover:text-white flex items-center">
                <RotateCcw className="w-3 h-3 mr-1" /> Limpar
              </button>
            )}
          </div>
          <div className="w-full h-40 p-4 rounded-xl neo-flat-sm bg-slate-800/40 text-slate-300 overflow-y-auto text-sm leading-relaxed border border-slate-700/30">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-cyan-400/50">
                <div className="animate-spin mb-2 w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full"></div>
                <span className="text-xs animate-pulse">Gerando...</span>
              </div>
            ) : output ? (
              output
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
                A resposta aparecerá aqui...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button 
          onClick={handleRunTest} 
          isLoading={loading}
          disabled={!input.trim()}
          variant="secondary"
          className="px-6 py-2 text-sm"
          icon={<Play className="w-4 h-4 fill-current" />}
        >
          Executar Teste
        </Button>
      </div>
    </div>
  );
};
