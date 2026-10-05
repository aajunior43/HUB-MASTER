import { useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { Archive, Star, RotateCcw } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftColor?: string;
  rightColor?: string;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 64;
const MAX_OFFSET = 80;

export const SwipeableRow = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Favoritar',
  rightLabel = 'Arquivar',
  leftIcon = <Star className="h-4 w-4" />,
  rightIcon = <Archive className="h-4 w-4" />,
  leftColor = 'bg-yellow-400',
  rightColor = 'bg-orange-400',
  disabled = false,
}: SwipeableRowProps) => {
  const startXRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [triggered, setTriggered] = useState<'left' | 'right' | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
    setTriggered(null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || disabled) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx));
    setOffset(clamped);
    if (clamped <= -SWIPE_THRESHOLD) setTriggered('right');
    else if (clamped >= SWIPE_THRESHOLD) setTriggered('left');
    else setTriggered(null);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (triggered === 'right' && onSwipeLeft) {
      onSwipeLeft();
    } else if (triggered === 'left' && onSwipeRight) {
      onSwipeRight();
    }
    setOffset(0);
    setTriggered(null);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action (swipe right) */}
      <div className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 pr-8 ${leftColor} transition-opacity ${offset > 0 ? 'opacity-100' : 'opacity-0'}`} style={{ width: MAX_OFFSET }}>
        <span className="flex flex-col items-center gap-0.5 text-white">
          {leftIcon}
          <span className="text-[9px] font-black">{leftLabel}</span>
        </span>
      </div>

      {/* Right action (swipe left) */}
      <div className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 pl-8 ${rightColor} transition-opacity ${offset < 0 ? 'opacity-100' : 'opacity-0'}`} style={{ width: MAX_OFFSET }}>
        <span className="flex flex-col items-center gap-0.5 text-white">
          {rightIcon}
          <span className="text-[9px] font-black">{rightLabel}</span>
        </span>
      </div>

      {/* Content */}
      <div
        style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.25s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};
