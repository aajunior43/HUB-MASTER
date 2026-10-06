
import React, { useState, useCallback } from 'react';
import { api, Tag as ApiTag } from '@/integrations/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Tag extends ApiTag {
  count: number;
}

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTags = async () => {
    if (!user) return;
    try {
      const data = await api.tags.list();
      setTags((data || []).map(tag => ({ ...tag, count: 0 })));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  React.useEffect(() => {
    loadTags();
  }, [user]);

  const addTag = useCallback(async (name: string) => {
    if (!user) return null;

    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];

    const existingTag = tags.find(tag => tag.name.toLowerCase() === name.toLowerCase());
    if (existingTag) return existingTag;

    try {
      const data = await api.tags.create(name.trim(), colors[Math.floor(Math.random() * colors.length)]);
      const newTag = { ...data, count: 0 };
      setTags(prev => [...prev, newTag]);
      return newTag;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "ERRO AO CRIAR TAG",
        description: "Erro ao criar tag.",
        variant: "destructive",
      });
      return null;
    }
  }, [tags, user, toast]);

  const removeTag = useCallback(async (tagId: string) => {
    if (!user) return;
    try {
      await api.tags.delete(tagId);
      setTags(prev => prev.filter(tag => tag.id !== tagId));
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "ERRO AO EXCLUIR TAG",
        description: "Erro ao excluir tag.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const updateTagCounts = useCallback((linkTags: string[][]) => {
    setTags(prev => prev.map(tag => ({
      ...tag,
      count: linkTags.filter(linkTagIds => linkTagIds.includes(tag.id)).length
    })));
  }, []);

  const getTagsByIds = useCallback((tagIds: string[]) => {
    return tags.filter(tag => tagIds.includes(tag.id));
  }, [tags]);

  return {
    tags,
    addTag,
    removeTag,
    updateTagCounts,
    getTagsByIds,
    loadTags,
  };
};
