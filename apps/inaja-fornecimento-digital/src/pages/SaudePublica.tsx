import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Building2, CheckCircle2, ChevronLeft, ChevronRight, Database, ExternalLink, HeartPulse, Info, Loader2, Mail, MapPin, Phone, RefreshCw, Search, Stethoscope, X, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Capacidades = {
  centroCirurgico: boolean | null;
  centroObstetrico: boolean | null;
  centroNeonatal: boolean | null;
  atendimentoHospitalar: boolean | null;
  servicoApoio: boolean | null;
  atendimentoAmbulatorial: boolean | null;
};

export type EstabelecimentoCnes = {
  codigoCnes: string | null;
  codigoEstabelecimentoSaude: string | null;
  cnpjEntidade: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  naturezaOrganizacaoEntidade: string | null;
  naturezaJuridica: string | null;
  tipoGestao: string | null;
  nivelHierarquia: string | null;
  esferaAdministrativa: string | null;
  codigoTipoUnidade: number | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  telefone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  codigoUf: number | null;
  codigoMunicipio: string | null;
  codigoAtividadeEnsino: string | null;
  codigoTurnoAtendimento: string | null;
  descricaoTurnoAtendimento: string | null;
  atendeAmbulatorialSus: boolean | null;
  atendeAmbulatorialSusTexto: string | null;
  capacidades: Capacidades;
  motivoDesabilitacao: string | null;
  ativo: boolean;
  dataAtualizacao: string | null;
};

type TipoUnidade = { codigo: number; descricao: string };
type Resumo = {
  unidades: number;
  ativas: number;
  inativas: number;
  municipais: number;
  atendimentoAmbulatorial: number;
  atendimentoHospitalar: number;
  centroCirurgico: number;
  centroObstetrico: number;
  centroNeonatal: number;
};
type ConsultaCnes = {
  modo: "lista" | "detalhe";
  registro: EstabelecimentoCnes | null;
  registros: EstabelecimentoCnes[];
  pagina: number;
  limite: number;
  temMais: boolean;
  resumo: Resumo;
  filtros: { cnes: string | null; codigoMunicipio: string | null; codigoUf: string | null; codigoTipoUnidade: string | null; status: string | null; busca: string };
  fonte: string;
  consultadoEm: string;
  emCache: boolean;
  configuracao: { cacheMinutos: number; fonte: string; consulta: string };
};

const UFS: [string, string][] = [
  ["12", "AC"], ["27", "AL"], ["13", "AM"], ["16", "AP"], ["29", "BA"], ["23", "CE"], ["53", "DF"], ["32", "ES"], ["52", "GO"], ["21", "MA"], ["31", "MG"], ["50", "MS"], ["51", "MT"], ["15", "PA"], ["25", "PB"], ["26", "PE"], ["22", "PI"], ["41", "PR"], ["33", "RJ"], ["24", "RN"], ["11", "RO"], ["14", "RR"], ["43", "RS"], ["42", "SC"], ["28", "SE"], ["35", "SP"], ["17", "TO"],
];

const FONTE_CNES = "https://datasus.saude.gov.br/cnes-estabelecimentos/";

async function api<T>(caminho: string): Promise<T> {
  const resposta = await fetch("/api/saude/cnes" + caminho, { credentials: "same-origin", headers: { Accept: "application/json" } });
  const json = await resposta.json() as { data?: T; error?: { message?: string } };
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível consultar o CNES.");
  return json.data as T;
}

function texto(valor: string | number | null | undefined) {
  return valor === null || valor === undefined || String(valor).trim() === "" ? "—" : String(valor);
}

function formatarCnpj(valor: string | null) {
  if (!valor) return "—";
  const cnpj = valor.replace(/\D/g, "");
  return cnpj.length === 14 ? cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : valor;
}

function formatarData(valor: string | null) {
  if (!valor) return "—";
  const data = new Date(`${valor.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function nomeTipo(codigo: number | null, tipos: Map<number, string>) {
  return codigo ? tipos.get(codigo) || `Tipo ${codigo}` : "Tipo não informado";
}

function endereco(item: EstabelecimentoCnes) {
  const linha = [item.logradouro, item.numero, item.complemento].filter(Boolean).join(", ");
  const local = [item.bairro, item.cep ? `CEP ${item.cep}` : null].filter(Boolean).join(" · ");
  return [linha, local].filter(Boolean).join(" — ") || "Endereço não informado";
}

function Flag({ value }: { value: boolean | null }) {
  if (value === true) return <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Sim</span>;
  if (value === false) return <span className="inline-flex items-center gap-1 text-muted-foreground"><XCircle className="h-3.5 w-3.5" />Não</span>;
  return <span className="text-muted-foreground">Não informado</span>;
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value.toLocaleString("pt-BR")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function DetalheEstabelecimento({ item, tipos, onClose }: { item: EstabelecimentoCnes; tipos: Map<number, string>; onClose: () => void }) {
  const capacidades: [keyof Capacidades, string][] = [
    ["atendimentoAmbulatorial", "Atendimento ambulatorial"],
    ["atendimentoHospitalar", "Atendimento hospitalar"],
    ["servicoApoio", "Serviço de apoio"],
    ["centroCirurgico", "Centro cirúrgico"],
    ["centroObstetrico", "Centro obstétrico"],
    ["centroNeonatal", "Centro neonatal"],
  ];
  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{texto(item.nomeFantasia)}</h2>
              <Badge variant={item.ativo ? "default" : "destructive"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{texto(item.razaoSocial)} · CNES {texto(item.codigoCnes)} · {nomeTipo(item.codigoTipoUnidade, tipos)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar detalhe"><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">CNPJ da entidade</p><p className="mt-1 text-sm font-medium">{formatarCnpj(item.cnpjEntidade)}</p></div>
          <div><p className="text-xs text-muted-foreground">Gestão</p><p className="mt-1 text-sm font-medium">{texto(item.tipoGestao)} · {texto(item.esferaAdministrativa)}</p></div>
          <div><p className="text-xs text-muted-foreground">Turno</p><p className="mt-1 text-sm font-medium">{texto(item.descricaoTurnoAtendimento)}</p></div>
          <div><p className="text-xs text-muted-foreground">Atualização CNES</p><p className="mt-1 text-sm font-medium">{formatarData(item.dataAtualizacao)}</p></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><h3 className="font-semibold">Localização</h3></div>
            <p className="mt-3 text-sm">{endereco(item)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Município CNES: {texto(item.codigoMunicipio)} · UF: {texto(item.codigoUf)}</p>
            {(item.latitude !== null && item.longitude !== null) && <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}><MapPin className="h-3.5 w-3.5" />Abrir coordenadas no mapa</a>}
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><h3 className="font-semibold">Contato</h3></div>
            <p className="mt-3 flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{texto(item.telefone)}</p>
            <p className="mt-2 flex items-center gap-2 break-all text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{texto(item.email)}</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><h3 className="font-semibold">Capacidades registradas</h3></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {capacidades.map(([chave, label]) => <div key={chave} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span>{label}</span><Flag value={item.capacidades[chave]} /></div>)}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span>Atendimento ambulatorial SUS: {texto(item.atendeAmbulatorialSusTexto)} · Motivo de desabilitação: {texto(item.motivoDesabilitacao)}</span>
          <a className="inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href={FONTE_CNES}><ExternalLink className="h-3.5 w-3.5" />Fonte oficial</a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SaudePublica() {
  const { user } = useAuth();
  const [municipio, setMunicipio] = useState("4110300");
  const [uf, setUf] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [status, setStatus] = useState("ativo");
  const [busca, setBusca] = useState("");
  const [cnes, setCnes] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tipos, setTipos] = useState<TipoUnidade[]>([]);
  const [resultado, setResultado] = useState<ConsultaCnes | null>(null);
  const [detalhe, setDetalhe] = useState<EstabelecimentoCnes | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoTipos, setCarregandoTipos] = useState(true);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const primeiraConsulta = useRef(true);

  const tiposMap = useMemo(() => new Map(tipos.map((item) => [item.codigo, item.descricao])), [tipos]);

  const carregarTipos = useCallback(async () => {
    setCarregandoTipos(true);
    try {
      const dados = await api<{ tipos: TipoUnidade[] }>("/tipos");
      setTipos(dados.tipos);
    } catch (e) {
      toast({ title: "Falha ao carregar tipos do CNES", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setCarregandoTipos(false);
    }
  }, []);

  const consultar = useCallback(async (paginaAlvo = 1) => {
    if (!cnes.trim() && !municipio.trim() && !uf) {
      setErro("Informe o CNES, o código do município ou a UF para iniciar a consulta.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setDetalhe(null);
    const params = new URLSearchParams();
    if (cnes.trim()) params.set("cnes", cnes.trim());
    else {
      if (municipio.trim()) params.set("municipio", municipio.trim());
      if (uf) params.set("uf", uf);
      if (tipo !== "todos") params.set("tipo", tipo);
      if (status !== "todos") params.set("status", status);
      if (busca.trim()) params.set("busca", busca.trim());
      params.set("pagina", String(paginaAlvo));
      params.set("limite", "20");
    }
    try {
      const dados = await api<ConsultaCnes>("?" + params.toString());
      setResultado(dados);
      setPagina(dados.pagina);
      if (dados.modo === "detalhe") setDetalhe(dados.registro);
    } catch (e) {
      setResultado(null);
      setErro(String((e as Error).message));
    } finally {
      setCarregando(false);
    }
  }, [busca, cnes, municipio, status, tipo, uf]);

  useEffect(() => { void carregarTipos(); }, [carregarTipos]);
  useEffect(() => {
    if (!primeiraConsulta.current) return;
    primeiraConsulta.current = false;
    void consultar(1);
  }, [consultar]);

  const abrirDetalhe = async (codigo: string | null) => {
    if (!codigo) return;
    setCarregandoDetalhe(true);
    try {
      const dados = await api<ConsultaCnes>("?cnes=" + encodeURIComponent(codigo));
      setDetalhe(dados.registro);
    } catch (e) {
      toast({ title: "Falha ao abrir estabelecimento", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const resumo = resultado?.resumo;
  return (
    <div className="min-h-dvh bg-background">
      <PageHeader icon={HeartPulse} title="Saúde pública — CNES" subtitle="Rede municipal e estabelecimentos de saúde" username={user} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="mb-6 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Consultar rede de saúde</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Dados cadastrais públicos do Cadastro Nacional de Estabelecimentos de Saúde, mantido pelo Ministério da Saúde.</p>
            </div>
            <a href={FONTE_CNES} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />DATASUS/CNES</a>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void consultar(1); }} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2"><label className="mb-1.5 block text-xs font-medium" htmlFor="saude-cnes">CNES exato (opcional)</label><Input id="saude-cnes" inputMode="numeric" value={cnes} onChange={(event) => setCnes(event.target.value)} placeholder="Ex.: 2753898" /></div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" htmlFor="saude-municipio">Código do município</label>
              <Input id="saude-municipio" inputMode="numeric" value={municipio} onChange={(event) => setMunicipio(event.target.value)} placeholder="Ex.: 4110300" disabled={Boolean(cnes.trim())} />
            </div>
            <div><label className="mb-1.5 block text-xs font-medium" htmlFor="saude-uf">UF</label><select id="saude-uf" value={uf} onChange={(event) => setUf(event.target.value)} disabled={Boolean(cnes.trim())} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Todas (use município para restringir)</option>{UFS.map(([codigo, sigla]) => <option key={codigo} value={codigo}>{sigla}</option>)}</select></div>
            <div><label className="mb-1.5 block text-xs font-medium" htmlFor="saude-tipo">Tipo de unidade</label><select id="saude-tipo" value={tipo} onChange={(event) => setTipo(event.target.value)} disabled={Boolean(cnes.trim()) || carregandoTipos} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="todos">Todos os tipos</option>{tipos.map((item) => <option key={item.codigo} value={item.codigo}>{item.codigo} — {item.descricao}</option>)}</select></div>
            <div><label className="mb-1.5 block text-xs font-medium" htmlFor="saude-status">Situação</label><select id="saude-status" value={status} onChange={(event) => setStatus(event.target.value)} disabled={Boolean(cnes.trim())} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="ativo">Ativos</option><option value="todos">Ativos e inativos</option><option value="inativo">Inativos</option></select></div>
            <div className="lg:col-span-2"><label className="mb-1.5 block text-xs font-medium" htmlFor="saude-busca">Nome, CNES ou bairro</label><Input id="saude-busca" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Filtrar resultados da página" disabled={Boolean(cnes.trim())} /></div>
            <div className="flex items-end gap-2"><Button type="submit" className="w-full" disabled={carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Consultar CNES</Button><Button type="button" variant="outline" size="icon" onClick={() => { setPagina(1); void consultar(1); }} disabled={carregando} title="Atualizar consulta" aria-label="Atualizar consulta"><RefreshCw className="h-4 w-4" /></Button></div>
          </form>
        </section>

        {erro && <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>{erro}</span></div>}

        {resumo && <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Unidades encontradas" value={resumo.unidades} detail="No filtro atual" />
          <MetricCard label="Unidades ativas" value={resumo.ativas} detail={`${resumo.municipais} com gestão/esfera municipal`} />
          <MetricCard label="Atendimento ambulatorial" value={resumo.atendimentoAmbulatorial} detail="Capacidade informada no CNES" />
          <MetricCard label="Atendimento hospitalar" value={resumo.atendimentoHospitalar} detail={`${resumo.centroCirurgico} com centro cirúrgico`} />
        </section>}

        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-semibold">Estabelecimentos cadastrados</h2><p className="text-xs text-muted-foreground">{resultado ? `Página ${resultado.pagina}${resultado.emCache ? " · resultado em cache" : ""}` : "Faça uma consulta para listar unidades."}</p></div></div>
            {resultado && <span className="text-xs text-muted-foreground">Atualizado em {formatarData(resultado.registros[0]?.dataAtualizacao || null)}</span>}
          </div>
          {!resultado && !carregando && <div className="px-5 py-16 text-center text-sm text-muted-foreground"><Stethoscope className="mx-auto mb-3 h-8 w-8 text-primary/60" /><p>Carregue a rede de saúde para visualizar os estabelecimentos.</p></div>}
          {carregando && !resultado && <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Consultando o DATASUS...</div>}
          {resultado && resultado.registros.length === 0 && !carregando && <div className="px-5 py-16 text-center text-sm text-muted-foreground">Nenhum estabelecimento encontrado para os filtros informados.</div>}
          {resultado && resultado.registros.length > 0 && <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>CNES</TableHead><TableHead>Estabelecimento</TableHead><TableHead>Tipo</TableHead><TableHead>Localização</TableHead><TableHead>SUS / capacidade</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader><TableBody>{resultado.registros.map((item) => <TableRow key={item.codigoCnes || item.nomeFantasia} className="cursor-pointer" onClick={() => void abrirDetalhe(item.codigoCnes)}><TableCell className="font-mono text-xs">{texto(item.codigoCnes)}</TableCell><TableCell><p className="max-w-[260px] truncate font-medium">{texto(item.nomeFantasia)}</p><p className="max-w-[260px] truncate text-xs text-muted-foreground">{texto(item.razaoSocial)}</p></TableCell><TableCell className="max-w-[180px] text-xs">{nomeTipo(item.codigoTipoUnidade, tiposMap)}</TableCell><TableCell className="min-w-[200px] text-xs">{endereco(item)}</TableCell><TableCell className="min-w-[160px] text-xs"><div className="space-y-1"><span className="block">Ambulatorial SUS: {texto(item.atendeAmbulatorialSusTexto)}</span><span className="block text-muted-foreground">Hospitalar: {item.capacidades.atendimentoHospitalar === true ? "Sim" : "Não"}</span></div></TableCell><TableCell><Badge variant={item.ativo ? "default" : "destructive"}>{item.ativo ? "Ativo" : "Inativo"}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}
          {resultado && resultado.modo === "lista" && <div className="flex items-center justify-between border-t px-4 py-3 sm:px-5"><span className="text-xs text-muted-foreground">{resultado.registros.length} registro(s) nesta página · clique em uma linha para abrir o detalhe</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => { const proxima = Math.max(1, pagina - 1); if (proxima !== pagina) void consultar(proxima); }} disabled={pagina <= 1 || carregando}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><span className="min-w-16 text-center text-xs">Página {pagina}</span><Button variant="outline" size="sm" onClick={() => { const proxima = pagina + 1; if (resultado.temMais) void consultar(proxima); }} disabled={!resultado.temMais || carregando}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}
        </section>

        {carregandoDetalhe && <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Abrindo detalhe do estabelecimento...</div>}
        {detalhe && !carregandoDetalhe && <section className="mt-6"><DetalheEstabelecimento item={detalhe} tipos={tiposMap} onClose={() => setDetalhe(null)} /></section>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />Fonte oficial: Portal de Dados Abertos do SUS / CNES · cache de 10 minutos.</span><a href={FONTE_CNES} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />Abrir DATASUS</a></div>
      </main>
      <AppFooter />
    </div>
  );
}
