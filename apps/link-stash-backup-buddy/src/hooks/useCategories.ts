import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Category } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type { Category };

const normalizeCategoryName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();

export const useCategories = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['categories', user?.id] as const;
  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: () => api.categories.list(),
  });
  const categories = query.data ?? [];
  const findCategoryByName = (name: string) => {
    const target = normalizeCategoryName(name);
    return categories.find((category) => normalizeCategoryName(category.name) === target) ?? null;
  };

  const addCategory = async (name: string, color: string) => {
    if (!user) return null;
    const existing = findCategoryByName(name);
    if (existing) return existing;
    try {
      const created = await api.categories.create(normalizeCategoryName(name), color);
      queryClient.setQueryData<Category[]>(queryKey, (current = []) => [...current, created]);
      toast({ title: 'Categoria criada', description: `"${name}" adicionada.` });
      return created;
    } catch {
      toast({ title: 'Erro ao criar', description: 'Não foi possível criar a categoria.', variant: 'destructive' });
      return null;
    }
  };

  const removeCategory = async (id: string) => {
    await api.categories.delete(id);
    queryClient.setQueryData<Category[]>(queryKey, (current = []) => current.filter((item) => item.id !== id));
    toast({ title: 'Categoria excluída' });
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const updated = await api.categories.update(id, updates);
    queryClient.setQueryData<Category[]>(queryKey, (current = []) =>
      current.map((item) => item.id === id ? updated : item),
    );
    toast({ title: 'Categoria atualizada' });
  };

  return {
    categories,
    addCategory,
    removeCategory,
    updateCategory,
    loadCategories: query.refetch,
    findCategoryByName,
    normalizeCategoryName,
    getOrCreateCategory: async (name: string, color: string) => findCategoryByName(name) ?? addCategory(name, color),
  };
};
