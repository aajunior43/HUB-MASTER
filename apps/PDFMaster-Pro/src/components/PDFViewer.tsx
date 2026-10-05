'use client';

import { useEffect, useRef, useState } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  currentTool: string;
}

interface Annotation {
  id: string;
  type: 'highlight' | 'note' | 'signature' | 'text' | 'rectangle' | 'circle' | 'draw';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  strokeWidth?: number;
  points?: { x: number; y: number }[];
}

export default function PDFViewer({ pdfUrl, currentTool }: PDFViewerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [scale, setScale] = useState<number>(1.0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    switch (currentTool) {
      case 'note':
        const noteContent = prompt('Digite sua nota:');
        if (noteContent) {
          const newNote: Annotation = {
            id: Date.now().toString(),
            type: 'note',
            x,
            y,
            content: noteContent,
            color: '#fef3c7'
          };
          setAnnotations(prev => [...prev, newNote]);
        }
        break;

      case 'text':
        const textContent = prompt('Digite o texto:');
        if (textContent) {
          const newText: Annotation = {
            id: Date.now().toString(),
            type: 'text',
            x,
            y,
            content: textContent,
            color: '#000000'
          };
          setAnnotations(prev => [...prev, newText]);
        }
        break;

      case 'signature':
        const newSignature: Annotation = {
          id: Date.now().toString(),
          type: 'signature',
          x,
          y,
          width: 150,
          height: 50,
          content: 'Assinatura'
        };
        setAnnotations(prev => [...prev, newSignature]);
        break;
    }
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
  };

  const renderAnnotations = () => {
    return annotations.map(annotation => {
      switch (annotation.type) {
        case 'note':
          return (
            <div
              key={annotation.id}
              className="absolute bg-yellow-200 border border-yellow-400 p-2 rounded shadow-lg max-w-xs z-10 cursor-pointer"
              style={{
                left: annotation.x,
                top: annotation.y,
                backgroundColor: annotation.color
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Deseja remover esta nota?')) {
                  removeAnnotation(annotation.id);
                }
              }}
            >
              <div className="text-xs font-medium mb-1">📝 Nota</div>
              <div className="text-sm">{annotation.content}</div>
            </div>
          );

        case 'text':
          return (
            <div
              key={annotation.id}
              className="absolute p-1 cursor-pointer z-10"
              style={{
                left: annotation.x,
                top: annotation.y,
                color: annotation.color,
                fontSize: `${14 * scale}px`
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Deseja remover este texto?')) {
                  removeAnnotation(annotation.id);
                }
              }}
            >
              {annotation.content}
            </div>
          );

        case 'signature':
          return (
            <div
              key={annotation.id}
              className="absolute border-2 border-blue-500 bg-blue-50 p-2 rounded cursor-pointer z-10"
              style={{
                left: annotation.x,
                top: annotation.y,
                width: annotation.width,
                height: annotation.height
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Deseja remover esta assinatura?')) {
                  removeAnnotation(annotation.id);
                }
              }}
            >
              <div className="text-blue-700 font-script text-lg">✍️ {annotation.content}</div>
            </div>
          );

        default:
          return null;
      }
    });
  };

  return (
    <div className="flex-1 bg-gray-100 relative overflow-auto">
      <div 
        ref={containerRef}
        className="relative w-full h-full"
        onClick={handleClick}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {/* PDF Display using iframe */}
        <iframe
          src={pdfUrl}
          className="w-full h-full border-none"
          style={{ minHeight: '800px' }}
          title="PDF Viewer"
        />
        
        {/* Annotations Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full pointer-events-auto">
            {renderAnnotations()}
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white rounded-lg shadow-lg p-1.5 sm:p-2 flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
          className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs sm:text-sm font-medium"
        >
          -
        </button>
        <span className="text-xs sm:text-sm font-medium min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
          className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs sm:text-sm font-medium"
        >
          +
        </button>
      </div>

      {/* Tool Indicator */}
      {currentTool !== 'select' && (
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-lg text-xs sm:text-sm">
          <span className="hidden sm:inline">Ferramenta ativa: </span>
          {currentTool === 'note' ? 'Nota' :
           currentTool === 'text' ? 'Texto' :
           currentTool === 'signature' ? 'Assinatura' :
           currentTool}
        </div>
      )}
    </div>
  );
}