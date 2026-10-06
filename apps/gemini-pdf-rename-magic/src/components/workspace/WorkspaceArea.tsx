
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Settings, Key, Package } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import FileUpload from '../FileUpload';
import BatchProcessor from '../BatchProcessor';
import { AdvancedSettings } from './AdvancedSettings';

interface WorkspaceAreaProps {
  hasValidApiKey: boolean;
  geminiApiKey: string;
  onFileProcess: (file: File) => Promise<string>;
}

export const WorkspaceArea = ({ 
  hasValidApiKey, 
  geminiApiKey, 
  onFileProcess 
}: WorkspaceAreaProps) => {
  const [activeTab, setActiveTab] = useState('upload');
  const { state } = useSidebar();
  
  // Dynamic classes based on sidebar state - optimized for workspace expansion
  const containerClasses = `
    h-full flex flex-col transition-all duration-300 ease-in-out
    ${state === 'collapsed' 
      ? 'max-w-none w-full px-2 md:px-4 lg:px-6' 
      : 'max-w-6xl mx-auto px-4'
    }
  `;

  return (
    <div className={containerClasses}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Responsive Tab Navigation */}
        <div className="mb-6 flex-shrink-0">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-muted/30 p-1 rounded-lg border border-border/30 md:max-w-lg">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 py-2 px-2 md:px-3"
            >
              <Upload className="h-4 w-4" />
              <span className="font-medium text-xs md:text-sm">Individual</span>
            </TabsTrigger>
            <TabsTrigger 
              value="batch" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 py-2 px-2 md:px-3"
            >
              <Package className="h-4 w-4" />
              <span className="font-medium text-xs md:text-sm">Lote</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 py-2 px-2 md:px-3"
            >
              <Settings className="h-4 w-4" />
              <span className="font-medium text-xs md:text-sm">Avançado</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Upload Tab Content - Optimized and Responsive Grid */}
        <TabsContent value="upload" className="mt-0 flex-1 flex flex-col">
          <div className={`flex-1 transition-all duration-300 ease-in-out ${
            state === 'collapsed' 
              ? 'grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6' 
              : 'grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6'
          }`}>
            {/* Main Upload Area - Prioritized with dynamic sizing */}
            <div className={`${
              state === 'collapsed' 
                ? 'xl:col-span-9 2xl:col-span-10' 
                : 'lg:col-span-8 xl:col-span-9'
            }`}>
              <Card className="minimal-card border-border/40 shadow-subtle h-full">
                <CardHeader className="text-center pb-4 px-4 md:px-6">
                  <CardTitle className="flex flex-col items-center gap-3 text-lg md:text-xl lg:text-2xl">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                      <Upload className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Processamento Individual</span>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1 font-normal">
                        Processe um arquivo por vez com IA
                      </p>
                    </div>
                  </CardTitle>
                  
                  {/* Status Indicator - Minimalist */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className={`w-2 h-2 rounded-full transition-colors ${
                      hasValidApiKey ? 'bg-success' : 'bg-destructive'
                    }`}></div>
                    <span className={`text-xs md:text-sm font-medium transition-colors ${
                      hasValidApiKey ? 'text-success' : 'text-destructive'
                    }`}>
                      {hasValidApiKey ? 'Sistema Pronto' : 'Configure API'}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="px-4 md:px-6 pb-6 flex-1">
                  {hasValidApiKey ? (
                    <div className="h-full flex flex-col">
                      <FileUpload 
                        onFileProcess={onFileProcess}
                        // Habilita o upload quando há fallback ativo
                        apiKey={hasValidApiKey ? 'fallback' : geminiApiKey}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-destructive/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-destructive/20">
                        <Key className="h-6 w-6 md:h-8 md:w-8 text-destructive" />
                      </div>
                      <h3 className="text-base md:text-lg font-semibold text-foreground mb-3">
                        Configure a API
                      </h3>
                      <p className="text-muted-foreground text-xs md:text-sm max-w-sm mx-auto leading-relaxed mb-4">
                        Configure sua chave API do Gemini na barra lateral para começar a usar o sistema.
                      </p>
                      <div className="p-3 bg-warning/5 rounded-lg border border-warning/20 max-w-xs mx-auto">
                        <div className="text-warning text-xs">
                          💡 Use o painel de configuração ao lado
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Features Panel - Responsive and Collapsible */}
            <div className={`${
              state === 'collapsed' 
                ? 'xl:col-span-3 2xl:col-span-2' 
                : 'lg:col-span-4 xl:col-span-3'
            } ${state === 'collapsed' ? 'hidden xl:block' : ''}`}>
              <Card className="minimal-card border-border/40 shadow-subtle h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Recursos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30 transition-minimal hover:bg-muted/30">
                      <div className="text-base">📄</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">Múltiplos Formatos</div>
                        <div className="text-xs text-muted-foreground">PDF, Word, Imagens</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30 transition-minimal hover:bg-muted/30">
                      <div className="text-base">⚡</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">Processamento Rápido</div>
                        <div className="text-xs text-muted-foreground">IA otimizada</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30 transition-minimal hover:bg-muted/30">
                      <div className="text-base">🎯</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">IA Precisa</div>
                        <div className="text-xs text-muted-foreground">Nomes inteligentes</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Batch Processing Tab Content - Optimized Layout */}
        <TabsContent value="batch" className="mt-0 flex-1">
          {hasValidApiKey ? (
            <div className={`h-full transition-all duration-300 ease-in-out ${
              state === 'collapsed' ? 'max-w-none' : 'max-w-5xl mx-auto'
            }`}>
              <BatchProcessor onFileProcess={onFileProcess} />
            </div>
          ) : (
            <Card className="minimal-card border-border/40 shadow-subtle h-full">
              <CardContent className="p-6 md:p-8 flex items-center justify-center h-full">
                <div className="text-center py-8 md:py-12">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-destructive/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-destructive/20">
                    <Key className="h-6 w-6 md:h-8 md:w-8 text-destructive" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-3">
                    Configure a API
                  </h3>
                  <p className="text-muted-foreground text-xs md:text-sm max-w-sm mx-auto leading-relaxed mb-4">
                    Configure sua chave API do Gemini na barra lateral para usar o processamento em lote.
                  </p>
                  <div className="p-3 bg-warning/5 rounded-lg border border-warning/20 max-w-xs mx-auto">
                    <div className="text-warning text-xs">
                      💡 Use o painel de configuração ao lado
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab Content - Optimized Layout */}
        <TabsContent value="settings" className="mt-0 flex-1">
          <div className={`h-full transition-all duration-300 ease-in-out ${
            state === 'collapsed' ? 'max-w-none' : 'max-w-4xl mx-auto'
          }`}>
            <Card className="minimal-card border-border/40 shadow-subtle h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Configurações Avançadas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 flex-1">
                <AdvancedSettings />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
