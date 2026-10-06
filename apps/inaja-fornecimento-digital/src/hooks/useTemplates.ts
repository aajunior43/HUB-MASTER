import { useEffect, useState, useCallback } from 'react';
import { toast } from "@/hooks/use-toast";
import { db } from "@/integrations/db/client";
import type { SolicitationFormData, SolicitationItem } from "@/types/solicitacao";

export interface TemplateData {
  id: string;
  name: string;
  formData: SolicitationFormData;
  items: SolicitationItem[];
  createdAt: string;
}

interface ModeloRow {
  id: string;
  nome: string;
  form_data: SolicitationFormData;
  items: SolicitationItem[];
  created_at: string;
}

export const useTemplates = () => {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from<ModeloRow>('modelos')
      .select('id, nome, form_data, items, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar modelos", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setTemplates(
      (data ?? []).map((r) => ({
        id: r.id,
        name: r.nome,
        formData: r.form_data,
        items: r.items,
        createdAt: r.created_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveTemplate = useCallback(async (templateName: string, formData: SolicitationFormData, items: SolicitationItem[]) => {
    const name = templateName.trim();
    if (!name) return;
    const { error } = await db
      .from('modelos')
      .upsert({ nome: name, form_data: formData, items }, { onConflict: 'nome' });
    if (error) {
      toast({ title: "Erro ao salvar modelo", description: error.message, variant: "destructive" });
      return;
    }
    await fetchAll();
    toast({ title: "Modelo salvo", description: `"${name}" salvo no banco.` });
  }, [fetchAll]);

  const deleteTemplate = useCallback(async (id: string) => {
    await db.from('modelos').delete().eq('id', id);
    setTemplates((p) => p.filter((t) => t.id !== id));
    toast({ title: "Modelo removido" });
  }, []);

  const loadTemplate = useCallback((file: File): Promise<TemplateData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const template = JSON.parse(e.target?.result as string);
          resolve(template);
          toast({ title: "Modelo carregado", description: `"${template.name}" pronto para uso.` });
        } catch {
          reject(new Error('Arquivo JSON inválido'));
          toast({ title: "Erro ao carregar modelo", description: "Arquivo inválido.", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    });
  }, []);

  return { templates, loading, saveTemplate, deleteTemplate, loadTemplate, refresh: fetchAll };
};
