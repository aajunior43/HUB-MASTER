import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const usePinOrder = () => {
  const { user } = useAuth();
  const storageKey = `pin-order:${user?.id ?? 'anonymous'}`;
  const [order, setOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });
  useEffect(() => {
    try { setOrder(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { setOrder([]); }
  }, [storageKey]);

  const reorder = useCallback((ids: string[]) => {
    setOrder(ids);
    localStorage.setItem(storageKey, JSON.stringify(ids));
  }, [storageKey]);

  const applyOrder = useCallback((pinnedLinks: { id: string }[]) => {
    const pinnedIds = pinnedLinks.map(l => l.id);
    const sorted = [
      ...order.filter(id => pinnedIds.includes(id)),
      ...pinnedIds.filter(id => !order.includes(id)),
    ];
    return sorted.map(id => pinnedLinks.find(l => l.id === id)!).filter(Boolean);
  }, [order]);

  return { reorder, applyOrder };
};
