
import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface EnhancedCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  animated?: boolean;
}

export const EnhancedCard = ({ 
  children, 
  title, 
  className, 
  variant = 'default',
  animated = true 
}: EnhancedCardProps) => {
  const variantClasses = {
    default: 'bg-card border-border',
    glass: 'glass-effect',
    gradient: 'bg-gradient-to-br from-card via-card to-accent/10 border-border/50',
    elevated: 'bg-card border-border shadow-lg hover:shadow-xl'
  };

  const animationClasses = animated 
    ? 'smooth-transition hover-lift animate-fade-in' 
    : '';

  return (
    <Card className={cn(
      'relative overflow-hidden',
      variantClasses[variant],
      animationClasses,
      className
    )}>
      {variant === 'gradient' && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      )}
      
      {title && (
        <CardHeader>
          <CardTitle className="gradient-text">{title}</CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="relative">
        {children}
      </CardContent>
    </Card>
  );
};
