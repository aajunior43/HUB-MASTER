
import { useState, useEffect } from 'react';
import { Prompt, CreatePromptData, UpdatePromptData } from '@/types/prompt';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const usePrompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: "Erro ao carregar prompts",
        description: "Não foi possível carregar os prompts. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPrompt = async (data: CreatePromptData): Promise<Prompt> => {
    try {
      const { data: newPrompt, error } = await supabase
        .from('prompts')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => [newPrompt, ...prev]);
      
      toast({
        title: "Prompt criado",
        description: "Seu prompt foi salvo com sucesso!",
      });

      return newPrompt;
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast({
        title: "Erro ao criar prompt",
        description: "Não foi possível salvar o prompt. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createMultiplePrompts = async (promptsData: CreatePromptData[]): Promise<Prompt[]> => {
    try {
      console.log('Creating multiple prompts:', promptsData);
      
      const { data: newPrompts, error } = await supabase
        .from('prompts')
        .insert(promptsData)
        .select();

      if (error) throw error;

      if (!newPrompts || newPrompts.length === 0) {
        throw new Error('Nenhum prompt foi criado');
      }

      setPrompts(prev => [...newPrompts, ...prev]);
      
      toast({
        title: "Prompts criados",
        description: `${newPrompts.length} prompts foram salvos com sucesso!`,
      });

      return newPrompts;
    } catch (error) {
      console.error('Error creating multiple prompts:', error);
      toast({
        title: "Erro ao criar prompts",
        description: "Não foi possível salvar os prompts. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePrompt = async (id: string, data: UpdatePromptData): Promise<Prompt> => {
    try {
      const { data: updatedPrompt, error } = await supabase
        .from('prompts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
      
      toast({
        title: "Prompt atualizado",
        description: "Suas alterações foram salvas!",
      });

      return updatedPrompt;
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({
        title: "Erro ao atualizar prompt",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePrompt = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrompts(prev => prev.filter(p => p.id !== id));
      
      toast({
        title: "Prompt excluído",
        description: "O prompt foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: "Erro ao excluir prompt",
        description: "Não foi possível excluir o prompt. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const searchPrompts = (query: string, category?: string): Prompt[] => {
    let filtered = prompts;

    if (category && category !== 'all') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.content.toLowerCase().includes(searchTerm) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    return filtered;
  };

  return {
    prompts,
    loading,
    createPrompt,
    createMultiplePrompts,
    updatePrompt,
    deletePrompt,
    searchPrompts
  };
};
