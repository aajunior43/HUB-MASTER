
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface FileUploadProps {
  onFileChange: (files: File[]) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const pdfFiles = Array.from(newFiles).filter(file => file.type === "application/pdf");
    if (pdfFiles.length > 0) {
        const updatedFiles = [...selectedFiles];
        pdfFiles.forEach(newFile => {
            if (!updatedFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)) {
                updatedFiles.push(newFile);
            }
        });
        setSelectedFiles(updatedFiles);
        onFileChange(updatedFiles);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  }, [disabled, selectedFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    processFiles(e.target.files);
     if (inputRef.current) {
        inputRef.current.value = ""; // Allow re-selecting the same file(s)
    }
  };
  
  const handleRemoveFile = (fileToRemove: File) => {
    if (disabled) return;
    const updatedFiles = selectedFiles.filter(file => file !== fileToRemove);
    setSelectedFiles(updatedFiles);
    onFileChange(updatedFiles);
  };

  const handleClearAll = () => {
    if (disabled) return;
    setSelectedFiles([]);
    onFileChange([]);
  };

  return (
    <div className="w-full">
      {selectedFiles.length > 0 ? (
        <div className="w-full space-y-3">
            <ul className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {selectedFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg animate-fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                            <DocumentTextIcon className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate text-sm">{file.name}</p>
                                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleRemoveFile(file)}
                            disabled={disabled}
                            className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
                            aria-label={`Remover ${file.name}`}
                        >
                            <XCircleIcon className="w-5 h-5" />
                        </button>
                    </li>
                ))}
            </ul>
             <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-700">
                 <button 
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled}
                    className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Adicionar mais arquivos...
                </button>
                <button
                    onClick={handleClearAll}
                    disabled={disabled}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Limpar tudo
                </button>
             </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative w-full p-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
            ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-indigo-400 hover:bg-gray-800/50'}
            ${isDragging ? 'border-indigo-500 bg-gray-800/80' : 'border-gray-600'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleChange}
            className="hidden"
            disabled={disabled}
            multiple
          />
          <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-white font-semibold">
            Arraste e solte os PDFs aqui
          </p>
          <p className="mt-1 text-sm text-gray-400">ou clique para selecionar os arquivos</p>
        </div>
      )}
    </div>
  );
};
