import { useState } from "react";
import { ExternalLink, FileSearch, Loader2, SearchCheck, Tag, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { DataPagination } from "@/components/DataPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Tipo = "material" | "servico";

type CatalogoItem = {
  tipo: Tipo;
  codigo: string;
  descricao: string;
  grupo: string | null;
  classe: string | null;
  pdm: string | null;
  status: string | number | null;
  sustentavel: boolean | string | number | null;
  ncm: string | null;
};

type CatalogoResult = {
  tipo: Tipo;
  itens: CatalogoItem[];
  pagina: number;
  total: number;
  totalPaginas: number;
  paginasRestantes: number;
  filtros: { busca: string; codigo: string };
  fonte: string;
  consultadoEm: string;
  emCache: boolean;
  configuracao: { fonte: string; swagger: string; cacheMinutos: number };
};

type PrecoRow = {
  tipo: Tipo;
  idCompra: string | null;
  idItemCompra: string | null;
  forma: string | null;
  modalidade: string | null;
  criterioJulgamento: string | null;
  numeroItemCompra: string | null;
  descricaoItem: string | null;
  codigoItemCatalogo: string | null;
  unidade: string | null;
  quantidade: number | null;
  precoUnitario: number | null;
  percentualMaiorDesconto: number | null;
  fornecedor: string | null;
  fornecedorCnpj: string | null;
  codigoUasg: string | null;
  nomeUasg: string | null;
  codigoMunicipio: string | null;
  municipio: string | null;
  estado: string | null;
  codigoOrgao: string | null;
  nomeOrgao: string | null;
  poder: string | null;
  esfera: string | null;
  dataCompra: string | null;
  dataResultado: string | null;
};

type PrecosResult = {
  tipo: Tipo;
  codigo: string;
  rows: PrecoRow[];
  pagina: number;
  total: number;
  totalPaginas: number;
  resumo: { totalRegistros: number; comPreco: number; minimo: number | null; mediana: number | null; media: number | null; maximo: number | null };
  fonte: string;
  consultadoEm: string;
  emCache: boolean;
};

async function api<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`/api/compras-gov${caminho}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
  const json = await resposta.json() as { data: T | null; error?: { message?: string } | null };
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível consultar o Compras.gov.br.");
  return json.data as T;
}

function moeda(valor: number | null | undefined) {
  return valor === null || valor === undefined ? "—" : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBr(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function texto(valor: string | number | null | undefined) {
  return valor === null || valor === undefined || String(valor).trim() === "" ? "—" : String(valor);
}

export default function ComprasGov() {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<Tipo>("material");
  const [busca, setBusca] = useState("");
  const [catalogo, setCatalogo] = useState<CatalogoResult | null>(null);
  const [itemSelecionado, setItemSelecionado] = useState<CatalogoItem | null>(null);
  const [precos, setPrecos] = useState<PrecosResult | null>(null);
  const [estado, setEstado] = useState("");
  const [codigoUasg, setCodigoUasg] = useState("");
  const [codigoMunicipio, setCodigoMunicipio] = useState("");
  const [pagina, setPagina] = useState(1);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false);
  const [carregandoPrecos, setCarregandoPrecos] = useState(false);

  const pesquisarCatalogo = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!busca.trim()) {
      toast({ title: "Informe o item", description: tipo === "servico" ? "Digite o código CATSER." : "Digite uma descrição ou código CATMAT.", variant: "destructive" });
      return;
    }
    setCarregandoCatalogo(true);
    setCatalogo(null);
    setItemSelecionado(null);
    setPrecos(null);
    try {
      const parametros = new URLSearchParams({ tipo, tamanhoPagina: "30" });
      if (/^\d+$/.test(busca.trim())) parametros.set("codigo", busca.trim());
      else parametros.set("busca", busca.trim());
      setCatalogo(await api<CatalogoResult>(`/catalogo?${parametros.toString()}`));
    } catch (erro) {
      toast({ title: "Falha na consulta do catálogo", description: String((erro as Error).message), variant: "destructive" });
    } finally {
      setCarregandoCatalogo(false);
    }
  };

  const consultarPrecos = async (item: CatalogoItem, paginaAtual = 1) => {
    setCarregandoPrecos(true);
    try {
      const parametros = new URLSearchParams({ tipo: item.tipo, codigo: item.codigo, pagina: String(paginaAtual), tamanhoPagina: "100" });
      if (codigoUasg.trim()) parametros.set("codigoUasg", codigoUasg.trim());
      if (estado.trim()) parametros.set("estado", estado.trim().toUpperCase());
      if (codigoMunicipio.trim()) parametros.set("codigoMunicipio", codigoMunicipio.trim());
      setPrecos(await api<PrecosResult>(`/precos?${parametros.toString()}`));
      setPagina(paginaAtual);
    } catch (erro) {
      toast({ title: "Falha na pesquisa de preços", description: String((erro as Error).message), variant: "destructive" });
    } finally {
      setCarregandoPrecos(false);
    }
  };

  const selecionarItem = (item: CatalogoItem) => {
    setItemSelecionado(item);
    setPrecos(null);
    setPagina(1);
    void consultarPrecos(item, 1);
  };

  const limparResultados = () => {
    setCatalogo(null);
    setItemSelecionado(null);
    setPrecos(null);
    setBusca("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader icon={SearchCheck} title="Compras.gov.br — Pesquisa de preços" subtitle="CATMAT, CATSER e referências de compras federais" username={user} />
      <main className="w-full max-w-7xl mx-auto flex-1 px-4 py-6 sm:px-6 space-y-5">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold">Referências de preços para compras públicas</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">Pesquise o catálogo oficial, selecione um item e compare preços unitários registrados em compras federais. A mediana é um resumo da amostra consultada e deve ser analisada com as demais fontes do processo.</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild><a href="https://www.gov.br/compras/pt-br/cidadao/portal-de-dados-abertos/portal-de-dados-abertos" target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" />Portal oficial</a></Button>
              <Button variant="outline" size="sm" asChild><a href="https://dadosabertos.compras.gov.br/swagger-ui/index.html" target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" />API / Swagger</a></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-lg flex items-center gap-2"><FileSearch className="w-5 h-5 text-primary" />Pesquisar catálogo oficial</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={pesquisarCatalogo} className="grid gap-3 md:grid-cols-[180px_1fr_auto] items-end">
              <label className="text-sm font-medium">Tipo de catálogo
                <select value={tipo} onChange={(event) => { setTipo(event.target.value as Tipo); limparResultados(); }} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="material">Material — CATMAT</option>
                  <option value="servico">Serviço — CATSER</option>
                </select>
              </label>
              <label className="text-sm font-medium">Descrição ou código
                <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder={tipo === "servico" ? "Ex.: código CATSER" : "Ex.: papel sulfite ou código CATMAT"} className="mt-1" />
              </label>
              <Button type="submit" disabled={carregandoCatalogo} className="md:mb-0">{carregandoCatalogo ? <Loader2 className="animate-spin" /> : <SearchCheck />}Pesquisar</Button>
            </form>
            {tipo === "servico" && <p className="text-xs text-muted-foreground mt-3">A API oficial permite a consulta de serviços pelo código CATSER.</p>}
          </CardContent>
        </Card>

        {catalogo && <Card>
          <CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-lg">Itens encontrados</CardTitle><p className="text-sm text-muted-foreground mt-1">{catalogo.total.toLocaleString("pt-BR")} resultado(s) no catálogo {catalogo.tipo === "material" ? "CATMAT" : "CATSER"}.</p></div><Badge variant="outline">{catalogo.emCache ? "Cache de 15 min" : "Consulta atualizada"}</Badge></div></CardHeader>
          <CardContent className="space-y-2">
            {catalogo.itens.length ? catalogo.itens.map((item) => <button key={`${item.tipo}-${item.codigo}`} type="button" onClick={() => selecionarItem(item)} className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${itemSelecionado?.codigo === item.codigo ? "border-primary bg-primary/[0.05]" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium"><span className="font-mono text-primary mr-2">{item.codigo}</span>{item.descricao}</p><p className="text-xs text-muted-foreground mt-1">{[item.grupo, item.classe, item.pdm].filter(Boolean).join(" · ") || "Classificação não informada"}</p></div><Badge variant="secondary">{texto(item.status)}</Badge></div>
              {item.ncm && <p className="text-xs text-muted-foreground mt-2">NCM: {item.ncm}</p>}
            </button>) : <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">Nenhum item encontrado com esse termo.</div>}
            {catalogo.totalPaginas > 1 && <DataPagination pagina={catalogo.pagina} totalPaginas={catalogo.totalPaginas} total={catalogo.total} onPagina={(proxima) => { const termo = new URLSearchParams({ tipo, pagina: String(proxima), tamanhoPagina: "30" }); if (/^\d+$/.test(busca.trim())) termo.set("codigo", busca.trim()); else termo.set("busca", busca.trim()); setCarregandoCatalogo(true); void api<CatalogoResult>(`/catalogo?${termo.toString()}`).then(setCatalogo).catch((erro) => toast({ title: "Falha ao mudar de página", description: String((erro as Error).message), variant: "destructive" })).finally(() => setCarregandoCatalogo(false)); }} className="pt-3" />}
          </CardContent>
        </Card>}

        {itemSelecionado && <Card>
          <CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-lg flex items-center gap-2"><Tag className="w-5 h-5 text-primary" />{itemSelecionado.descricao}</CardTitle><p className="text-sm text-muted-foreground mt-1">Código {itemSelecionado.codigo} · {itemSelecionado.tipo === "material" ? "CATMAT" : "CATSER"}</p></div><Badge variant="outline">Comparação federal</Badge></div></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[150px_150px_180px_1fr_auto] items-end">
              <label className="text-sm font-medium">UF<Input value={estado} onChange={(event) => setEstado(event.target.value.toUpperCase())} maxLength={2} placeholder="Todas" className="mt-1 uppercase" /></label>
              <label className="text-sm font-medium">Código UASG<Input value={codigoUasg} onChange={(event) => setCodigoUasg(event.target.value)} placeholder="Todas" className="mt-1" /></label>
              <label className="text-sm font-medium">Código município<Input value={codigoMunicipio} onChange={(event) => setCodigoMunicipio(event.target.value)} placeholder="Todos" className="mt-1" /></label>
              <p className="text-xs text-muted-foreground pb-2">Filtros opcionais aplicados diretamente à pesquisa de preços do Compras.gov.br.</p>
              <Button onClick={() => void consultarPrecos(itemSelecionado, 1)} disabled={carregandoPrecos}>{carregandoPrecos ? <Loader2 className="animate-spin" /> : <TrendingUp />}Atualizar preços</Button>
            </div>
          </CardContent>
        </Card>}

        {carregandoPrecos && <div className="py-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>}
        {precos && !carregandoPrecos && <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Resumo da amostra consultada</h2><p className="text-sm text-muted-foreground">{precos.resumo.comPreco.toLocaleString("pt-BR")} registro(s) com preço unitário nesta página · {precos.total.toLocaleString("pt-BR")} no resultado total.</p></div><Button variant="outline" size="sm" asChild><a href={precos.fonte} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" />Abrir consulta oficial</a></Button></div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Metric label="Mínimo" value={moeda(precos.resumo.minimo)} />
            <Metric label="Mediana" value={moeda(precos.resumo.mediana)} destaque />
            <Metric label="Média" value={moeda(precos.resumo.media)} />
            <Metric label="Máximo" value={moeda(precos.resumo.maximo)} />
            <Metric label="Registros" value={precos.total.toLocaleString("pt-BR")} />
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Preço unitário</TableHead><TableHead>Fornecedor / UASG</TableHead><TableHead>Órgão / local</TableHead><TableHead>Modalidade</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader><TableBody>
            {precos.rows.length ? precos.rows.map((row, index) => <TableRow key={`${row.idCompra || "compra"}-${row.idItemCompra || index}`}><TableCell className="whitespace-nowrap font-medium">{moeda(row.precoUnitario)}<div className="text-xs font-normal text-muted-foreground">{texto(row.unidade)}{row.quantidade !== null ? ` · qtd. ${row.quantidade.toLocaleString("pt-BR")}` : ""}</div></TableCell><TableCell className="max-w-[240px]"><p className="line-clamp-2">{texto(row.fornecedor)}</p><p className="text-xs text-muted-foreground mt-1">{texto(row.nomeUasg || row.codigoUasg)}</p></TableCell><TableCell className="max-w-[240px]"><p className="line-clamp-2">{texto(row.nomeOrgao)}</p><p className="text-xs text-muted-foreground mt-1">{[row.municipio, row.estado].filter(Boolean).join(" / ") || "Local não informado"}</p></TableCell><TableCell><Badge variant="outline">{texto(row.modalidade || row.forma)}</Badge></TableCell><TableCell className="whitespace-nowrap">{dataBr(row.dataResultado || row.dataCompra)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Nenhum preço encontrado para os filtros informados.</TableCell></TableRow>}
          </TableBody></Table><DataPagination pagina={precos.pagina} totalPaginas={precos.totalPaginas} total={precos.total} onPagina={(proxima) => void consultarPrecos(itemSelecionado!, proxima)} className="p-4 border-t" /></Card>
          <p className="text-xs text-muted-foreground">Os valores são referências de contratações públicas federais retornadas pela API oficial. Considere unidade, especificação, quantidade, data e contexto da compra antes de usar a informação no processo.</p>
        </div>}
      </main>
      <AppFooter />
    </div>
  );
}

function Metric({ label, value, destaque = false }: { label: string; value: string; destaque?: boolean }) {
  return <Card className={destaque ? "border-primary/50 bg-primary/[0.05]" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold mt-1 whitespace-nowrap">{value}</p></CardContent></Card>;
}
