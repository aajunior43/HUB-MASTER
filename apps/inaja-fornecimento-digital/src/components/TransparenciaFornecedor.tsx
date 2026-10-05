import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Info, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TcuCertidao = { emissor: string; tipo: string; descricao: string; situacao: string; dataEmissao: string; observacao: string; link: string };
type TcuInidoneo = { nome: string; registro: string; processo: string; acordo: string; dataAcordao: string; transitoEmJulgado: string; fimSancao: string; municipio: string; uf: string; linkProcesso: string; linkDeliberacao: string };
type SancaoPortal = { cadastro: string; id: string; nome: string; cnpj: string | null; processo: string; tipo: string; fonte: string; fundamentacao: string; orgaoSancionador: string; situacao: string; dataInicio: string; dataFim: string; valor: number };
type ContratoPortal = { id: string; numero: string; objeto: string; fornecedor: string; cnpjFornecedor: string | null; orgao: string; situacao: string; valor: number; dataAssinatura: string; inicioVigencia: string; fimVigencia: string };

export type TransparenciaCnpjResult = {
  cnpj: string;
  consultadoEm: string;
  tcu: { disponivel: boolean; consolidada: { razaoSocial: string; nomeFantasia: string; cnpj: string; uf: string } | null; certidoes: TcuCertidao[]; inidoneos: TcuInidoneo[]; erros: string[] };
  portal: { configurado: boolean; ceis: SancaoPortal[]; cnep: SancaoPortal[]; contratos: ContratoPortal[]; erros: string[] };
  resumo: { status: "regular" | "alerta" | "parcial" | "indisponivel"; tcuOcorrencias: number; portalOcorrencias: number; totalOcorrencias: number; certidoesComOcorrencia: number; portalConfigurado: boolean; fontesComErro: number; mensagem: string };
  fontes: { tcuCertidoes: string; tcuInidoneos: string; portalSancoes: string; portalContratos: string };
  configuracao?: { portalConfigurado: boolean; cacheMinutos: number };
  cache?: boolean;
};

function somenteDigitos(valor: string | null | undefined) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCnpj(valor: string) {
  const cnpj = somenteDigitos(valor);
  return cnpj.length === 14 ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}` : valor;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusVisual(status: TransparenciaCnpjResult["resumo"]["status"]) {
  if (status === "alerta") return { label: "Atenção necessária", className: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200", icon: AlertTriangle };
  if (status === "regular") return { label: "Sem ocorrências", className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200", icon: CheckCircle2 };
  if (status === "indisponivel") return { label: "Fonte indisponível", className: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200", icon: AlertTriangle };
  return { label: "Consulta parcial", className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200", icon: Info };
}

function LinhaSancao({ registro }: { registro: SancaoPortal }) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{registro.tipo || registro.cadastro}</span>
        <Badge variant="destructive">{registro.cadastro}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{[registro.orgaoSancionador, registro.fonte, registro.processo].filter(Boolean).join(" · ") || "Registro no Portal da Transparência"}</p>
      <p className="mt-1 text-xs">Vigência: {registro.dataInicio || "—"} a {registro.dataFim || "—"}{registro.valor ? ` · ${moeda(registro.valor)}` : ""}</p>
      {registro.fundamentacao && <p className="mt-1 text-xs text-muted-foreground">{registro.fundamentacao}</p>}
    </div>
  );
}

function ConteudoTransparencia({ data, loading, error, onConsultar }: { data: TransparenciaCnpjResult | null; loading: boolean; error: string; onConsultar: () => void }) {
  const visual = data ? statusVisual(data.resumo.status) : null;
  const StatusIcon = visual?.icon;
  return (
    <div className="space-y-4">
      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando TCU e Portal da Transparência…</div>}
      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {data && visual && StatusIcon && (
        <>
          <div className={`flex items-start gap-3 rounded-lg border p-3 ${visual.className}`}>
            <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0"><p className="font-medium">{visual.label}</p><p className="text-xs opacity-90">{data.resumo.mensagem}</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">TCU</p><p className="text-lg font-semibold">{data.resumo.tcuOcorrencias}</p><p className="text-xs text-muted-foreground">ocorrências</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Portal · CEIS/CNEP</p><p className="text-lg font-semibold">{data.resumo.portalOcorrencias}</p><p className="text-xs text-muted-foreground">ocorrências</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Contratos federais</p><p className="text-lg font-semibold">{data.portal.contratos.length}</p><p className="text-xs text-muted-foreground">registros retornados</p></div>
          </div>
          {!data.portal.configurado && <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">O TCU foi consultado. Para completar CEIS, CNEP e contratos federais, configure a chave do Portal da Transparência em Administração → Configurações.</p>}
          {data.tcu.erros.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{data.tcu.erros.join(" · ")}</p>}
          {data.portal.erros.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{data.portal.erros.join(" · ")}</p>}
          {data.tcu.inidoneos.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">Licitantes inidôneos — TCU</p>{data.tcu.inidoneos.slice(0, 5).map((item, index) => <div key={`${item.processo}-${index}`} className="rounded-lg border border-red-200 p-3 text-sm dark:border-red-900"><p className="font-medium">{item.nome || item.registro}</p><p className="text-xs text-muted-foreground">{[item.processo, item.acordo, item.municipio && `${item.municipio}/${item.uf}`].filter(Boolean).join(" · ")}</p><p className="text-xs">Fim da sanção: {item.fimSancao || "não informado"}</p>{item.linkProcesso && <a className="mt-1 inline-flex items-center text-xs text-primary hover:underline" href={item.linkProcesso} target="_blank" rel="noreferrer">Acompanhar processo <ExternalLink className="ml-1 h-3 w-3" /></a>}</div>)}</div>}
          {data.portal.ceis.length + data.portal.cnep.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">Sanções no Portal da Transparência</p>{[...data.portal.ceis, ...data.portal.cnep].slice(0, 8).map((item, index) => <LinhaSancao key={`${item.cadastro}-${item.id}-${index}`} registro={item} />)}</div>}
          {data.tcu.certidoes.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">Certidões consolidadas — TCU</p><div className="grid gap-2 sm:grid-cols-2">{data.tcu.certidoes.map((item, index) => <div key={`${item.tipo}-${index}`} className="rounded-lg border p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-medium">{item.tipo || item.descricao || "Certidão"}</span><Badge variant="outline">{item.situacao || "—"}</Badge></div><p className="mt-1 text-muted-foreground">{item.emissor} · {item.dataEmissao || "data não informada"}</p>{item.link && <a className="mt-1 inline-flex items-center text-primary hover:underline" href={item.link} target="_blank" rel="noreferrer">Consulta oficial <ExternalLink className="ml-1 h-3 w-3" /></a>}</div>)}</div></div>}
          {data.portal.contratos.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">Contratos federais encontrados</p>{data.portal.contratos.slice(0, 5).map((item, index) => <div key={`${item.id}-${item.numero}-${index}`} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{item.numero || "Contrato sem número"}</span><span className="text-xs font-medium">{item.valor ? moeda(item.valor) : "Valor não informado"}</span></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.objeto || "Objeto não informado"}</p><p className="mt-1 text-xs text-muted-foreground">{[item.orgao, item.situacao, item.dataAssinatura].filter(Boolean).join(" · ")}</p></div>)}</div>}
          <div className="flex flex-wrap gap-2 pt-1"><Button size="sm" variant="outline" onClick={onConsultar} disabled={loading}><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Atualizar consulta</Button><Button size="sm" variant="ghost" asChild><a href={data.fontes.tcuCertidoes} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Abrir TCU</a></Button><Button size="sm" variant="ghost" asChild><a href={data.fontes.portalSancoes} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Abrir Portal</a></Button></div>
          <p className="text-[11px] text-muted-foreground">Consultado em {new Date(data.consultadoEm).toLocaleString("pt-BR")}{data.cache ? " · resultado em cache" : ""}.</p>
        </>
      )}
      {!data && !loading && !error && <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Clique para consultar as fontes oficiais.</div>}
    </div>
  );
}

export function TransparenciaFornecedor({ cnpj, nome, modo = "card", auto = false }: { cnpj?: string | null; nome?: string | null; modo?: "card" | "button"; auto?: boolean }) {
  const cnpjLimpo = useMemo(() => somenteDigitos(cnpj), [cnpj]);
  const disponivel = cnpjLimpo.length === 14;
  const [data, setData] = useState<TransparenciaCnpjResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const consultar = useCallback(async () => {
    if (!disponivel) return;
    setLoading(true);
    setError("");
    try {
      const resposta = await fetch(`/api/transparencia/cnpj?cnpj=${encodeURIComponent(cnpjLimpo)}`, { credentials: "same-origin" });
      const corpo = await resposta.json() as { data?: TransparenciaCnpjResult; error?: { message?: string } };
      if (!resposta.ok || corpo.error) throw new Error(corpo.error?.message || "Não foi possível consultar a transparência.");
      setData(corpo.data || null);
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : "Não foi possível consultar a transparência.");
    } finally {
      setLoading(false);
    }
  }, [cnpjLimpo, disponivel]);

  useEffect(() => {
    setData(null);
    setError("");
    if (auto && disponivel) void consultar();
  }, [auto, cnpjLimpo, disponivel, consultar]);

  if (modo === "button") {
    return (
      <>
        <Button size="icon" variant="ghost" disabled={!disponivel} onClick={() => { setDialogOpen(true); if (!data && !loading) void consultar(); }} aria-label={`Consultar transparência de ${nome || formatarCnpj(cnpjLimpo)}`} title={disponivel ? "Consultar TCU/Portal da Transparência" : "Informe um CNPJ para consultar"}>
          <ShieldCheck className="h-4 w-4 text-primary" />
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Transparência do fornecedor{nome ? ` · ${nome}` : ""}</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">CNPJ: {formatarCnpj(cnpjLimpo)}</p>
            <ConteudoTransparencia data={data} loading={loading} error={error} onConsultar={() => void consultar()} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" />TCU / Portal da Transparência</CardTitle>
        {!auto && <Button size="sm" variant="outline" onClick={() => void consultar()} disabled={!disponivel || loading}><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Consultar</Button>}
      </CardHeader>
      <CardContent>
        {!disponivel && <p className="text-sm text-muted-foreground">Este fornecedor não possui um CNPJ válido para consulta nas fontes federais.</p>}
        {disponivel && <ConteudoTransparencia data={data} loading={loading} error={error} onConsultar={() => void consultar()} />}
      </CardContent>
    </Card>
  );
}
