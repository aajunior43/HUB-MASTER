import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Envolve uma promise do Supabase, mostrando toast em erro
 * e retornando null nesse caso. Reduz o try/if/toast repetido nas páginas.
 */
export async function withToast<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T | null> {
  const { data, error } = await promise;
  if (error) {
    toast.error(error.message);
    return null;
  }
  return data;
}

interface UseAsyncListOptions<T> {
  /** Função de carregamento; deve retornar a lista ou null (erro). */
  fetcher: () => Promise<T[] | null>;
  /** Dispara o load quando qualquer valor deste array mudar. */
  deps?: unknown[];
  /** Se false, não dispara o load automático. Default: true. */
  enabled?: boolean;
}

/**
 * Padrão "lista + loading + reload" usado em Notes / Prompts / Reminders.
 */
export function useAsyncList<T>({ fetcher, deps = [], enabled = true }: UseAsyncListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetcher();
    if (data) setItems(data);
    setLoading(false);
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { items, setItems, loading, reload };
}
