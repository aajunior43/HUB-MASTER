
import React from 'react';
import { DiagramData } from '../types';
import { Trash2, Clock, Plus, X } from 'lucide-react';

interface HistorySidebarProps {
  history: DiagramData[];
  onSelect: (diagram: DiagramData) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNew: () => void;
  selectedId: string | null;
  isOpen: boolean;
  onCloseMobile: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  history, 
  onSelect, 
  onDelete, 
  onNew,
  selectedId,
  isOpen,
  onCloseMobile
}) => {
  return (
    <>
      {/* Mobile Backdrop - Overlay with Blur */}
      <div 
        className={`fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[40] transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
      />

      {/* Sidebar Container - Adaptive behavior */}
      <div className={`
        fixed md:relative z-[50] h-full w-[280px] bg-neu-base flex flex-col shrink-0 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:-ml-[280px]'}
      `}>
        <div className="p-4 sm:p-5 flex flex-col gap-4 h-full overflow-hidden">
          {/* Header Mobile Only */}
          <div className="flex justify-between items-center mb-1">
            <span className="font-black text-slate-700 text-lg">Histórico</span>
            <button 
              onClick={onCloseMobile} 
              className="p-2 rounded-full shadow-neu-flat active:shadow-neu-pressed text-slate-400 md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <button 
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white py-3.5 px-4 rounded-xl font-bold transition-all shadow-neu-flat active:translate-y-0.5 active:shadow-neu-pressed hover:brightness-110"
          >
            <Plus size={18} />
            Novo Diagrama
          </button>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar pb-6">
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center px-4">
                <div className="w-14 h-14 rounded-full shadow-neu-pressed flex items-center justify-center mb-4 text-slate-300">
                  <Clock size={20} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-60">Seu histórico aparecerá aqui</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`group relative p-4 rounded-2xl cursor-pointer transition-all border-2 border-transparent ${
                    selectedId === item.id 
                      ? 'shadow-neu-pressed border-primary-100/30' 
                      : 'shadow-neu-flat hover:translate-y-[-2px] bg-neu-base'
                  }`}
                >
                  <h4 className={`font-bold text-xs truncate mb-1.5 ${selectedId === item.id ? 'text-primary-600' : 'text-slate-700'}`}>
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium line-clamp-2 leading-relaxed mb-3">
                    {item.explanation}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono font-bold bg-slate-100/50 px-1.5 py-0.5 rounded">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <button 
                      onClick={(e) => onDelete(item.id, e)}
                      className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg hover:shadow-neu-pressed transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
