import { useEffect, useState, useCallback } from 'react';
import { toast } from "@/hooks/use-toast";
import { db } from "@/integrations/db/client";

export interface SavedData {
  solicitantes: string[];
  empresas: string[];
  observacoes: string[];
}

export const useDataManager = () => {
  const [savedData, setSavedData] = useState<SavedData>({
    solicitantes: [],
    empresas: [],
    observacoes: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, e, o] = await Promise.all([
      db.from<{ nome: string }>('solicitantes').select('nome').order('nome'),
      db.from<{ nome: string }>('empresas').select('nome').order('nome'),
      db.from<{ texto: string }>('observacoes').select('texto').order('created_at', { ascending: false }),
    ]);
    setSavedData({
      solicitantes: (s.data ?? []).map((r) => r.nome),
      empresas: (e.data ?? []).map((r) => r.nome),
      observacoes: (o.data ?? []).map((r) => r.texto),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = db
      .channel('data-manager-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitantes' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresas' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'observacoes' }, () => fetchAll())
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [fetchAll]);

  const addSolicitante = useCallback(async (nome: string) => {
    const v = nome.trim();
    if (!v) return;
    const { error } = await db.from('solicitantes').insert({ nome: v });
    if (error && error.code !== '23505') {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setSavedData((p) => p.solicitantes.includes(v) ? p : { ...p, solicitantes: [...p.solicitantes, v].sort() });
    toast({ title: "Solicitante salvo", description: `${v} foi salvo no banco.` });
  }, []);

  const addEmpresa = useCallback(async (nome: string) => {
    const v = nome.trim();
    if (!v) return;
    const { error } = await db.from('empresas').insert({ nome: v });
    if (error && error.code !== '23505') {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setSavedData((p) => p.empresas.includes(v) ? p : { ...p, empresas: [...p.empresas, v].sort() });
    toast({ title: "Empresa salva", description: `${v} foi salva no banco.` });
  }, []);

  const addObservacao = useCallback(async (texto: string) => {
    const v = texto.trim();
    if (!v) return;
    const { error } = await db.from('observacoes').insert({ texto: v });
    if (error && error.code !== '23505') {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setSavedData((p) => p.observacoes.includes(v) ? p : { ...p, observacoes: [v, ...p.observacoes] });
    toast({ title: "Observação salva", description: "Observação salva no banco." });
  }, []);

  const removeSolicitante = useCallback(async (nome: string) => {
    await db.from('solicitantes').delete().eq('nome', nome);
    setSavedData((p) => ({ ...p, solicitantes: p.solicitantes.filter((s) => s !== nome) }));
    toast({ title: "Solicitante removido", description: `${nome} foi removido.` });
  }, []);

  const removeEmpresa = useCallback(async (nome: string) => {
    await db.from('empresas').delete().eq('nome', nome);
    setSavedData((p) => ({ ...p, empresas: p.empresas.filter((e) => e !== nome) }));
    toast({ title: "Empresa removida", description: `${nome} foi removida.` });
  }, []);

  const removeObservacao = useCallback(async (texto: string) => {
    await db.from('observacoes').delete().eq('texto', texto);
    setSavedData((p) => ({ ...p, observacoes: p.observacoes.filter((o) => o !== texto) }));
    toast({ title: "Observação removida", description: "Observação removida." });
  }, []);

  const exportData = useCallback(() => {
    try {
      const dataToExport = { ...savedData, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_dados_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Backup exportado", description: "Dados baixados com sucesso." });
    } catch (error) {
      toast({ title: "Erro ao exportar", description: String(error), variant: "destructive" });
    }
  }, [savedData]);

  const importData = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          const sol = Array.isArray(parsed.solicitantes) ? parsed.solicitantes.filter(Boolean) : [];
          const emp = Array.isArray(parsed.empresas) ? parsed.empresas.filter(Boolean) : [];
          const obs = Array.isArray(parsed.observacoes) ? parsed.observacoes.filter(Boolean) : [];

          if (sol.length) await db.from('solicitantes').upsert(sol.map((nome: string) => ({ nome })), { onConflict: 'nome', ignoreDuplicates: true });
          if (emp.length) await db.from('empresas').upsert(emp.map((nome: string) => ({ nome })), { onConflict: 'nome', ignoreDuplicates: true });
          if (obs.length) await db.from('observacoes').upsert(obs.map((texto: string) => ({ texto })), { onConflict: 'texto', ignoreDuplicates: true });

          await fetchAll();
          toast({ title: "Dados importados", description: `${sol.length} solicitantes, ${emp.length} empresas, ${obs.length} observações.` });
          resolve();
        } catch (error) {
          toast({ title: "Erro ao importar", description: "JSON inválido ou corrompido.", variant: "destructive" });
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('read error'));
      reader.readAsText(file);
    });
  }, [fetchAll]);

  return {
    savedData,
    loading,
    addSolicitante,
    addEmpresa,
    addObservacao,
    removeSolicitante,
    removeEmpresa,
    removeObservacao,
    exportData,
    importData,
    refresh: fetchAll,
  };
};
