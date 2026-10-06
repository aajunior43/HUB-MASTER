
import React from 'react';
import { LoadingSpinner, GeometricLoader, CodeBlockLoader } from './ui/loading-animations';
import { EnhancedCard } from './ui/enhanced-card';

export const PromptGridSkeleton = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <EnhancedCard 
            key={index} 
            variant="glass" 
            className="h-64 animate-pulse"
            animated={false}
          >
            <div className="space-y-4 p-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 bg-muted/70 rounded animate-pulse" />
                <div className="h-3 bg-muted/50 rounded animate-pulse" />
                <div className="h-3 bg-muted/30 rounded animate-pulse" />
              </div>
              <div className="flex space-x-2 mt-4">
                <div className="h-6 w-12 bg-muted/40 rounded-full animate-pulse" />
                <div className="h-6 w-16 bg-muted/40 rounded-full animate-pulse" />
              </div>
            </div>
          </EnhancedCard>
        ))}
      </div>
    </div>
  );
};

export const CenteredLoader = ({ message = 'Carregando...' }: { message?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <GeometricLoader />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium gradient-text">{message}</p>
        <LoadingSpinner variant="dots" size="sm" />
      </div>
    </div>
  );
};

export const InlineLoader = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner variant="circle" size={size} />
      <span className="text-muted-foreground animate-pulse">Processando...</span>
    </div>
  );
};

export const CodeLoader = () => {
  return (
    <div className="max-w-md mx-auto">
      <CodeBlockLoader />
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">Gerando código...</p>
      </div>
    </div>
  );
};
