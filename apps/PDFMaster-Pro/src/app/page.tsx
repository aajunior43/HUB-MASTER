'use client';

import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { FileText, Settings, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';
import PDFViewer from '@/components/PDFViewer';
import FileUpload from '@/components/FileUpload';

// Lazy load heavy components
const ConversionTools = lazy(() => import('@/components/ConversionTools'));
const SecurityTools = lazy(() => import('@/components/SecurityTools'));
const SignatureTools = lazy(() => import('@/components/SignatureTools'));

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [activeTool, setActiveTool] = useState<string>('select');
  const [showConversionTools, setShowConversionTools] = useState(false);
  const [showSecurityTools, setShowSecurityTools] = useState(false);
  const [showSignatureTools, setShowSignatureTools] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    try {
      setError(null);
      setIsLoading(true);

      // Validate file type
      if (!file.type.includes('pdf')) {
        throw new Error('Por favor, selecione apenas arquivos PDF.');
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. O tamanho máximo é 50MB.');
      }

      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUrlLoad = useCallback(async (url: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // Validate URL format
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(url)) {
        throw new Error('URL inválida. Use uma URL que comece com http:// ou https://');
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ao carregar URL: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('pdf')) {
        throw new Error('A URL não contém um arquivo PDF válido.');
      }

      const blob = await response.blob();
      const file = new File([blob], 'document.pdf', { type: 'application/pdf' });
      handleFileSelect(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar PDF da URL');
      setIsLoading(false);
    }
  }, [handleFileSelect]);

  const handleToolAction = useCallback((action: string) => {
    try {
      setError(null);

      // Check if PDF is loaded for actions that require it
      if (!pdfFile && ['convert', 'protect', 'signature', 'download', 'share'].includes(action)) {
        throw new Error('Por favor, carregue um arquivo PDF primeiro.');
      }

      switch (action) {
        case 'convert':
          setShowConversionTools(true);
          break;
        case 'protect':
          setShowSecurityTools(true);
          break;
        case 'signature':
          setShowSignatureTools(true);
          break;
        case 'download':
          handleDownload();
          break;
        case 'share':
          handleShare();
          break;
        default:
          setActiveTool(action);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar ação');
    }
  }, [pdfFile]);

  const handleDownload = useCallback(() => {
    if (!pdfFile) return;

    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = pdfFile.name;
      link.click();
    } catch (err) {
      setError('Erro ao fazer download do arquivo');
    }
  }, [pdfFile, pdfUrl]);

  const handleShare = useCallback(async () => {
    if (!pdfFile) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: pdfFile.name,
          text: 'Compartilhando documento PDF',
          files: [pdfFile],
        });
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // You might want to show a toast here
        alert('Link copiado para a área de transferência!');
      }
    } catch (err) {
      setError('Erro ao compartilhar arquivo');
    }
  }, [pdfFile]);

  const handleSignatureCreate = useCallback((signatureData: string) => {
    try {
      setError(null);
      console.log('Signature created:', signatureData);
      setActiveTool('signature');
      setShowSignatureTools(false);
    } catch (err) {
      setError('Erro ao criar assinatura');
    }
  }, []);

  // Memoized computed values
  const fileInfo = useMemo(() => {
    if (!pdfFile) return null;
    return {
      name: pdfFile.name,
      size: (pdfFile.size / 1024 / 1024).toFixed(1) + ' MB',
    };
  }, [pdfFile]);

  const isToolModalOpen = useMemo(() => {
    return showConversionTools || showSecurityTools || showSignatureTools;
  }, [showConversionTools, showSecurityTools, showSignatureTools]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">PDFMaster Pro</h1>
              <span className="hidden sm:inline-flex ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                v2.0
              </span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {fileInfo && (
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span className="max-w-32 truncate">{fileInfo.name}</span>
                  <span className="text-gray-400">•</span>
                  <span>{fileInfo.size}</span>
                </div>
              )}

              <button
                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                aria-label="Configurações"
                title="Configurações"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Global Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 shadow-xl"
            >
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                <span className="text-gray-900 font-medium">Processando...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 max-w-md w-full mx-4"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className="flex h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden"
        role="main"
        aria-label="Área principal do aplicativo"
      >
        {/* Sidebar */}
        <AnimatePresence>
          {pdfFile && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden lg:block"
            >
              <nav role="navigation" aria-label="Ferramentas de edição PDF">
                <Sidebar
                  isOpen={true}
                  onToggle={() => {}}
                  currentTool={activeTool}
                  onToolChange={handleToolAction}
                />
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <section
          className="flex-1 flex flex-col min-w-0"
          role="document"
          aria-label={pdfFile ? `Visualizador PDF - ${pdfFile.name}` : "Área de upload de PDF"}
        >
          <AnimatePresence mode="wait">
            {pdfFile ? (
              <motion.div
                key="pdf-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex-1 flex flex-col h-full"
              >
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="block lg:hidden"
                >
                  <Toolbar
                    currentTool={activeTool}
                    onToolChange={setActiveTool}
                    pdfFile={pdfFile}
                  />
                </motion.div>
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="hidden lg:block"
                >
                  <Toolbar
                    currentTool={activeTool}
                    onToolChange={setActiveTool}
                    pdfFile={pdfFile}
                  />
                </motion.div>
                <PDFViewer
                  pdfUrl={pdfUrl}
                  currentTool={activeTool}
                />
              </motion.div>
            ) : (
              <motion.div
                key="welcome-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex-1 flex items-center justify-center p-4 sm:p-8"
              >
                <div className="max-w-2xl w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-center mb-6 sm:mb-8"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 150 }}
                      className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"
                    >
                      <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4"
                    >
                      Bem-vindo ao PDFMaster Pro
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                      className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8"
                    >
                      A solução completa para visualizar, editar e converter seus documentos PDF
                    </motion.p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                  >
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      onUrlLoad={handleUrlLoad}
                      acceptedTypes={['.pdf']}
                      maxSize={50}
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showConversionTools && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    <span className="text-gray-900 font-medium">Carregando ferramenta...</span>
                  </div>
                </div>
              </div>
            }>
              <ConversionTools
                pdfFile={pdfFile}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSecurityTools && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    <span className="text-gray-900 font-medium">Carregando ferramenta...</span>
                  </div>
                </div>
              </div>
            }>
              <SecurityTools
                pdfFile={pdfFile}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignatureTools && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    <span className="text-gray-900 font-medium">Carregando ferramenta...</span>
                  </div>
                </div>
              </div>
            }>
              <SignatureTools
                isOpen={showSignatureTools}
                onClose={() => setShowSignatureTools(false)}
                onSignatureCreate={handleSignatureCreate}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen reader live regions for status updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading && "Carregando arquivo PDF..."}
        {error && `Erro: ${error}`}
        {pdfFile && `PDF carregado: ${pdfFile.name}`}
      </div>

      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {activeTool !== 'select' && `Ferramenta ativa: ${activeTool}`}
      </div>
    </div>
  );
}
