import { useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, ChevronRight, Search, ShieldCheck, Sparkles } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

type Secao = {
  titulo: string;
  resumo: string;
  itens: string[];
};

const secoes: Secao[] = [
  {
    titulo: "Começando no sistema",
    resumo: "Visão geral para localizar módulos e acompanhar seu trabalho.",
    itens: [
      "Use o painel inicial para abrir módulos, pesquisar recursos e consultar seus acessos.",
      "Os módulos aparecem conforme as permissões do usuário; o Manual fica disponível para todos os usuários autenticados.",
      "Use o seletor de tema no cabeçalho para escolher o visual institucional, escuro, alto contraste ou Spotify.",
    ],
  },
  {
    titulo: "Solicitações e empenhos",
    resumo: "Fluxo de compras, fornecedores, dotações e acompanhamento orçamentário.",
    itens: [
      "Crie uma solicitação informando solicitante, empresa e itens com quantidade e valor unitário.",
      "Revise o valor total e mantenha observações úteis para o setor responsável.",
      "No módulo Empenhos, use filtros e detalhes por credor para localizar registros importados.",
    ],
  },
  {
    titulo: "Tarefas, prazos e calendário",
    resumo: "Organize demandas e não perca vencimentos administrativos.",
    itens: [
      "Use o Mural de tarefas para separar demandas em A Fazer, Em Andamento e Concluído.",
      "Registre obrigações com data limite, categoria e descrição; conclua somente após a entrega.",
      "Consulte o Calendário para visualizar compromissos, feriados e regras recorrentes.",
    ],
  },
  {
    titulo: "Documentos e assinaturas",
    resumo: "Organize arquivos, tramite documentos e acompanhe assinaturas.",
    itens: [
      "Use Arquivos para criar pastas, anexar documentos e localizar materiais por busca.",
      "Na Gestão de Documentos, registre o assunto, setor de destino e observação de tramitação.",
      "Confirme signatários e revise o documento antes de enviar para assinatura eletrônica.",
    ],
  },
  {
    titulo: "Financeiro, RPAs e consultas",
    resumo: "Recursos de apoio para rotinas financeiras e administrativas.",
    itens: [
      "Confira os dados do prestador antes de calcular um RPA e revise os tributos apresentados.",
      "Registre transações na conta correta, com data, descrição, valor e categoria.",
      "Use a Consulta de CNPJ para conferir dados cadastrais antes de cadastrar ou contratar uma empresa.",
    ],
  },
  {
    titulo: "Segurança e suporte",
    resumo: "Boas práticas para proteger dados e obter ajuda.",
    itens: [
      "Nunca compartilhe senha, token MCP ou chave de integração em tarefas, documentos ou mensagens.",
      "Exclusões e operações irreversíveis devem ser confirmadas antes da execução.",
      "Em caso de dúvida, registre o contexto, a tela e a mensagem de erro para o administrador.",
    ],
  },
];

export default function Manual() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState(secoes[0].titulo);
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return secoes;
    return secoes.filter((secao) => `${secao.titulo} ${secao.resumo} ${secao.itens.join(" ")}`.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={BookOpenCheck} title="Manual" subtitle="Guias rápidos do sistema" username={user} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/15 p-3 text-primary"><Sparkles className="h-6 w-6" /></div>
            <div><p className="text-sm font-semibold uppercase tracking-widest text-primary">Manual do sistema</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Orientações para a rotina municipal</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Encontre instruções rápidas para usar os módulos com segurança e consistência.</p></div>
          </div>
          <label className="relative mt-6 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no Manual..." className="h-11 pl-9" /></label>
        </section>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <nav className="space-y-2" aria-label="Seções do Manual">
            {filtradas.map((secao) => <button key={secao.titulo} type="button" onClick={() => setAberta(secao.titulo)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${aberta === secao.titulo ? "border-primary/40 bg-primary/10" : "border-border bg-card hover:bg-muted/60"}`}><ChevronRight className={`h-4 w-4 shrink-0 text-primary transition-transform ${aberta === secao.titulo ? "rotate-90" : ""}`} /><span><span className="block font-semibold">{secao.titulo}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{secao.resumo}</span></span></button>)}
            {!filtradas.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma orientação encontrada.</p>}
          </nav>
          <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8" aria-live="polite">
            {(() => { const secao = filtradas.find((item) => item.titulo === aberta) || filtradas[0]; return secao ? <><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /><h3 className="font-display text-xl font-bold">{secao.titulo}</h3></div><p className="mt-2 text-sm text-muted-foreground">{secao.resumo}</p><ul className="mt-6 space-y-4">{secao.itens.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-primary" /><span>{item}</span></li>)}</ul></> : <p className="text-sm text-muted-foreground">Selecione uma seção para começar.</p>; })()}
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
