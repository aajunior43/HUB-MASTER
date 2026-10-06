import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';

export function useFolders() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['folders', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: () => api.folders.list(),
  });
  return { folders: query.data ?? [], reloadFolders: query.refetch };
}
