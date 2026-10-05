import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['link-favorites', user?.id] as const;
  const storageKey = `offline-favorites:${user?.id ?? 'anonymous'}`;

  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const ids = await api.links.favoriteIds();
        localStorage.setItem(storageKey, JSON.stringify(ids));
        return ids;
      } catch (error) {
        const cached = localStorage.getItem(storageKey);
        if (cached) return JSON.parse(cached) as string[];
        throw error;
      }
    },
    initialData: () => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
      } catch {
        return [];
      }
    },
  });

  const favoriteIds = query.data ?? [];

  const mutation = useMutation({
    mutationFn: (linkId: string) => api.links.toggleFavorite(linkId),
    onMutate: async (linkId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey) ?? [];
      const next = previous.includes(linkId)
        ? previous.filter((id) => id !== linkId)
        : [...previous, linkId];
      queryClient.setQueryData(queryKey, next);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return { previous };
    },
    onError: (_error, _linkId, context) => {
      const previous = context?.previous ?? [];
      queryClient.setQueryData(queryKey, previous);
      localStorage.setItem(storageKey, JSON.stringify(previous));
    },
  });

  const setFavorite = async (linkId: string, value: boolean) => {
    await api.links.update(linkId, { is_favorite: value });
    queryClient.setQueryData<string[]>(queryKey, (current = []) =>
      value ? Array.from(new Set([...current, linkId])) : current.filter((id) => id !== linkId),
    );
  };

  return {
    favoriteIds,
    toggleFavorite: (linkId: string) => mutation.mutateAsync(linkId),
    isFavorite: (linkId: string) => favoriteIds.includes(linkId),
    addToFavorites: (linkId: string) => setFavorite(linkId, true),
    removeFromFavorites: (linkId: string) => setFavorite(linkId, false),
    loadFavorites: () => query.refetch(),
    isUpdatingFavorite: mutation.isPending,
  };
};
