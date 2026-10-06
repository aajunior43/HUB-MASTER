import { useState, useEffect } from 'react';

export type ViewMode = 'grid' | 'list' | 'compact';

export const useViewMode = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('viewMode') as ViewMode;
    if (saved && ['grid', 'list', 'compact'].includes(saved)) setViewMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : prev === 'list' ? 'compact' : 'grid');
  };

  return { viewMode, setViewMode, toggleViewMode };
};
