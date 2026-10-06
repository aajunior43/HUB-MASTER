import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Link } from '@/types/link';

export type LinkHealthResult = {
  link_id: string;
  status: 'healthy' | 'broken' | 'redirected' | 'unknown';
  status_code: number | null;
  final_url: string | null;
  reason: string | null;
  latency_ms: number;
  checked_at: string;
};

export function useBrokenLinksChecker(links: Link[]) {
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, LinkHealthResult>>({});
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const brokenLinkIds = useMemo(
    () => new Set(Object.values(results).filter((item) => item.status === 'broken').map((item) => item.link_id)),
    [results],
  );

  const checkBrokenLinks = useCallback(async (linkIds?: string[]) => {
    const ids = linkIds?.length ? linkIds : links.filter((link) => !link.deleted_at).map((link) => link.id);
    if (isCheckingLinks || ids.length === 0) return;
    setIsCheckingLinks(true);
    try {
      const aggregate: LinkHealthResult[] = [];
      for (let i = 0; i < ids.length; i += 50) {
        const { data, error } = await supabase.functions.invoke('check-link-health', {
          body: { link_ids: ids.slice(i, i + 50) },
        });
        if (error) throw error;
        aggregate.push(...((data?.results ?? []) as LinkHealthResult[]));
      }
      setResults((current) => ({
        ...current,
        ...Object.fromEntries(aggregate.map((item) => [item.link_id, item])),
      }));
      const broken = aggregate.filter((item) => item.status === 'broken').length;
      const redirected = aggregate.filter((item) => item.status === 'redirected').length;
      toast({
        title: 'Monitoramento concluído',
        description: broken
          ? `${broken} link(s) com falha${redirected ? ` e ${redirected} redirecionado(s)` : ''}.`
          : `${aggregate.length} link(s) verificados sem falhas.`,
      });
    } catch (error) {
      toast({
        title: 'Monitoramento indisponível',
        description: error instanceof Error ? error.message : 'Publique a função de verificação no Supabase.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingLinks(false);
    }
  }, [isCheckingLinks, links, toast]);

  return { brokenLinkIds, healthResults: results, isCheckingLinks, checkBrokenLinks };
}
