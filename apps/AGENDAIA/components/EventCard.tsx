
import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { createGoogleCalendarUrl, downloadICSFile } from '../utils/calendar';

interface EventCardProps {
  event: CalendarEvent;
  onReset: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event: initialEvent, onReset }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<CalendarEvent>(initialEvent);

  // Atualiza estado local se a prop mudar
  useEffect(() => {
    setData(initialEvent);
  }, [initialEvent]);

  const calendarUrl = createGoogleCalendarUrl(data);
  const startDateObj = new Date(data.startDate);
  const endDateObj = new Date(data.endDate);

  // Formata para input datetime-local (YYYY-MM-DDThh:mm)
  const toInputDate = (isoString: string) => {
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setData(prev => ({ ...prev, [field]: new Date(value).toISOString() }));
  };

  const handleChange = (field: keyof CalendarEvent, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-800 p-6 text-white flex justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-xs font-medium opacity-70 uppercase tracking-wider mb-1">Evento Gerado</h3>
          {isEditing ? (
            <input
              type="text"
              value={data.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full bg-slate-700/50 text-white border border-slate-600 rounded px-2 py-1 text-xl font-bold focus:outline-none focus:border-blue-400"
            />
          ) : (
            <h2 className="text-2xl font-bold leading-tight">{data.title}</h2>
          )}
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
        >
          {isEditing ? 'Salvar Visualização' : 'Editar Detalhes'}
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data e Hora */}
          <div className="flex items-start gap-4">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1 shrink-0">
              <i className="fa-solid fa-clock w-5 h-5 flex items-center justify-center"></i>
            </div>
            <div className="w-full">
              <p className="text-sm text-slate-500 font-medium mb-1">Quando</p>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400">Início</label>
                    <input 
                      type="datetime-local" 
                      value={toInputDate(data.startDate)}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      className="border border-slate-300 rounded p-1 text-sm w-full"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400">Fim</label>
                    <input 
                      type="datetime-local" 
                      value={toInputDate(data.endDate)}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      className="border border-slate-300 rounded p-1 text-sm w-full"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input 
                      type="checkbox" 
                      checked={data.isAllDay}
                      onChange={(e) => handleChange('isAllDay', e.target.checked)}
                    />
                    Dia Inteiro
                  </label>
                </div>
              ) : (
                <>
                  <p className="text-slate-800 font-semibold">{formatDate(startDateObj)}</p>
                  {!data.isAllDay && (
                    <p className="text-slate-600 text-sm">
                      Das {formatTime(startDateObj)} até {formatTime(endDateObj)}
                    </p>
                  )}
                  {data.isAllDay && <p className="text-blue-600 text-sm font-medium">Dia Inteiro</p>}
                </>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="flex items-start gap-4">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1 shrink-0">
              <i className="fa-solid fa-location-dot w-5 h-5 flex items-center justify-center"></i>
            </div>
            <div className="w-full">
              <p className="text-sm text-slate-500 font-medium mb-1">Onde</p>
              {isEditing ? (
                <input 
                  type="text"
                  value={data.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full border border-slate-300 rounded p-1 text-sm"
                  placeholder="Local ou Link"
                />
              ) : (
                <p className="text-slate-800 font-semibold break-words">{data.location || "Local não definido"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div className="flex items-start gap-4 pt-4 border-t border-slate-100">
          <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1 shrink-0">
            <i className="fa-solid fa-align-left w-5 h-5 flex items-center justify-center"></i>
          </div>
          <div className="w-full">
            <p className="text-sm text-slate-500 font-medium mb-1">Descrição</p>
            {isEditing ? (
              <textarea
                value={data.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-sm min-h-[80px]"
                placeholder="Detalhes do evento..."
              />
            ) : (
              data.description && (
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                  {data.description}
                </p>
              )
            )}
            {!isEditing && !data.description && <span className="text-slate-400 text-xs italic">Sem descrição</span>}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col gap-3 pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <a 
              href={calendarUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              <i className="fa-brands fa-google"></i>
              Adicionar ao Google
            </a>
            <button
              onClick={() => downloadICSFile(data)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              title="Baixar arquivo para Outlook/Apple Calendar"
            >
              <i className="fa-solid fa-download"></i>
              .ICS
            </button>
          </div>
          
          <button 
            onClick={onReset}
            className="w-full py-2 text-slate-400 text-sm hover:text-slate-600 transition-colors"
          >
            Criar novo evento
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
