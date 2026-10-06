import React, { type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
  gold: { base: 42, spread: 60 },
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

type GlowCardStyle = CSSProperties & Record<`--${string}`, string | number>;

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'gold',
  size = 'md',
  width,
  height,
  customSize = false,
}) => {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      style={style}
      className={cn(
        'rounded-2xl relative overflow-hidden bg-card border border-border/60',
        customSize ? 'p-0' : cn(sizeMap[size], 'aspect-[3/4] grid grid-rows-[1fr_auto] p-4 gap-4'),
        className,
      )}
    >
      {children}
    </div>
  );
};


export { GlowCard };
