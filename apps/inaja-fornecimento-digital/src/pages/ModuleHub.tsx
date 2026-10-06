import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, KanbanSquare, LogOut, Calculator, Wallet, LucideIcon, ShieldCheck, Lock,
  BarChart3, Inbox, Receipt, Building2, Sparkles, SearchCheck,
  Files, Landmark, WalletCards, Link2, GripVertical, RotateCcw, Pencil, Check, CalendarDays, Clock3, Search, Star, X, BookOpenCheck, Phone, FileSignature, HandCoins, Newspaper, ClipboardCheck, Hammer,
  GraduationCap, HeartHandshake,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppFooter } from "@/components/AppFooter";
import { GlowCard } from "@/components/ui/spotlight-card";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { toast } from "@/hooks/use-toast";
import { db } from "@/integrations/db/client";

type GlowColor = "green" | "orange" | "blue" | "purple" | "red";

interface Modulo {
  id: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  path: string;
  glow: GlowColor;
  emBreve?: boolean;
  adminOnly?: boolean;
  permissoes?: string[];
  publico?: boolean;
}

type ResultadoBuscaGlobal = { id: string; titulo: string; descricao: string; path: string; icon: LucideIcon };

const ramaisBusca = [
  ["Recepção", "1200"], ["Gabinete", "1201"], ["Contabilidade", "1202"], ["Geise", "1203"], ["RH", "1204"], ["Licitação", "1205"], ["Tributação", "1206"], ["Tesouraria", "1207"], ["Assistência Social", "1208"], ["Jurídico", "1209"], ["Controle Interno", "1210"], ["Frotas", "1211"], ["Hospital", "2101"], ["Hospital", "2102"], ["Recepção — Posto", "2201"], ["Posto 2202", "2202"], ["Atendimento Posto 2", "2203"], ["Posto 2204", "2204"], ["ESF — Recepção", "2301"], ["ESF 2302", "2302"], ["Secretaria de Educação", "3101"], ["3102", "3102"], ["Recepção — CMEI", "3201"], ["CMEI 3202", "3202"], ["Escola", "3301"], ["Escola 3302", "3302"], ["Recepção — CRAS", "4101"], ["CRAS 4102", "4102"], ["CREAS — Recepção", "4201"], ["CREAS 4202", "4202"],
] as const;

const todosModulos: Modulo[] = [
  { id: "manual", titulo: "Manual", descricao: "Guias rápidos para usar os módulos, fluxos e recursos do sistema.", icon: BookOpenCheck, path: "/manual", glow: "purple", publico: true },
  { id: "sites-uteis", titulo: "Sites úteis", descricao: "Acesso rápido aos portais e sistemas usados pela prefeitura.", icon: Link2, path: "/sites-uteis", glow: "blue" },
  { id: "pedido-dotacao", titulo: "Pedidos de dotação", descricao: "Solicite e acompanhe a dotação orçamentária.", icon: WalletCards, path: "/pedidos-dotacao", glow: "green" },
  {
    id: "solicitacoes",
    titulo: "Solicitações de aquisição",
    descricao: "Emissão de solicitações de fornecimento, histórico e modelos.",
    icon: FileText,
    path: "/solicitacoes",
    glow: "blue",
  },
  {
    id: "tarefas",
    titulo: "Mural de tarefas",
    descricao: "Quadro Kanban para acompanhar as demandas da prefeitura.",
    icon: KanbanSquare,
    path: "/tarefas",
    glow: "orange",
  },
  {
    id: "calculadoras",
    titulo: "Calculadoras",
    descricao: "Calcule diárias e retenção de ISS com alíquota de 5%.",
    icon: Calculator,
    path: "/calculadoras",
    glow: "green",
    permissoes: ["calculadoras", "diarias"],
  },
  {
    id: "credores-fixos",
    titulo: "Credores recorrentes",
    descricao: "Credores mensais recorrentes, controle de empenhos por departamento e relatórios.",
    icon: Wallet,
    path: "/credores-fixos",
    glow: "green",
  },
  {
    id: "empenhos",
    titulo: "Empenhos",
    descricao: "Importe e navegue pela relação de empenhos. Painel, filtros e detalhes por credor.",
    icon: BarChart3,
    path: "/empenhos",
    glow: "green",
  },
  {
    id: "gestao-documentos",
    titulo: "Arquivos",
    descricao: "Organize pastas e compartilhe arquivos com a equipe.",
    icon: Inbox,
    path: "/arquivos",
    glow: "blue",
  },
  {
    id: "rpas",
    titulo: "RPA — Recibos de autônomos",
    descricao: "Recibos de pagamento a autônomos (RPA) com cálculo de INSS, ISS e IRRF.",
    icon: Receipt,
    path: "/rpas",
    glow: "green",
  },
  {
    id: "cnpj",
    titulo: "Consulta de CNPJ",
    descricao: "Consulta de dados cadastrais de empresas (BrasilAPI, ReceitaWS e CNPJá).",
    icon: Building2,
    path: "/cnpj",
    glow: "blue",
  },
  {
    id: "ia",
    titulo: "IA",
    descricao: "Ferramentas de inteligência artificial para empenhos e classificação de despesas.",
    icon: Sparkles,
    path: "/ia",
    glow: "purple",
    permissoes: ["assistente-empenho", "classificador-despesa"],
  },
  {
    id: "pdf-utils",
    titulo: "Ferramentas PDF",
    descricao: "Mesclar, dividir e proteger arquivos PDF.",
    icon: Files,
    path: "/pdf-utils",
    glow: "blue",
  },
  {
    id: "extratos",
    titulo: "Extratos bancários",
    descricao: "Controle de extratos bancários, transações e alertas.",
    icon: Landmark,
    path: "/extratos",
    glow: "green",
  },
  {
    id: "prazos",
    titulo: "Obrigações",
    descricao: "Calendário de obrigações, vencimentos e entregas da prefeitura.",
    icon: CalendarDays,
    path: "/obrigacoes",
    glow: "orange",
  },
  {
    id: "prestacao-contas",
    titulo: "Prestação de contas",
    descricao: "Consultas e referências para os registros e envios de prestação de contas.",
    icon: BookOpenCheck,
    path: "/prestacao-contas",
    glow: "blue",
  },
  {
    id: "siconfi",
    titulo: "SICONFI — Indicadores fiscais",
    descricao: "Acompanhe RREO, RGF, DCA, entregas homologadas e alertas fiscais do município.",
    icon: BarChart3,
    path: "/siconfi",
    glow: "green",
    permissoes: ["prestacao-contas"],
  },
  {
    id: "autentique",
    titulo: "Enviar para assinatura",
    descricao: "Envie documentos e acompanhe o andamento das assinaturas eletrônicas.",
    icon: FileSignature,
    path: "/autentique",
    glow: "purple",
  },
  {
    id: "pncp",
    titulo: "Contratações públicas",
    descricao: "Consulte publicações do PNCP e confira contratos, atas, PCA e empenhos.",
    icon: Landmark,
    path: "/pncp",
    glow: "blue",
  },
  {
    id: "compras-gov",
    titulo: "Compras.gov.br — Pesquisa de preços",
    descricao: "Compare preços unitários de compras federais e consulte referências CATMAT/CATSER.",
    icon: SearchCheck,
    path: "/compras-gov",
    glow: "blue",
  },
  {
    id: "tce-pr",
    titulo: "TCE-PR — Dados abertos",
    descricao: "Consulte licitações e obras municipais e confira divergências com o PNCP.",
    icon: ClipboardCheck,
    path: "/tce-pr",
    glow: "green",
    permissoes: ["pncp"],
  },
  {
    id: "obras",
    titulo: "Painel de Obras",
    descricao: "Acompanhamento de obras públicas, medições fiscais e progresso sincronizado com o TCE-PR.",
    icon: Hammer,
    path: "/obras",
    glow: "orange",
    permissoes: ["pncp", "obras"],
  },
  {
    id: "detector-atos",
    titulo: "Detector de Atos",
    descricao: "Monitore publicações oficiais de Inajá encontradas no jornal regional.",
    icon: Newspaper,
    path: "/detector-atos",
    glow: "purple",
  },
  {
    id: "transferencias",
    titulo: "Transferências e convênios",
    descricao: "Acompanhe emendas, parcerias, recursos fundo a fundo, empenhos e vigências.",
    icon: HandCoins,
    path: "/transferencias",
    glow: "green",
  },
  {
    id: "fnde",
    titulo: "FNDE — Recursos Educação",
    descricao: "Repasses federais do FNDE para Inajá (PNAE merenda, PNATE transporte e PAR).",
    icon: GraduationCap,
    path: "/fnde",
    glow: "blue",
    permissoes: ["transferencias", "fnde"],
  },
  {
    id: "beneficios-sociais",
    titulo: "Benefícios Sociais — CRAS",
    descricao: "Painel de transferências federais às famílias de Inajá (Bolsa Família, BPC e Auxílio Gás).",
    icon: HeartHandshake,
    path: "/beneficios-sociais",
    glow: "green",
    permissoes: ["transferencias", "beneficios-sociais"],
  },
  {
    id: "ramais",
    titulo: "Ramais e contatos",
    descricao: "Diretório de ramais e telefones internos da Prefeitura de Inajá.",
    icon: Phone,
    path: "/ramais",
    glow: "green",
  },
];

const LIMITE_FAVORITOS = 5;
const chavePreferencia = (chave: "favoritos" | "recentes", usuario: string) => `inaja:${chave}:${usuario.trim().toLowerCase()}`;
const chaveMigracaoFavoritos = (usuario: string) => `inaja:favoritos:sincronizado:${usuario.trim().toLowerCase()}`;
const normalizarIds = (valor: unknown, limite = LIMITE_FAVORITOS) => (
  Array.isArray(valor)
    ? valor
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim())
      .map((id) => id === "diarias" ? "calculadoras" : id)
      .filter((id, index, ids) => ids.indexOf(id) === index)
      .slice(0, limite)
    : []
);

function lerPreferenciaLocal(chave: "favoritos" | "recentes", usuario: string) {
  try {
    return normalizarIds(JSON.parse(localStorage.getItem(chavePreferencia(chave, usuario)) || "[]"));
  } catch {
    return [];
  }
}

function salvarPreferenciaLocal(chave: "favoritos" | "recentes", usuario: string, ids: string[]) {
  try {
    localStorage.setItem(chavePreferencia(chave, usuario), JSON.stringify(normalizarIds(ids)));
  } catch {
    // O banco continua sendo a fonte principal quando o armazenamento local estiver indisponível.
  }
}

export default function ModuleHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, modulosLiberados, mostrarBloqueados, modulosManutencao } = useAuth();
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const nomeUsuario = user ? user.charAt(0).toUpperCase() + user.slice(1) : "";
  const [ordemModulos, setOrdemModulos] = useState<string[]>([]);
  const [moduloArrastado, setModuloArrastado] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [organizando, setOrganizando] = useState(false);
  const [busca, setBusca] = useState("");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [recentes, setRecentes] = useState<string[]>([]);
  const [resultadosGlobais, setResultadosGlobais] = useState<ResultadoBuscaGlobal[]>([]);

  useEffect(() => {
    const negado = (location.state as { acessoNegado?: string } | null)?.acessoNegado;
    if (!negado) return;
    toast({
      title: "Acesso restrito",
      description:
        negado === "admin"
          ? "Apenas administradores podem acessar esta área."
          : "Você não tem permissão para este módulo. Solicite ao administrador.",
      variant: "destructive",
    });
    navigate("/", { replace: true, state: {} });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!user) return;
    db.rpc("usuario_modulos_ordem_obter", { _caller: user }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) setOrdemModulos(data.filter((id): id is string => typeof id === "string"));
    });
  }, [user]);

  useEffect(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!user || termo.length < 2) { setResultadosGlobais([]); return; }
    let cancelado = false;
    const podeAcessar = (modulo: string) => isAdmin || modulosLiberados.includes(modulo);
    const locais: ResultadoBuscaGlobal[] = [
      ...todosModulos.filter((modulo) => (isAdmin || (modulo.permissoes ?? [modulo.id]).some((id) => modulosLiberados.includes(id))) && `${modulo.titulo} ${modulo.descricao}`.toLocaleLowerCase("pt-BR").includes(termo)).map((modulo) => ({ id: `modulo:${modulo.id}`, titulo: modulo.titulo, descricao: "Módulo", path: modulo.path, icon: modulo.icon })),
      ...(podeAcessar("ramais") ? ramaisBusca.filter(([local, ramal]) => `${local} ${ramal}`.toLocaleLowerCase("pt-BR").includes(termo)).map(([local, ramal]) => ({ id: `ramal:${ramal}`, titulo: local, descricao: `Ramal ${ramal}`, path: "/ramais", icon: Phone })) : []),
    ];
    const fornecedores = podeAcessar("solicitacoes") ? db.from<{ nome: string }>("empresas").select("nome") : Promise.resolve({ data: [], error: null });
    const solicitacoes = podeAcessar("solicitacoes") ? db.from<{ id: string; empresa: string; solicitante: string }>("solicitacoes").select("id, empresa, solicitante").limit(100) : Promise.resolve({ data: [], error: null });
    const obrigacoes = podeAcessar("prazos") ? db.rpc("prazos_listar", { _caller: user, _pagina: 1, _por_pagina: 100 }) : Promise.resolve({ data: null, error: null });
    void Promise.all([fornecedores, solicitacoes, obrigacoes]).then(([listaFornecedores, listaSolicitacoes, listaObrigacoes]) => {
      if (cancelado) return;
      const encontrados: ResultadoBuscaGlobal[] = [...locais];
      for (const item of listaFornecedores.data || []) if (item.nome.toLocaleLowerCase("pt-BR").includes(termo)) encontrados.push({ id: `fornecedor:${item.nome}`, titulo: item.nome, descricao: "Fornecedor cadastrado", path: "/solicitacoes", icon: Building2 });
      for (const item of listaSolicitacoes.data || []) if (`${item.empresa} ${item.solicitante}`.toLocaleLowerCase("pt-BR").includes(termo)) encontrados.push({ id: `solicitacao:${item.id}`, titulo: item.empresa, descricao: `Solicitação de ${item.solicitante}`, path: "/solicitacoes", icon: FileText });
      const prazos = (listaObrigacoes.data as { rows?: { id: string; titulo: string; data_limite: string }[] } | null)?.rows || [];
      for (const item of prazos) if (item.titulo.toLocaleLowerCase("pt-BR").includes(termo)) encontrados.push({ id: `obrigacao:${item.id}`, titulo: item.titulo, descricao: `Obrigação · ${item.data_limite.split("-").reverse().join("/")}`, path: "/obrigacoes", icon: CalendarDays });
      setResultadosGlobais(encontrados.slice(0, 12));
    });
    return () => { cancelado = true; };
  }, [busca, isAdmin, modulosLiberados, user]);

  useEffect(() => {
    if (!user) return;
    const favoritosLocais = lerPreferenciaLocal("favoritos", user);
    setFavoritos(favoritosLocais);
    setRecentes(lerPreferenciaLocal("recentes", user));
    let cancelado = false;
    void db.rpc("usuario_modulos_favoritos_obter", { _caller: user }).then(({ data, error }) => {
      if (cancelado || error || !Array.isArray(data)) return;
      const favoritosServidor = normalizarIds(data);
      let jaSincronizado = false;
      try { jaSincronizado = localStorage.getItem(chaveMigracaoFavoritos(user)) === "1"; } catch { /* sem armazenamento local */ }

      // Migra os favoritos da versao anterior, que so existia no navegador, uma unica vez.
      if (!favoritosServidor.length && favoritosLocais.length && !jaSincronizado) {
        setFavoritos(favoritosLocais);
        salvarPreferenciaLocal("favoritos", user, favoritosLocais);
        void db.rpc("usuario_modulos_favoritos_salvar", { _caller: user, _favoritos: favoritosLocais }).then(({ error: salvarErro }) => {
          if (!salvarErro) {
            try { localStorage.setItem(chaveMigracaoFavoritos(user), "1"); } catch { /* sem armazenamento local */ }
          }
        });
        return;
      }

      setFavoritos(favoritosServidor);
      salvarPreferenciaLocal("favoritos", user, favoritosServidor);
      try { localStorage.setItem(chaveMigracaoFavoritos(user), "1"); } catch { /* sem armazenamento local */ }
    });
    return () => { cancelado = true; };
  }, [user]);

  const modulosVisiveisBase = isAdmin
    ? todosModulos
    : todosModulos.filter((m) =>
        !m.adminOnly && (
          m.publico
          ||
          (m.permissoes ?? [m.id]).some((id) => modulosLiberados.includes(id))
          || mostrarBloqueados
          || (m.permissoes ?? [m.id]).some((id) => modulosManutencao.includes(id))
        )
      );
  const modulosVisiveis = useMemo(() => {
    const posicao = new Map(ordemModulos.map((id, index) => [id, index]));
    return [...modulosVisiveisBase].sort((a, b) => (posicao.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (posicao.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  }, [modulosVisiveisBase, ordemModulos]);
  const modulosComAcesso = useMemo(() => modulosVisiveis.filter((modulo) => {
    const permissoesModulo = modulo.permissoes ?? [modulo.id];
    return isAdmin || modulo.publico || permissoesModulo.some((id) => modulosLiberados.includes(id) && !modulosManutencao.includes(id));
  }), [isAdmin, modulosLiberados, modulosManutencao, modulosVisiveis]);
  const salvarOrdem = async (ordem: string[]) => {
    setOrdemModulos(ordem);
    const { error } = await db.rpc("usuario_modulos_ordem_salvar", { _caller: user, _ordem: ordem });
    if (error) toast({ title: "Não foi possível salvar a ordem", description: error.message, variant: "destructive" });
  };
  const soltarModulo = (destinoId: string) => {
    if (!organizando || !moduloArrastado || moduloArrastado === destinoId) return;
    const ids = modulosVisiveis.map((modulo) => modulo.id);
    const origem = ids.indexOf(moduloArrastado);
    const destino = ids.indexOf(destinoId);
    ids.splice(origem, 1);
    ids.splice(destino, 0, moduloArrastado);
    void salvarOrdem(ids);
  };
  const restaurarOrdem = () => void salvarOrdem([]);
  const salvarPreferencias = (chave: "favoritos" | "recentes", ids: string[]) => {
    if (user) salvarPreferenciaLocal(chave, user, ids);
  };
  const alternarFavorito = (id: string) => {
    if (!favoritos.includes(id) && favoritos.length >= LIMITE_FAVORITOS) {
      toast({ title: "Limite de favoritos atingido", description: `Voc\u00ea pode manter at\u00e9 ${LIMITE_FAVORITOS} m\u00f3dulos favoritos.` });
      return;
    }
    const atualizados = favoritos.includes(id) ? favoritos.filter((item) => item !== id) : [...favoritos, id];
    setFavoritos(atualizados);
    salvarPreferencias("favoritos", atualizados);
    if (user) {
      void db.rpc("usuario_modulos_favoritos_salvar", { _caller: user, _favoritos: atualizados }).then(({ error }) => {
        if (error) toast({ title: "Favorito salvo apenas neste navegador", description: error.message, variant: "destructive" });
      });
    }
  };
  const abrirModulo = (modulo: Modulo) => {
    const atualizados = [modulo.id, ...recentes.filter((id) => id !== modulo.id)].slice(0, 5);
    setRecentes(atualizados);
    salvarPreferencias("recentes", atualizados);
    navigate(modulo.path);
  };
  const termoBusca = busca.trim().toLocaleLowerCase("pt-BR");
  const modulosEncontrados = useMemo(() => modulosVisiveis.filter((modulo) => !termoBusca || `${modulo.titulo} ${modulo.descricao}`.toLocaleLowerCase("pt-BR").includes(termoBusca)), [modulosVisiveis, termoBusca]);
  const favoritosVisiveis = useMemo(() => favoritos.map((id) => modulosComAcesso.find((modulo) => modulo.id === id)).filter((modulo): modulo is Modulo => Boolean(modulo)), [favoritos, modulosComAcesso]);
  const recentesVisiveis = useMemo(() => recentes.map((id) => modulosComAcesso.find((modulo) => modulo.id === id)).filter((modulo): modulo is Modulo => Boolean(modulo)), [recentes, modulosComAcesso]);
  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-40 border-b border-sidebar-border bg-sidebar shadow-[0_2px_14px_hsl(var(--sidebar-background)/0.18)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-sidebar-primary" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-sidebar-primary/15 blur-md" aria-hidden />
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-sidebar-primary/45 bg-sidebar-accent p-1 shadow-sm sm:h-14 sm:w-14">
              <img
                src="/brasao.png"
                alt="Brasão da Prefeitura de Inajá"
                className="h-full w-full rounded-full object-contain"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="hidden text-[10px] tracking-[0.3em] uppercase text-sidebar-primary font-semibold font-display sm:block">
              Prefeitura Municipal de
            </p>
            <h1 className="font-display text-xl font-bold tracking-tight text-sidebar-foreground sm:text-2xl">
              Inajá
            </h1>
            {user && <p className="mt-1 hidden text-sm font-medium text-sidebar-foreground/95 sm:block">{saudacao}, {nomeUsuario}!</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            {user && (
              <div className="hidden sm:flex flex-col items-end gap-0.5">
                <span className="text-xs uppercase tracking-widest text-sidebar-primary font-semibold">
                  {user}
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
            )}
            {isAdmin && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => navigate("/admin")}
                aria-label="Administração"
                className="!border-sidebar-primary/60 !bg-sidebar-accent !text-sidebar-foreground hover:!bg-sidebar-accent/80 hover:!text-sidebar-primary sm:w-auto sm:px-3"
              >
                <ShieldCheck className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Administração</span>
              </Button>
            )}
            <ChangePasswordDialog showLabel className="!border-sidebar-primary/60 !bg-sidebar-accent !text-sidebar-foreground hover:!bg-sidebar-accent/80 hover:!text-sidebar-primary" />
            <NotificationBell />
            <Button
              size="icon"
              onClick={() => { logout(); navigate("/login"); }}
              aria-label="Sair"
              className="border border-sidebar-primary/60 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 sm:w-auto sm:px-3"
            >
              <LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex justify-end">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar módulo..." className="h-9 bg-background pl-9 pr-9" aria-label="Buscar módulo" />{busca && <Button size="icon" variant="ghost" className="absolute right-0 top-0 h-9 w-9" onClick={() => setBusca("")} aria-label="Limpar busca"><X className="h-4 w-4" /></Button>}</div>
            {organizando && <Button size="icon" variant="ghost" title="Restaurar ordem" aria-label="Restaurar ordem" onClick={restaurarOrdem} disabled={ordemModulos.length === 0}><RotateCcw className="h-4 w-4" /></Button>}
            <Button size="icon" variant="ghost" title={organizando ? "Concluir organização" : "Organizar módulos"} aria-label={organizando ? "Concluir organização" : "Organizar módulos"} onClick={() => setOrganizando((ativo) => !ativo)}>
              {organizando ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {busca.trim().length >= 2 && <section className="mb-6 rounded-xl border bg-card p-3 shadow-sm"><div className="flex items-center justify-between gap-3 px-1 pb-3"><div><p className="text-sm font-semibold">Resultados da busca global</p><p className="text-xs text-muted-foreground">Módulos, fornecedores, solicitações, obrigações e ramais.</p></div><span className="text-xs text-muted-foreground">{resultadosGlobais.length} encontrados</span></div>{resultadosGlobais.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{resultadosGlobais.map((resultado) => { const Icon = resultado.icon; return <Button key={resultado.id} variant="ghost" className="h-auto justify-start gap-3 whitespace-normal border border-transparent px-3 py-3 text-left hover:border-primary/20 hover:bg-primary/5" onClick={() => navigate(resultado.path)}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{resultado.titulo}</span><span className="block truncate text-xs font-normal text-muted-foreground">{resultado.descricao}</span></span></Button>; })}</div> : <p className="px-1 py-5 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</p>}</section>}

        {!busca && modulosVisiveis.length > 0 && <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border bg-card/70 p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" fill="currentColor" /><h3 className="text-sm font-semibold">Favoritos</h3></div><span className="text-xs text-muted-foreground">{favoritosVisiveis.length}/5</span></div>{favoritosVisiveis.length ? <div className="mt-3 flex flex-wrap gap-2">{favoritosVisiveis.map((modulo) => <Button key={modulo.id} variant="secondary" size="sm" className="gap-1.5" onClick={() => abrirModulo(modulo)}><modulo.icon className="h-3.5 w-3.5" />{modulo.titulo}</Button>)}</div> : <p className="mt-3 text-xs leading-5 text-muted-foreground">Use a estrela nos módulos para criar seus atalhos.</p>}</section>
          <section className="rounded-xl border bg-card/70 p-4 shadow-sm"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Usados recentemente</h3></div>{recentesVisiveis.length ? <div className="mt-3 flex flex-wrap gap-2">{recentesVisiveis.map((modulo) => <Button key={modulo.id} variant="secondary" size="sm" className="gap-1.5" onClick={() => abrirModulo(modulo)}><modulo.icon className="h-3.5 w-3.5" />{modulo.titulo}</Button>)}</div> : <p className="mt-3 text-xs leading-5 text-muted-foreground">Os módulos abertos aparecerão aqui para acesso rápido.</p>}</section>
        </div>}

        {!busca && <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">Todos os módulos</h3><span className="text-xs text-muted-foreground">{modulosVisiveis.length} disponíveis</span></div>}

        {modulosEncontrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm max-w-xs">
              {busca ? "Nenhum módulo encontrado para esta busca." : "Nenhum módulo liberado para o seu usuário. Solicite ao administrador."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {modulosEncontrados.map((m) => {
              const Icon = m.icon;
              const permissoesModulo = m.permissoes ?? [m.id];
              const permissoesAtivas = permissoesModulo.filter((id) =>
                modulosLiberados.includes(id) && !modulosManutencao.includes(id)
              );
              const emManutencao = !isAdmin && permissoesModulo.every((id) => modulosManutencao.includes(id));
              const liberado = isAdmin || permissoesAtivas.length > 0;
              if (!liberado) {
                return (
                  <div
                    key={m.id}
                    draggable={organizando}
                    onDragStart={(event) => { if (!organizando) return; setModuloArrastado(m.id); setArrastando(true); event.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(event) => { if (organizando) event.preventDefault(); }}
                    onDrop={(event) => { event.preventDefault(); soltarModulo(m.id); }}
                    onDragEnd={() => { setModuloArrastado(null); window.setTimeout(() => setArrastando(false), 0); }}
                    className="relative flex w-full select-none flex-col gap-2 overflow-hidden rounded-xl border border-border/40 bg-muted/20 p-3"
                    title={emManutencao ? "Módulo em manutenção" : "Módulo bloqueado"}
                  >
                    {organizando && <div className="absolute right-2 top-2 z-20 rounded bg-background/80 p-1 text-muted-foreground"><GripVertical className="h-4 w-4" /></div>}
                    <div className="relative z-10 flex items-start justify-between gap-4 opacity-40">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-base font-semibold leading-tight text-card-foreground">{m.titulo}</h3>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.descricao}</p>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        {emManutencao ? "Em manutenção" : "Acesso restrito"}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  draggable={organizando}
                  onDragStart={(event) => { if (!organizando) return; setModuloArrastado(m.id); setArrastando(true); event.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(event) => { if (organizando) event.preventDefault(); }}
                  onDrop={(event) => { event.preventDefault(); soltarModulo(m.id); }}
                  onDragEnd={() => { setModuloArrastado(null); window.setTimeout(() => setArrastando(false), 0); }}
                  className={`relative w-full ${organizando ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  {organizando && <div className="absolute left-2 top-2 z-20 rounded bg-background/80 p-1 text-muted-foreground shadow-sm"><GripVertical className="h-4 w-4" /></div>}
                <GlowCard
                  glowColor={m.glow}
                  customSize
                  onClick={() => { if (!arrastando && !organizando) abrirModulo(m); }}
                  ariaLabel={`Abrir módulo ${m.titulo}`}
                  className="group flex w-full cursor-pointer flex-col justify-between bg-card !p-3 !rounded-xl"
                >
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold leading-tight text-card-foreground">{m.titulo}</h3>
                        {!organizando && <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-amber-500" onClick={(event) => { event.stopPropagation(); alternarFavorito(m.id); }} aria-label={favoritos.includes(m.id) ? `Remover ${m.titulo} dos favoritos` : `Adicionar ${m.titulo} aos favoritos`}><Star className="h-4 w-4" fill={favoritos.includes(m.id) ? "currentColor" : "none"} /></Button>}
                        {m.emBreve && (
                          <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Em breve
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.descricao}</p>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </GlowCard>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

