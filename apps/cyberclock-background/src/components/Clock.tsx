import { useState, useEffect } from 'react';

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  const hours = formatNumber(time.getHours());
  const minutes = formatNumber(time.getMinutes());
  const seconds = formatNumber(time.getSeconds());

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 rounded-lg backdrop-blur-sm bg-black/20 shadow-2xl">
      <div className="clock-container text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-bold text-white z-10 relative p-4">
        <div className="glitch" data-text={`${hours}:${minutes}:${seconds}`}>
          {hours}:{minutes}:{seconds}
        </div>
      </div>
      <div className="clock-container text-white text-xl sm:text-2xl md:text-3xl font-mono">
        <div className="glitch" data-text={formatDate(time)} style={{ textShadow: '0 0 10px #D946EF' }}>
          {formatDate(time)}
        </div>
      </div>
      <div className="text-white text-lg sm:text-xl md:text-2xl font-mono mt-2 hover:text-pink-400 transition-colors duration-300">
        Aleksandro Alves
      </div>
    </div>
  );
};

export default Clock;