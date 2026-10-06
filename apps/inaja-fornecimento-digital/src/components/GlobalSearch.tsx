import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { db } from '@/integrations/db/client';
import { moeda } from '@/lib/empenhos';
import { FileText, User, Building2, Copy, Download } from 'lucide-react';
import { generateRequestPDF } from '@/lib/pdfGenerator';
import { toast } from '@/hooks/use-toast';
import type { DuplicatePayload, SolicitationRecord } from '@/types/solicitacao';

type Solicitacao = SolicitationRecord;

interface Props {
  solicitantes: string[];
  empresas: string[];
  fontSize: number;
  onPickSolicitante: (nome: string) => void;
  onPickEmpresa: (nome: string) => void;
  onDuplicate: (payload: DuplicatePayload) => void;
}

export function GlobalSearch({
  solicitantes, empresas, fontSize,
  onPickSolicitante, onPickEmpresa, onDuplicate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregadas, setCarregadas] = useState(false);
  const [erroBusca, setErroBusca] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setErroBusca(false);
    db
      .from<Solicitacao>('solicitacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setErroBusca(true);
        else setSolicitacoes(data ?? []);
        setCarregadas(true);
      });
  }, [open]);

  const q = query.trim().toLowerCase();
  const filterFn = (s: string) => !q || s.toLowerCase().includes(q);

  const matchedSolicitantes = solicitantes.filter(filterFn).slice(0, 6);
  const matchedEmpresas = empresas.filter(filterFn).slice(0, 6);
  const matchedSolicitacoes = solicitacoes.filter((r) =>
    !q ||
    r.solicitante?.toLowerCase().includes(q) ||
    r.empresa?.toLowerCase().includes(q) ||
    r.data_solicitacao?.toLowerCase().includes(q)
  ).slice(0, 8);

  const close = () => setOpen(false);

  const reprint = async (r: Solicitacao) => {
    try {
      await generateRequestPDF(
        {
          solicitante: r.solicitante,
          empresa: r.empresa,
          dataSolicitacao: r.data_solicitacao,
          observacoes: r.observacoes || '',
          items: Array.isArray(r.items) ? r.items : [],
          assinatura: r.assinatura || null,
          anexos: Array.isArray(r.anexos) ? r.anexos : [],
        },
        fontSize,
        `Solicitacao_${r.data_solicitacao.replace(/\//g, '')}.pdf`
      );
      toast({ title: 'PDF gerado', description: 'Arquivo baixado.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao gerar PDF.', variant: 'destructive' });
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar solicitante, empresa ou solicitação..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {erroBusca ? (
          <div className="py-6 text-center text-sm text-destructive">Não foi possível carregar as solicitações. Feche e reabra a busca.</div>
        ) : !carregadas ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

            {matchedSolicitantes.length > 0 && (
              <CommandGroup heading="Solicitantes">
                {matchedSolicitantes.map((s) => (
                  <CommandItem key={`sol-${s}`} value={`sol-${s}`} onSelect={() => { onPickSolicitante(s); close(); }}>
                    <User className="w-4 h-4 mr-2 text-accent" />
                    <span>{s}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedEmpresas.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Empresas">
                  {matchedEmpresas.map((e) => (
                    <CommandItem key={`emp-${e}`} value={`emp-${e}`} onSelect={() => { onPickEmpresa(e); close(); }}>
                      <Building2 className="w-4 h-4 mr-2 text-accent" />
                      <span>{e}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {matchedSolicitacoes.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Solicitações">
                  {matchedSolicitacoes.map((r) => (
                    <div key={r.id} className="flex items-center gap-1 px-1">
                      <CommandItem
                        className="flex-1"
                        value={`req-${r.id}`}
                        onSelect={() => {
                          onDuplicate({
                            formData: {
                              nomeSolicitante: r.solicitante,
                              nomeEmpresa: r.empresa,
                              dataSolicitacao: r.data_solicitacao,
                              observacoes: r.observacoes || '',
                            },
                            items: Array.isArray(r.items) ? r.items : [],
                          });
                          close();
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2 text-accent" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{r.solicitante} — {r.empresa}</div>
                          <div className="text-[11px] text-muted-foreground">{r.data_solicitacao} · {moeda(Number(r.valor_total))}</div>
                        </div>
                        <Copy className="w-3.5 h-3.5 ml-2 opacity-60" />
                      </CommandItem>
                      <button
                        onClick={(e) => { e.stopPropagation(); reprint(r); }}
                        className="p-2 rounded hover:bg-muted text-primary shrink-0"
                        title="Reimprimir PDF"
                        aria-label={`Reimprimir PDF de ${r.solicitante}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
