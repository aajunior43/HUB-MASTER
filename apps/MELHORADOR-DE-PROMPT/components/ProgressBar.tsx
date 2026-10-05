import React from 'react';

interface ProgressBarProps {
  score: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ score }) => {
  // Neon colors
  let colorClass = "bg-red-500 shadow-[0_0_10px_#ef4444]";
  let textColor = "text-red-400";
  
  if (score >= 50) {
    colorClass = "bg-yellow-500 shadow-[0_0_10px_#eab308]";
    textColor = "text-yellow-400";
  }
  if (score >= 80) {
    colorClass = "bg-green-500 shadow-[0_0_10px_#22c55e]";
    textColor = "text-green-400";
  }
  if (score >= 95) {
    colorClass = "bg-cyan-500 shadow-[0_0_10px_#06b6d4]";
    textColor = "text-cyan-400";
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Qualidade</span>
        <span className={`text-sm font-bold ${textColor} drop-shadow-md`}>
          {score}/100
        </span>
      </div>
      <div className="w-full neo-pressed-sm rounded-full h-3 overflow-hidden p-[2px]">
        <div 
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`} 
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
};
