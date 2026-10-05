
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, ZoomIn, ZoomOut, Maximize, MousePointer2 } from 'lucide-react';

interface MermaidRendererProps {
  code: string;
  onSvgReady?: (svg: string) => void;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, onSvgReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        background: '#e0e5ec',
        primaryColor: '#6d5dfc',
        primaryTextColor: '#4d5561',
        lineColor: '#a3b1c6',
        secondaryColor: '#f0f2f5',
        tertiaryColor: '#ffffff',
      },
      fontFamily: 'Nunito, sans-serif',
      flowchart: { htmlLabels: false, curve: 'basis' },
      sequence: { showSequenceNumbers: true },
    });
  }, []);

  const renderDiagram = useCallback(async () => {
    if (!code) return;
    setError(null);
    try {
      const id = `mermaid-render-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(id, code);
      setSvgContent(svg);
      onSvgReady?.(svg);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } catch (err) {
      setError("Erro ao renderizar diagrama.");
    }
  }, [code, onSvgReady]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Mouse wheel zoom
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(s => Math.min(Math.max(s + delta, 0.2), 5));
    }
  };

  // Pinch-to-Zoom handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = (distance - lastTouchDistance) * 0.01;
      setScale(s => Math.min(Math.max(s + delta, 0.2), 5));
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({ 
        x: e.touches[0].clientX - dragStart.x, 
        y: e.touches[0].clientY - dragStart.y 
      });
    }
  };

  useEffect(() => {
    const el = wrapperRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <AlertCircle size={40} className="mb-2 text-red-400 opacity-50" />
        <p className="font-bold">Sintaxe Inválida</p>
        <button onClick={renderDiagram} className="mt-4 text-xs font-bold text-primary-500 underline">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group touch-none" ref={wrapperRef}>
      {/* Controls - Adaptive for Mobile */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <div className="flex bg-neu-base/80 backdrop-blur-md p-1 rounded-xl shadow-neu-flat">
          <button onClick={() => setScale(s => Math.min(s + 0.2, 5))} className="p-2 hover:text-primary-600 transition-colors"><ZoomIn size={16} /></button>
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.2))} className="p-2 hover:text-primary-600 transition-colors"><ZoomOut size={16} /></button>
          <div className="w-px bg-slate-300 mx-1" />
          <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} className="p-2 hover:text-primary-600 transition-colors"><Maximize size={16} /></button>
        </div>
      </div>

      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 pointer-events-none hidden xs:block">
        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-slate-400 bg-neu-base/50 backdrop-blur-sm px-2 py-1 rounded-lg">
          <MousePointer2 size={10} />
          <span className="hidden sm:inline">Ctrl + Scroll para Zoom • Arraste para mover</span>
          <span className="sm:hidden">Pinça para Zoom • Arraste para mover</span>
        </div>
      </div>

      <div 
        className="w-full h-full flex items-center justify-center cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { setIsDragging(false); setLastTouchDistance(null); }}
      >
        <div 
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
          className="transition-transform duration-75 ease-out select-none"
          dangerouslySetInnerHTML={{ __html: svgContent }} 
        />
      </div>
    </div>
  );
};

export default MermaidRenderer;
