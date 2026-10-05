import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MinimalProgress, 
  MinimalSpinner, 
  ProcessingIndicator, 
  BatchProgress 
} from './minimal-progress';
import { LoadingState, ProcessingState, MinimalSkeleton } from './loading-states';

export const ProgressDemo: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsProcessing(false);
            return 0;
          }
          return prev + 10;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const startProcessing = () => {
    setProgress(0);
    setIsProcessing(true);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Demonstração dos Indicadores de Progresso Minimalistas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* MinimalProgress Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">MinimalProgress</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Básico (50%)</p>
                <MinimalProgress value={50} />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Com porcentagem</p>
                <MinimalProgress value={75} showPercentage />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Com label</p>
                <MinimalProgress value={30} label="Processando arquivo..." />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Variante de sucesso</p>
                <MinimalProgress value={100} variant="success" showPercentage />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Variante de erro</p>
                <MinimalProgress value={25} variant="destructive" showPercentage />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tamanho extra pequeno</p>
                <MinimalProgress value={60} size="xs" showPercentage />
              </div>
            </div>
          </div>

          {/* MinimalSpinner Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">MinimalSpinner</h3>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Extra pequeno</p>
                <MinimalSpinner size="xs" />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Pequeno</p>
                <MinimalSpinner size="sm" />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Médio</p>
                <MinimalSpinner size="md" />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Grande</p>
                <MinimalSpinner size="lg" />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Sucesso</p>
                <MinimalSpinner variant="success" />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Aviso</p>
                <MinimalSpinner variant="warning" />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Erro</p>
                <MinimalSpinner variant="destructive" />
              </div>
            </div>
          </div>

          {/* ProcessingIndicator Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">ProcessingIndicator</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Processando com progresso</p>
                <ProcessingIndicator 
                  isProcessing={true} 
                  progress={progress} 
                  label="Processando arquivo..."
                />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Apenas spinner</p>
                <ProcessingIndicator 
                  isProcessing={true} 
                  label="Carregando..."
                />
              </div>
              
              <Button onClick={startProcessing} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Iniciar Processamento'}
              </Button>
            </div>
          </div>

          {/* BatchProgress Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">BatchProgress</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Progresso de lote com detalhes</p>
                <BatchProgress
                  total={20}
                  completed={12}
                  processing={3}
                  errors={2}
                  showDetails={true}
                />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Progresso simples</p>
                <BatchProgress
                  total={10}
                  completed={7}
                  processing={1}
                  errors={0}
                  showDetails={false}
                />
              </div>
            </div>
          </div>

          {/* Loading States Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Estados de Carregamento</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">LoadingState</p>
                <Button onClick={() => setShowLoading(!showLoading)}>
                  {showLoading ? 'Parar' : 'Mostrar'} Loading
                </Button>
                <LoadingState isLoading={showLoading} loadingText="Carregando dados...">
                  <p className="text-sm">Conteúdo carregado!</p>
                </LoadingState>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">ProcessingState</p>
                <ProcessingState 
                  isProcessing={isProcessing} 
                  progress={progress}
                  processingText="Processando arquivo..."
                >
                  <p className="text-sm">Processamento concluído!</p>
                </ProcessingState>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">MinimalSkeleton</p>
                <MinimalSkeleton lines={3} />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};