import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Search, RefreshCw, FileText, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { db } from '@/integrations/db/client';
import { moeda } from '@/lib/empenhos';
import { generateRequestPDF } from '@/lib/pdfGenerator';
import { useAuth } from '@/contexts/AuthContext';
import type { DuplicatePayload, SolicitationRecord } from '@/types/solicitacao';

export type { DuplicatePayload };

type HistoryRow = SolicitationRecord & { created_at: string };

export function HistoryView({ fontSize, onDuplicate }: { fontSize: number; onDuplicate?: (payload: DuplicatePayload) => void }) {
  const { user } = useAuth();
  const { confirm, confirmElement } = useConfirm();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from<HistoryRow>('solicitacoes')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao carregar histórico', description: error.message, variant: 'destructive' });
      return;
    }
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const channel = db
      .channel('solicitacoes-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => load())
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.solicitante?.toLowerCase().includes(q) ||
      r.empresa?.toLowerCase().includes(q) ||
      r.data_solicitacao?.toLowerCase().includes(q) ||
      (r.observacoes || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const requestFromRow = (r: HistoryRow) => ({
    solicitante: r.solicitante,
    empresa: r.empresa,
    dataSolicitacao: r.data_solicitacao,
    observacoes: r.observacoes || '',
    items: Array.isArray(r.items) ? r.items : [],
    assinatura: r.assinatura || null,
    anexos: Array.isArray(r.anexos) ? r.anexos : [],
  });

  const reprint = async (r: HistoryRow) => {
    try {
      await generateRequestPDF(
        requestFromRow(r),
        fontSize,
        `Solicitacao_${r.data_solicitacao.replace(/\//g, '')}_${r.solicitante.replace(/\s+/g, '_')}.pdf`,
      );
      toast({ title: 'PDF reimpresso', description: 'Arquivo baixado com sucesso.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao reimprimir', description: 'Tente novamente.', variant: 'destructive' });
    }
  };
  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Excluir solicitação', description: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir' }))) return;
    const { error } = await db.from('solicitacoes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast({ title: 'Excluído', description: 'Solicitação removida do histórico.' });
  };

  const totalValor = filtered.reduce((s, r) => s + Number(r.valor_total || 0), 0);

  return (
    <>
    <Card className="rounded-2xl border-border/60 shadow-card">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por solicitante, empresa, data ou observação..."
              className="pl-9 h-10 bg-muted/40"
            />
          </div>
          <Button onClick={load} variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-emerald-soft">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-emerald-soft text-emerald-deep rounded-xl p-3 text-center">
            <div className="text-xl font-display font-bold">{filtered.length}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Solicitações</div>
          </div>
          <div className="bg-gold-soft text-primary rounded-xl p-3 text-center">
            <div className="text-xl font-display font-bold tabular-nums">{moeda(totalValor)}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Valor total</div>
          </div>
          <div className="bg-emerald-soft text-emerald-deep rounded-xl p-3 text-center hidden md:block">
            <div className="text-xl font-display font-bold">
              {new Set(filtered.map((r) => r.solicitante)).size}
            </div>
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Solicitantes únicos</div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {loading ? 'Carregando...' : 'Nenhuma solicitação encontrada.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((r) => {
              const itemsCount = Array.isArray(r.items) ? r.items.length : 0;
              return (
                <div
                  key={r.id}
                  className="border border-border/60 rounded-xl p-3 sm:p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-4 h-4 text-accent shrink-0" />
                      <span className="font-semibold text-primary text-sm truncate">{r.solicitante}</span>
                      <Badge variant="secondary" className="text-[10px]">{r.data_solicitacao}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {r.empresa} · {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · {moeda(Number(r.valor_total))}
                    </div>
                    {r.observacoes && (
                      <div className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-1">{r.observacoes}</div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button size="sm" onClick={() => reprint(r)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Download className="w-4 h-4 mr-1" /> Reimprimir
                    </Button>
                    {onDuplicate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDuplicate({
                          formData: {
                            nomeSolicitante: r.solicitante,
                            nomeEmpresa: r.empresa,
                            dataSolicitacao: r.data_solicitacao,
                            observacoes: r.observacoes || '',
                          },
                          items: Array.isArray(r.items) ? r.items : [],
                        })}
                        className="border-primary/30 text-primary hover:bg-emerald-soft"
                      >
                        <Copy className="w-4 h-4 mr-1" /> Duplicar
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label={`Excluir solicitação de ${r.solicitante}`} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

    </Card>
    {confirmElement}
    </>
  );
}


