'use client';

import { useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Presentation, 
  Scissors, 
  Merge, 
  Archive 
} from 'lucide-react';

interface ConversionToolsProps {
  pdfFile: File | null;
}

export default function ConversionTools({ pdfFile }: ConversionToolsProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);

  const handleConversion = async (format: string) => {
    if (!pdfFile) return;

    setIsConverting(true);
    setConversionProgress(0);

    // Simulate conversion progress
    const interval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsConverting(false);
          // Here you would trigger the actual download
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Placeholder for actual conversion logic
    // In a real implementation, you would use libraries like pdf2pic, pdf-poppler, etc.
    console.log(`Converting ${pdfFile.name} to ${format}`);
  };

  const handleCompress = async () => {
    if (!pdfFile) return;

    setIsConverting(true);
    setConversionProgress(0);

    // Simulate compression
    const interval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsConverting(false);
          return 100;
        }
        return prev + 15;
      });
    }, 150);

    console.log(`Compressing ${pdfFile.name}`);
  };

  const handleSplit = () => {
    if (!pdfFile) return;
    // Placeholder for split functionality
    console.log(`Splitting ${pdfFile.name}`);
  };

  const handleMerge = () => {
    // Placeholder for merge functionality
    console.log('Opening merge dialog');
  };

  const conversionOptions = [
    {
      id: 'docx',
      label: 'Word (DOCX)',
      icon: FileText,
      description: 'Converter para documento Word editável',
      color: 'text-blue-600'
    },
    {
      id: 'xlsx',
      label: 'Excel (XLSX)',
      icon: FileSpreadsheet,
      description: 'Extrair tabelas para planilha Excel',
      color: 'text-green-600'
    },
    {
      id: 'pptx',
      label: 'PowerPoint (PPTX)',
      icon: Presentation,
      description: 'Converter para apresentação PowerPoint',
      color: 'text-orange-600'
    },
    {
      id: 'jpg',
      label: 'Imagem (JPG)',
      icon: ImageIcon,
      description: 'Converter páginas para imagens JPG',
      color: 'text-purple-600'
    },
    {
      id: 'png',
      label: 'Imagem (PNG)',
      icon: ImageIcon,
      description: 'Converter páginas para imagens PNG',
      color: 'text-pink-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Ferramentas de Conversão</h2>

      {/* Conversion Progress */}
      {isConverting && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Convertendo...</span>
            <span className="text-sm text-blue-600">{conversionProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${conversionProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Format Conversion */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Converter para outros formatos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conversionOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleConversion(option.id)}
                disabled={!pdfFile || isConverting}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex items-center mb-2">
                  <Icon className={`h-6 w-6 ${option.color} mr-3`} />
                  <span className="font-medium text-gray-900">{option.label}</span>
                </div>
                <p className="text-sm text-gray-600">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* PDF Operations */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">Operações com PDF</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleCompress}
            disabled={!pdfFile || isConverting}
            className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Archive className="h-6 w-6 text-green-600 mr-3" />
            <div className="text-left">
              <div className="font-medium text-green-800">Comprimir</div>
              <div className="text-sm text-green-600">Reduzir tamanho do arquivo</div>
            </div>
          </button>

          <button
            onClick={handleSplit}
            disabled={!pdfFile || isConverting}
            className="flex items-center justify-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scissors className="h-6 w-6 text-orange-600 mr-3" />
            <div className="text-left">
              <div className="font-medium text-orange-800">Dividir</div>
              <div className="text-sm text-orange-600">Separar páginas</div>
            </div>
          </button>

          <button
            onClick={handleMerge}
            disabled={isConverting}
            className="flex items-center justify-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Merge className="h-6 w-6 text-purple-600 mr-3" />
            <div className="text-left">
              <div className="font-medium text-purple-800">Combinar</div>
              <div className="text-sm text-purple-600">Unir múltiplos PDFs</div>
            </div>
          </button>
        </div>
      </div>

      {/* File Info */}
      {pdfFile && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Arquivo atual</h4>
          <div className="text-sm text-gray-600">
            <p><strong>Nome:</strong> {pdfFile.name}</p>
            <p><strong>Tamanho:</strong> {(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Tipo:</strong> {pdfFile.type}</p>
          </div>
        </div>
      )}
    </div>
  );
}