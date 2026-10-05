
import React, { useState, useEffect } from 'react';
import { generateEventFromText } from './services/geminiService';
import { CalendarEvent, GenerationStatus } from './types';
import EventCard from './components/EventCard';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [status, setStatus] = useState<GenerationStatus>({
    loading: false,
    error: null,
    success: false
  });
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Formata a data atual para exibir ao usuário (ex: "Hoje é quarta-feira, 25 de Outubro")
    const date = new Date();
    const formatted = date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    setCurrentDate(`Hoje é ${formatted}`);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setStatus({ loading: true, error: null, success: false });
    try {
      const result = await generateEventFromText(prompt);
      setEvent(result);
      setStatus({ loading: false, error: null, success: true });
    } catch (err) {
      console.error(err);
      setStatus({ 
        loading: false, 
        error: 'Erro ao processar. Tente detalhar melhor a data ou horário.', 
        success: false 
      });
    }
  };

  const handleReset = () => {
    setEvent(null);
    setPrompt('');
    setStatus({ loading: false, error: null, success: false });
  };

  const examples = [
    "Reunião amanhã às 14h no Zoom",
    "Aniversário do Pedro dia 15 de Junho",
    "Workshop dia 20 às 19:30 por 2 horas"
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header Simplificado */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white">
              <i className="fa-solid fa-calendar-day text-sm"></i>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Gerador de Agenda</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:py-12">
        <div className="w-full">
          {!event ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{currentDate}</p>
                <h2 className="text-2xl font-semibold text-slate-800">Novo Compromisso</h2>
              </div>

              <form onSubmit={handleGenerate} className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Almoço com cliente terça-feira às 12:30 no Restaurante Central..."
                  className="w-full min-h-[140px] p-5 text-lg bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-0 transition-all outline-none shadow-sm resize-none placeholder:text-slate-300"
                  disabled={status.loading}
                  autoFocus
                />
                
                <div className="mt-4 flex justify-end">
                  {status.loading ? (
                    <div className="bg-slate-800 text-white font-medium py-2.5 px-6 rounded-lg flex items-center gap-2">
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Processando...</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!prompt.trim()}
                      className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg transition-all flex items-center gap-2 group shadow-lg shadow-slate-200"
                    >
                      <span>Gerar Evento</span>
                      <i className="fa-solid fa-chevron-right text-xs group-hover:translate-x-0.5 transition-transform"></i>
                    </button>
                  )}
                </div>
              </form>

              {status.error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm flex items-center gap-3 border border-red-100">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <p>{status.error}</p>
                </div>
              )}

              <div className="pt-2">
                <p className="text-xs text-slate-400 mb-3">Sugestões rápidas:</p>
                <div className="flex flex-wrap gap-2">
                  {examples.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(ex)}
                      className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EventCard event={event} onReset={handleReset} />
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-xs border-t border-slate-100 mt-auto">
        <p>Utilitário Pessoal • Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;
