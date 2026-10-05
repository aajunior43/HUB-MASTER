import React, { useState, useEffect } from 'react';
import { Calculator as CalculatorIcon, TrendingUp, TrendingDown, RotateCcw, History, Zap, Activity } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';
import ParticleSystem from './ParticleSystem';

interface CalculationResult {
  value1: number;
  value2: number;
  absoluteDifference: number;
  percentageDifference: number;
  isIncrease: boolean;
  timestamp: string;
}

const Calculator: React.FC = () => {
  const [value1, setValue1] = useState<string>('');
  const [value2, setValue2] = useState<string>('');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const formatNumber = (value: string): string => {
    const number = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (isNaN(number)) return '';
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseNumber = (value: string): number => {
    return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
  };

  const calculateDifference = () => {
    const num1 = parseNumber(value1);
    const num2 = parseNumber(value2);

    if (num1 === 0 || num2 === 0) return;

    const absoluteDifference = Math.abs(num2 - num1);
    const percentageDifference = ((num2 - num1) / num1) * 100;
    const isIncrease = num2 > num1;

    const newResult: CalculationResult = {
      value1: num1,
      value2: num2,
      absoluteDifference,
      percentageDifference,
      isIncrease,
      timestamp: new Date().toLocaleString('pt-BR')
    };

    setResult(newResult);
    setHistory(prev => [newResult, ...prev.slice(0, 4)]);
  };

  const clearCalculator = () => {
    setValue1('');
    setValue2('');
    setResult(null);
  };

  useEffect(() => {
    if (value1 && value2) {
      calculateDifference();
    }
  }, [value1, value2]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-black transition-all duration-500 py-8 px-4">
      {/* Sistema de Partículas Cyberpunk */}
      <ParticleSystem theme={theme} />
      
      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 opacity-[0.03] dark:opacity-20 z-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(${theme === 'dark' ? 'rgba(0, 255, 255, 0.3)' : 'rgba(99, 102, 241, 0.15)'} 1px, transparent 1px),
            linear-gradient(90deg, ${theme === 'dark' ? 'rgba(0, 255, 255, 0.3)' : 'rgba(99, 102, 241, 0.15)'} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Floating Particles */}
      <div className={`fixed inset-0 overflow-hidden pointer-events-none z-10 ${theme === 'dark' ? 'opacity-60' : 'opacity-30'}`}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full animate-pulse ${theme === 'dark' ? 'bg-cyan-400' : 'bg-indigo-400'}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-20">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className={`absolute inset-0 rounded-full blur-lg opacity-75 animate-pulse shadow-2xl ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-400 to-purple-500 shadow-cyan-500/50' : 'bg-gradient-to-r from-indigo-400 to-purple-500 shadow-indigo-500/40'}`} />
              <div className={`relative p-4 rounded-full ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
                <CalculatorIcon className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className={`text-5xl font-bold bg-clip-text text-transparent mb-4 ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500' : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'}`}>
            CYBER CALC
          </h1>
          <p className={`text-xl font-light ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
            Calculadora de Diferença Futurística
          </p>
          
          {/* Theme Toggle */}
          <div className="flex justify-center mt-6">
            <div className={`backdrop-blur-sm rounded-full p-4 border shadow-lg ${theme === 'dark' ? 'bg-gray-800/90 border-gray-600' : 'bg-white/95 border-slate-200'}`}>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <div className={`backdrop-blur-sm rounded-3xl shadow-2xl border p-8 relative overflow-hidden ${theme === 'dark' ? 'bg-gray-800/95 border-gray-600' : 'bg-white/98 border-slate-200'}`}>
              {/* Neon Border Effect */}
              <div className={`absolute inset-0 rounded-3xl blur-xl ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30' : 'bg-gradient-to-r from-indigo-500/15 to-purple-500/15'}`} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <Zap className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-indigo-600'}`} />
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    Valores de Entrada
                  </h2>
                </div>
                
                <div className="space-y-8">
                  <div className="group">
                    <label className={`block text-sm font-medium mb-3 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                      Valor Inicial
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-xl font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-indigo-600'}`}>
                        R$
                      </span>
                      <input
                        type="text"
                        value={value1}
                        onChange={(e) => setValue1(e.target.value)}
                        placeholder="0,00"
                        className={`w-full pl-16 pr-6 py-5 text-xl border-2 rounded-xl focus:ring-2 transition-all duration-300 ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white focus:ring-cyan-500 focus:border-cyan-400 group-hover:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 group-hover:border-indigo-400'}`}
                      />
                      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20' : 'bg-gradient-to-r from-indigo-500/8 to-purple-500/8'}`} />
                    </div>
                  </div>

                  <div className="group">
                    <label className={`block text-sm font-medium mb-3 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                      Valor Final
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-indigo-600'}`}>
                        R$
                      </span>
                      <input
                        type="text"
                        value={value2}
                        onChange={(e) => setValue2(e.target.value)}
                        placeholder="0,00"
                        className={`w-full pl-16 pr-6 py-5 text-xl border-2 rounded-xl focus:ring-2 transition-all duration-300 ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white focus:ring-purple-500 focus:border-purple-400 group-hover:border-purple-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-purple-500 focus:border-purple-500 group-hover:border-purple-400'}`}
                      />
                      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${theme === 'dark' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-r from-purple-500/8 to-pink-500/8'}`} />
                    </div>
                  </div>

                  <button
                    onClick={clearCalculator}
                    className={`flex items-center gap-3 px-8 py-4 border-2 rounded-xl transition-all duration-300 group ${theme === 'dark' ? 'text-gray-300 border-gray-600 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:border-gray-500' : 'text-slate-600 border-slate-300 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-200 hover:border-slate-400'}`}
                  >
                    <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="font-medium uppercase tracking-wider">Reset</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result && (
              <div className={`backdrop-blur-sm rounded-3xl shadow-2xl border p-6 relative overflow-hidden ${theme === 'dark' ? 'bg-gray-800/95 border-gray-600' : 'bg-white/98 border-slate-200'}`}>
                {/* Animated Background */}
                <div className={`absolute inset-0 bg-gradient-to-br rounded-3xl ${result.isIncrease ? (theme === 'dark' ? 'from-green-500/20 to-cyan-500/20' : 'from-emerald-500/10 to-green-500/10') : (theme === 'dark' ? 'from-red-500/20 to-pink-500/20' : 'from-rose-500/10 to-red-500/10')}`} />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-indigo-600'}`} />
                    <h3 className={`text-xl font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      Resultado
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className={`p-6 rounded-2xl border-2 relative overflow-hidden ${result.isIncrease ? (theme === 'dark' ? 'bg-green-900/30 border-green-600' : 'bg-emerald-50 border-emerald-300') : (theme === 'dark' ? 'bg-red-900/30 border-red-600' : 'bg-rose-50 border-rose-300')}`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          {result.isIncrease ? (
                            <TrendingUp className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`} />
                          ) : (
                            <TrendingDown className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-rose-600'}`} />
                          )}
                          <span className={`font-bold uppercase tracking-wider ${result.isIncrease ? (theme === 'dark' ? 'text-green-400' : 'text-emerald-600') : (theme === 'dark' ? 'text-red-400' : 'text-rose-600')}`}>
                            {result.isIncrease ? 'Aumento' : 'Diminuição'}
                          </span>
                        </div>
                        <div className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                          {Math.abs(result.percentageDifference).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900/60 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`text-sm mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>
                        Diferença Absoluta
                      </div>
                      <div className={`text-2xl font-bold bg-clip-text text-transparent ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-400 to-purple-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                        R$ {result.absoluteDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className={`text-xs text-center ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                      {result.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Section */}
            <div className={`backdrop-blur-sm rounded-3xl shadow-2xl border p-6 relative overflow-hidden ${theme === 'dark' ? 'bg-gray-800/95 border-gray-600' : 'bg-white/98 border-slate-200'}`}>
              <div className={`absolute inset-0 bg-gradient-to-br rounded-3xl ${theme === 'dark' ? 'from-purple-500/10 to-cyan-500/10' : 'from-purple-500/8 to-indigo-500/8'}`} />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <History className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                    <h3 className={`text-xl font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      Histórico
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`flex items-center gap-2 px-4 py-2 transition-colors duration-300 border rounded-lg ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300 border-purple-600 hover:bg-purple-900/30' : 'text-purple-600 hover:text-purple-700 border-purple-300 hover:bg-purple-100'}`}
                  >
                    <History className="w-4 h-4" />
                    {showHistory ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                {showHistory && history.length > 0 && (
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <div key={index} className={`p-4 rounded-xl border text-sm transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900/60 border-gray-600 hover:bg-gray-800/70' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                            R$ {item.value1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → 
                            R$ {item.value2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.isIncrease ? (theme === 'dark' ? 'text-green-400 bg-green-900/40' : 'text-emerald-600 bg-emerald-100') : (theme === 'dark' ? 'text-red-400 bg-red-900/40' : 'text-rose-600 bg-rose-100')}`}>
                            {item.isIncrease ? '+' : ''}{item.percentageDifference.toFixed(1)}%
                          </span>
                        </div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                          {item.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showHistory && history.length === 0 && (
                  <p className={`text-sm text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    Nenhum cálculo realizado ainda
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className={`backdrop-blur-sm rounded-2xl shadow-xl border p-6 hover:scale-105 transition-transform duration-300 group ${theme === 'dark' ? 'bg-gray-800/90 border-gray-600' : 'bg-white/95 border-slate-200'}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300 ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className={`font-bold mb-3 uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Diferença %</h3>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              Calcula o percentual de variação entre os valores inseridos
            </p>
          </div>

          <div className={`backdrop-blur-sm rounded-2xl shadow-xl border p-6 hover:scale-105 transition-transform duration-300 group ${theme === 'dark' ? 'bg-gray-800/90 border-gray-600' : 'bg-white/95 border-slate-200'}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300 ${theme === 'dark' ? 'bg-gradient-to-r from-purple-400 to-pink-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
              <CalculatorIcon className="w-7 h-7 text-white" />
            </div>
            <h3 className={`font-bold mb-3 uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Valor Absoluto</h3>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              Mostra a diferença exata em valores monetários
            </p>
          </div>

          <div className={`backdrop-blur-sm rounded-2xl shadow-xl border p-6 hover:scale-105 transition-transform duration-300 group ${theme === 'dark' ? 'bg-gray-800/90 border-gray-600' : 'bg-white/95 border-slate-200'}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300 ${theme === 'dark' ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-pink-500 to-rose-600'}`}>
              <History className="w-7 h-7 text-white" />
            </div>
            <h3 className={`font-bold mb-3 uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Histórico</h3>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              Mantém registro das últimas operações realizadas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;