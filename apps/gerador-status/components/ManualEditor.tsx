import React from 'react';
import { CardConfig, FontStyle, Alignment, Palette } from '../types';
import { PALETTES, FONTS } from '../constants';

interface ManualEditorProps {
  config: CardConfig;
  setConfig: React.Dispatch<React.SetStateAction<CardConfig>>;
}

export const ManualEditor: React.FC<ManualEditorProps> = ({ config, setConfig }) => {
  const handleChange = (key: keyof CardConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mt-6 border-4 border-black bg-white shadow-hard w-full p-4 relative">
       <div className="flex justify-between items-end mb-4">
         <h2 className="font-display text-xl bg-black text-white inline-block px-2 py-1 transform -rotate-1">4. OVERRIDE</h2>
         <span className="font-mono text-[10px] text-gray-500">MANUAL_EDIT</span>
       </div>

      <div className="space-y-4">
        <textarea
          value={config.text}
          onChange={(e) => handleChange('text', e.target.value)}
          className="w-full bg-off-white border-2 border-black p-2 font-mono text-sm focus:outline-none focus:bg-black focus:text-acid-green custom-scrollbar placeholder-gray-400"
          rows={3}
          placeholder="OVERRIDE TEXT..."
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs font-bold mb-2 uppercase">Palette</label>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map(p => (
                <button
                  key={p.name}
                  onClick={() => handleChange('palette', p)}
                  className={`w-6 h-6 border-2 border-black transition-transform ${config.palette.name === p.name ? 'ring-2 ring-offset-1 ring-black shadow-hard scale-110 z-10' : 'hover:scale-105'}`}
                  style={{ backgroundColor: p.bg }}
                  title={p.name}
                />
              ))}
            </div>
          </div>
          <div>
             <label className="block font-mono text-xs font-bold mb-2 uppercase">Font</label>
             <select
               value={config.font}
               onChange={(e) => handleChange('font', e.target.value)}
               className="w-full border-2 border-black bg-off-white p-1 font-mono text-xs uppercase cursor-pointer focus:outline-none focus:bg-acid-green"
             >
               {FONTS.map(f => (
                 <option key={f.value} value={f.value}>{f.label}</option>
               ))}
             </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block font-mono text-xs font-bold mb-2 uppercase">Size: {config.fontSize}px</label>
              <input 
                type="range" 
                min="20" max="250" step="2"
                value={config.fontSize} 
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />
             </div>
             <div>
               <label className="block font-mono text-xs font-bold mb-2 uppercase">Align</label>
               <select
                 value={config.alignment}
                 onChange={(e) => handleChange('alignment', e.target.value)}
                 className="w-full border-2 border-black bg-off-white p-1 font-mono text-xs uppercase cursor-pointer focus:outline-none focus:bg-acid-green"
               >
                 <option value="text-left">LEFT</option>
                 <option value="text-center">CENTER</option>
                 <option value="text-right">RIGHT</option>
               </select>
             </div>
        </div>
        
        <div className="flex gap-4 pt-2 border-t-2 border-dashed border-gray-300">
            <label className="flex items-center gap-2 font-mono text-xs font-bold cursor-pointer uppercase select-none hover:text-electric-blue transition-colors">
              <input 
                type="checkbox" 
                checked={config.uppercase}
                onChange={(e) => handleChange('uppercase', e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              UPPERCASE
            </label>
            <label className="flex items-center gap-2 font-mono text-xs font-bold cursor-pointer uppercase select-none hover:text-electric-blue transition-colors">
              <input 
                type="checkbox" 
                checked={config.hasNoise}
                onChange={(e) => handleChange('hasNoise', e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              NOISE
            </label>
        </div>

      </div>
    </div>
  );
}
