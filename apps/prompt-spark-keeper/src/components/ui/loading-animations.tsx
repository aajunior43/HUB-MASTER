
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'dots' | 'pulse' | 'wave';
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'circle',
  className 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (variant === 'circle') {
    return (
      <div className={cn('animate-spin', sizeClasses[size], className)}>
        <svg className="w-full h-full" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="31.416"
            strokeDashoffset="31.416"
            className="animate-[spin_2s_linear_infinite] opacity-25"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="31.416"
            strokeDashoffset="23.562"
            className="animate-[spin_2s_linear_infinite]"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-primary animate-bounce',
              size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('relative', sizeClasses[size], className)}>
        <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75" />
        <div className="relative bg-primary rounded-full w-full h-full animate-pulse" />
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={cn('flex items-end space-x-1', className)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'bg-primary rounded-full animate-pulse',
              size === 'sm' ? 'w-1' : size === 'md' ? 'w-2' : 'w-3'
            )}
            style={{
              height: `${20 + Math.sin(i * 0.5) * 10}px`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

export const GeometricLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center justify-center space-x-4 p-8', className)}>
      {/* Circle */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-muted rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Triangle */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-muted animate-pulse" />
        <div className="absolute w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-primary animate-bounce" />
        <div className="absolute bottom-1 w-2 h-2 bg-primary rounded-full animate-ping" />
      </div>

      {/* Square */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-muted" />
        <div className="absolute inset-2 border-2 border-primary animate-pulse" />
        <div className="absolute top-1/2 right-0 w-2 h-2 bg-primary rounded-full transform translate-x-1/2 -translate-y-1/2 animate-bounce" />
      </div>
    </div>
  );
};

export const CodeBlockLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('bg-card border border-border rounded-lg p-4 font-mono text-sm', className)}>
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-3 h-3 bg-red-500 rounded-full" />
        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
        <div className="w-3 h-3 bg-green-500 rounded-full" />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center">
          <span className="text-green-400">.loader</span>
          <span className="text-purple-400 ml-2">svg</span>
          <span className="text-foreground ml-2">{'{'}</span>
        </div>
        <div className="ml-4 space-y-1">
          <div className="flex items-center">
            <span className="text-blue-400">display:</span>
            <span className="text-orange-400 ml-2">block;</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-400">width:</span>
            <span className="text-orange-400 ml-2">100%;</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-400">height:</span>
            <span className="text-orange-400 ml-2 animate-pulse">100%;</span>
          </div>
        </div>
        <div className="text-foreground">{'}'}</div>
      </div>
    </div>
  );
};
