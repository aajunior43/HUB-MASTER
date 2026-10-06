import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  FileText,
  Download,
  X,
  Edit2,
  History,
  RefreshCw,
  Sparkles,
  Trash2,
  Save,
} from 'lucide-react';
import { GeminiService } from '@/services/geminiService';
import { useToast } from '@/hooks/use-toast';
import { AppError, ErrorType } from '@/types/errors';
import { DocumentInfoDisplay } from '@/components/DocumentInfoDisplay';
import { DocumentAnalysisResult } from '@/types/document';
import '@/components/DocumentInfoDisplay.css';

interface ProcessedFile {
  originalName: string;
  newName: string;
  file: File;
  analysis: DocumentAnalysisResult | null;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

import {
  sanitizeFileName,
  isRealPdf,
  MAX_FILE_BYTES,
  MAX_FILES,
} from '@/utils/fileValidation';

const FALLBACK_API_KEY = 'AIzaSyBolH0TO1T4HLZ38hiwMyM7tsQHjTBy8l8';
const HISTORY_KEY = 'processing_history';
const HISTORY_LIMIT = 10;


/* ------------------------------------------------------------------ */
/*  Small editorial building blocks                                    */
/* ------------------------------------------------------------------ */

const SectionHeader = memo(({
  numeral,
  label,
  title,
  aside,
}: {
  numeral: string;
  label: string;
  title: string;
  aside?: React.ReactNode;
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-foreground">
      <span className="font-display text-lg leading-none bg-primary text-primary-foreground px-2 py-0.5 brutal-border">{numeral}</span>
      <span className="h-[3px] flex-1 max-w-[2rem] bg-foreground" />
      <span className="font-black">{label}</span>
      <span className="ml-auto">{aside}</span>
    </div>
    <h2 className="font-display text-[1.9rem] sm:text-4xl md:text-[2.5rem] leading-[1] text-foreground text-balance uppercase">
      {title}
    </h2>
  </div>
));
SectionHeader.displayName = 'SectionHeader';


/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const PDFRenamer = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [geminiService, setGeminiService] = useState<GeminiService | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [processingHistory, setProcessingHistory] = useState<ProcessedFile[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key') || '';
    const effectiveApiKey = savedApiKey.trim() || FALLBACK_API_KEY;

    setApiKey(savedApiKey);
    setGeminiService(new GeminiService(effectiveApiKey));

    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        setProcessingHistory(JSON.parse(savedHistory).slice(0, HISTORY_LIMIT));
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (processedFiles.length === 0) return;
    setProcessingHistory((prev) => {
      const merged = [...processedFiles, ...prev]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, HISTORY_LIMIT);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [processedFiles]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    const candidates = files.slice(0, MAX_FILES);
    const valid: File[] = [];
    const rejected: string[] = [];
    for (const f of candidates) {
      if (f.type !== 'application/pdf') { rejected.push(`${f.name} (tipo)`); continue; }
      if (f.size === 0 || f.size > MAX_FILE_BYTES) { rejected.push(`${f.name} (tamanho)`); continue; }
      if (!(await isRealPdf(f))) { rejected.push(`${f.name} (assinatura)`); continue; }
      valid.push(f);
    }
    if (rejected.length) {
      toast({
        title: 'Alguns arquivos foram ignorados',
        description: rejected.slice(0, 3).join(', ') + (rejected.length > 3 ? '…' : ''),
        variant: 'destructive',
      });
    }
    if (valid.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    toast({
      title: 'Arquivos selecionados',
      description: `${valid.length} arquivo(s) PDF adicionado(s)`,
    });
  }, [toast]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) handleFileSelect(Array.from(event.target.files));
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileSelect(files);
  }, [handleFileSelect]);

  const processFileWithRetry = useCallback(async (file: File, maxRetries = 3): Promise<ProcessedFile> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
        const [structuredAnalysis, suggestedName] = await Promise.all([
          geminiService!.extractStructuredDocumentInfo(file),
          geminiService!.analyzeDocument(file),
        ]);
        const rawName =
          structuredAnalysis.suggestedFileName ||
          (suggestedName.endsWith('.pdf') ? suggestedName : `${suggestedName}.pdf`);
        return {
          originalName: file.name,
          newName: sanitizeFileName(rawName),
          file,
          analysis: structuredAnalysis,
          timestamp: Date.now(),
        };
      } catch (error) {
        lastError = error as Error;
        if (
          error instanceof AppError &&
          (error.type === ErrorType.API_MODEL_OVERLOADED ||
            error.type === ErrorType.API_RATE_LIMIT)
        ) {
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error('Falha ao processar arquivo');
  }, [geminiService]);

  const handleRenameAll = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast({ title: 'Erro', description: 'Selecione ao menos um PDF', variant: 'destructive' });
      return;
    }
    if (!geminiService) {
      toast({ title: 'Erro', description: 'Serviço não configurado', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setCurrentProgress(0);
    setTotalFiles(selectedFiles.length);

    try {
      const results: ProcessedFile[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setCurrentProgress(i + 1);
        try {
          results.push(await processFileWithRetry(file));
        } catch (error) {
          toast({
            title: `Erro em ${file.name}`,
            description: error instanceof AppError ? error.userMessage : 'Erro ao processar',
            variant: 'destructive',
          });
        }
      }
      setProcessedFiles(results);
      setSelectedFiles([]);
      toast({
        title: 'Concluído',
        description: `${results.length} de ${selectedFiles.length} arquivo(s) processado(s)`,
      });
    } finally {
      setIsProcessing(false);
      setCurrentProgress(0);
      setTotalFiles(0);
    }
  }, [selectedFiles, geminiService, processFileWithRetry, toast]);

  const handleDownload = useCallback((processed: ProcessedFile) => {
    const url = URL.createObjectURL(processed.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFileName(processed.newName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadAll = useCallback(() => {
    processedFiles.forEach((p, i) => setTimeout(() => handleDownload(p), i * 120));
  }, [processedFiles, handleDownload]);

  const handleApiKeyChange = useCallback((newApiKey: string) => {
    setApiKey(newApiKey);
    const trimmed = newApiKey.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      setGeminiService(new GeminiService(trimmed));
    } else {
      localStorage.removeItem('gemini_api_key');
      setGeminiService(new GeminiService(FALLBACK_API_KEY));
    }
  }, []);

  const removeFile = useCallback((index: number) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index)), []);
  const removeProcessedFile = useCallback((index: number) =>
    setProcessedFiles((prev) => prev.filter((_, i) => i !== index)), []);

  const startEditing = useCallback((index: number) => {
    setEditingIndex(index);
    setProcessedFiles((prev) => {
      setEditedName(prev[index].newName);
      return prev;
    });
  }, []);
  const saveEdit = useCallback(() => {
    setProcessedFiles((prev) => {
      if (editingIndex === null) return prev;
      return prev.map((f, i) => (i === editingIndex ? { ...f, newName: sanitizeFileName(editedName) } : f));
    });
    setEditingIndex(null);
    setEditedName('');
  }, [editingIndex, editedName]);
  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditedName('');
  }, []);

  const clearHistory = useCallback(() => {
    setProcessingHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);


  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-16 md:py-24 flex flex-col gap-10 sm:gap-14 md:gap-16">
        {/* ============ HEADER =========================================== */}
        <header className="relative pt-2 sm:pt-4">
          <h1 className="font-display text-[3rem] sm:text-7xl md:text-8xl leading-[0.9] text-foreground break-words uppercase">
            Renomeador<br /> <span className="bg-primary text-primary-foreground px-2 inline-block brutal-border brutal-shadow">de PDFs</span>
          </h1>
        </header>




        {/* ============ HISTORY TOGGLE =================================== */}
        <div className="flex items-center justify-end border-b border-2 border-foreground pb-4">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="group flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/70 hover:text-foreground transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? 'Ocultar' : 'Histórico'} ({processingHistory.length})
          </button>
        </div>


        {showHistory && processingHistory.length > 0 && (
          <section className="bg-card border border-2 border-foreground p-5 sm:p-8 space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg sm:text-xl text-foreground">Registros anteriores</h3>
              <button
                onClick={clearHistory}
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
            </div>
            <ul className="divide-y divide-foreground">
              {processingHistory.map((item, idx) => (
                <li key={idx} className="py-3 flex items-baseline gap-3 sm:gap-4">
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground w-6 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{item.originalName}</p>
                    <p className="text-sm text-foreground truncate">→ {item.newName}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}



        {/* ============ 02 · UPLOAD ====================================== */}
        <section className="space-y-6">
          <SectionHeader numeral="01" label="Documentos" title="Selecione seus PDFs" />

          <div className="relative group">
            <div
              className={`brutal-border bg-card p-1 transition-all duration-150 ${
                isDragOver ? 'brutal-shadow-lg -translate-x-1 -translate-y-1' : 'brutal-shadow'
              }`}
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-[3px] border-dashed border-foreground p-8 sm:p-12 md:p-16 flex flex-col items-center text-center cursor-pointer transition-colors ${
                  isDragOver ? 'bg-primary/10' : 'bg-background hover:bg-muted'
                }`}
              >
                <div className="mb-6 sm:mb-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 brutal-border brutal-shadow-sm flex items-center justify-center bg-primary">
                    <Upload className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
                  </div>
                </div>


                <div className="space-y-3">
                  <h3 className="font-display text-2xl sm:text-3xl text-foreground">Arquivos PDF</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Arraste e solte seus documentos ou{' '}
                    <span className="text-foreground border-b border-foreground hover:bg-foreground hover:text-background transition-all cursor-pointer px-0.5">
                      selecione localmente
                    </span>
                  </p>
                </div>





                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3 pt-2 animate-fade-in">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {String(selectedFiles.length).padStart(2, '0')} arquivo(s) na fila
                </p>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Limpar
                </button>
              </div>
              <ul className="divide-y divide-foreground border-t border-b border-2 border-foreground">
                {selectedFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center gap-4 py-3">
                    <span className="text-[10px] tabular-nums text-muted-foreground w-6">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <FileText className="w-4 h-4 text-foreground/60 shrink-0" strokeWidth={1.25} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleRenameAll}
                disabled={isProcessing}
                className="w-full h-12 sm:h-14 rounded-none bg-primary text-primary-foreground hover:bg-primary brutal-border brutal-shadow-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:brutal-shadow text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.35em] font-medium"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 sm:mr-3 animate-spin" strokeWidth={1.5} />
                    Processando {currentProgress}/{totalFiles}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 sm:mr-3" strokeWidth={1.5} />
                    Renomear {selectedFiles.length} arquivo(s)
                  </>
                )}
              </Button>


              {isProcessing && (
                <div>
                  <div className="h-px w-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full bg-foreground transition-all duration-300"
                      style={{ width: `${(currentProgress / totalFiles) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-center uppercase tracking-[0.28em] text-muted-foreground mt-3">
                    {currentProgress} de {totalFiles} concluído(s)
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ============ 03 · RESULTS ===================================== */}
        {processedFiles.length > 0 && (
          <section className="space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <SectionHeader
                numeral="02"
                label="Publicado"
                title={`${processedFiles.length} documento(s) renomeado(s)`}
              />
              <button
                onClick={handleDownloadAll}
                className="text-[10px] uppercase tracking-[0.28em] text-foreground border-b border-foreground hover:bg-foreground hover:text-background px-1 py-0.5 transition-all flex items-center gap-2"
              >
                <Download className="w-3 h-3" />
                Baixar todos
              </button>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {processedFiles.map((processed, idx) => (
                <article
                  key={idx}
                  className="relative bg-card brutal-border brutal-shadow p-5 sm:p-6 md:p-8 space-y-5"
                >
                  <span className="absolute -top-3 left-4 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black uppercase brutal-border">Nº {String(idx + 1).padStart(2, '0')}</span>


                  {processed.analysis && (
                    <DocumentInfoDisplay
                      analysisResult={processed.analysis}
                      isLoading={false}
                    />
                  )}

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                      Nome original
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {processed.originalName}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-foreground/70">
                      Sugerido pela IA
                    </p>
                    {editingIndex === idx ? (
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="flex-1 min-w-[160px] h-10 rounded-none border-0 border-2 border-foreground bg-background focus-visible:ring-0 focus-visible:border-foreground text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          className="rounded-none bg-primary text-primary-foreground hover:bg-primary brutal-border brutal-shadow-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:brutal-shadow gap-1 text-[10px] uppercase tracking-[0.2em]"
                        >
                          <Save className="w-3 h-3" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          className="rounded-none"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="flex-1 min-w-0 font-display text-base sm:text-lg text-foreground break-all leading-snug">
                          {processed.newName}
                        </p>
                        <button
                          onClick={() => startEditing(idx)}
                          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                      </div>
                    )}

                  </div>

                  <div className="flex gap-3 pt-2 border-t border-2 border-foreground">
                    <Button
                      onClick={() => handleDownload(processed)}
                      className="flex-1 h-11 rounded-none bg-primary text-primary-foreground hover:bg-primary brutal-border brutal-shadow-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:brutal-shadow text-[10px] uppercase tracking-[0.28em]"
                    >
                      <Download className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} />
                      Baixar arquivo
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => removeProcessedFile(idx)}
                      className="h-11 rounded-none text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ============ FOOTER =========================================== */}
        <footer className="pt-6 sm:pt-8 border-t border-2 border-foreground flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground text-center">
          <span>v2.0 · Editorial</span>
          <span>Processado localmente no navegador</span>
        </footer>

      </div>
    </div>
  );
};

export default PDFRenamer;
