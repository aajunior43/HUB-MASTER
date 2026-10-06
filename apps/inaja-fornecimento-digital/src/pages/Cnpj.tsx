import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { TransparenciaFornecedor } from "@/components/TransparenciaFornecedor";
import { DossieFornecedorModal } from "@/components/DossieFornecedorModal";
import { gerarPdfCnpj } from "@/lib/cnpjPdf";
import { Search, Building2, Loader2, User, Phone, Mail, MapPin, Copy, CheckCircle2, AlertCircle, ScrollText, FileDown, MessageCircle, History, Star, FilePlus2, ExternalLink, GitCompareArrows, ShieldCheck } from "lucide-react";

type Socio = { nome: string; qualificacao: string };

type CnpjResult = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao: string;
  data_situacao: string;
  data_abertura: string;
  natureza_juridica: string;
  capital_social: string;
  porte: string;
  simples: string;
  mei: string;
  matriz: string;
  endereco: string;
  cnae_principal: string;
  cnaes_secundarios: string[];
  socios: Socio[];
  telefones: string[];
  emails: string[];
  fonte: string;
};

const fmtCnpj = (v: string) => {
  const d = v.replace(/\D/g, "");
  if (d.length !== 14) return v;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
};

const numeroWhatsApp = (telefone?: string) => {
  const digitos = String(telefone || "").replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) return digitos;
  return null;
};

export default function Cnpj() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CnpjResult | null>(null);
  const [error, setError] = useState("");
  const [historico, setHistorico] = useState<CnpjResult[]>([]);
  const [favoritos, setFavoritos] = useState<CnpjResult[]>([]);
  const [compararCom, setCompararCom] = useState<CnpjResult | null>(null);
  const [comparacaoAberta, setComparacaoAberta] = useState(false);
  const [cnpjComparacao, setCnpjComparacao] = useState("");
  const [carregandoComparacao, setCarregandoComparacao] = useState(false);
  const [dossieAberto, setDossieAberto] = useState(false);

  const carregarListas = useCallback(async () => {
    if (!user) return;
    const { data, error: erroListas } = await db.rpc("cnpj_salvos_listar", { _caller: user }) as unknown as { data: { tipo: string; dados: string }[] | null; error: { message: string } | null };
    if (erroListas) return;
    const registros = (data || []).flatMap((item) => { try { return [{ tipo: item.tipo, empresa: JSON.parse(item.dados) as CnpjResult }]; } catch { return []; } });
    if (!registros.length) {
      try {
        const legados = [
          ...JSON.parse(localStorage.getItem(`inaja:cnpj:historico:${user}`) || "[]").map((empresa: CnpjResult) => ({ tipo: "historico", empresa })),
          ...JSON.parse(localStorage.getItem(`inaja:cnpj:favoritos:${user}`) || "[]").map((empresa: CnpjResult) => ({ tipo: "favorito", empresa })),
        ];
        for (const item of legados) void db.rpc("cnpj_salvo_salvar", { _caller: user, _tipo: item.tipo, _empresa: item.empresa });
        registros.push(...legados);
      } catch { registros.splice(0); }
    }
    setHistorico(registros.filter((item) => item.tipo === "historico").map((item) => item.empresa).slice(0, 8));
    setFavoritos(registros.filter((item) => item.tipo === "favorito").map((item) => item.empresa).slice(0, 12));
  }, [user]);
  useEffect(() => { void carregarListas(); }, [carregarListas]);

  const registrarConsulta = (empresa: CnpjResult) => {
    setHistorico((atual) => [empresa, ...atual.filter((item) => item.cnpj !== empresa.cnpj)].slice(0, 8));
    if (user) void db.rpc("cnpj_salvo_salvar", { _caller: user, _tipo: "historico", _empresa: empresa });
  };
  const alternarFavorito = (empresa: CnpjResult) => {
    const existe = favoritos.some((item) => item.cnpj === empresa.cnpj);
    setFavoritos((atual) => existe ? atual.filter((item) => item.cnpj !== empresa.cnpj) : [empresa, ...atual].slice(0, 12));
    if (user) void db.rpc(existe ? "cnpj_salvo_remover" : "cnpj_salvo_salvar", existe ? { _caller: user, _tipo: "favorito", _cnpj: empresa.cnpj } : { _caller: user, _tipo: "favorito", _empresa: empresa });
  };

  const consultar = async () => {
    const raw = cnpj.replace(/\D/g, "");
    if (raw.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Digite 14 dígitos", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    const { data, error: err } = await db.rpc("cnpj_buscar", {
      _cnpj: raw,
    }) as unknown as { data: CnpjResult | null; error: { message: string } | null };
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      setResult(data);
      registrarConsulta(data);
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast({ title: "Copiado" });
  };
  const copiarDadosCompletos = (empresa: CnpjResult) => copiar([`RAZÃO SOCIAL: ${empresa.razao_social}`, `NOME FANTASIA: ${empresa.nome_fantasia}`, `CNPJ: ${fmtCnpj(empresa.cnpj)}`, `ENDEREÇO: ${empresa.endereco}`, `TELEFONES: ${empresa.telefones.filter(Boolean).join(", ")}`, `E-MAILS: ${empresa.emails.filter(Boolean).join(", ")}`].join("\n"));

  const situacaoBadge = (situacao: string) => {
    const ativa = situacao.toLowerCase().includes("ativo") || situacao.toLowerCase().includes("regular") || situacao.toLowerCase().includes("habilitado");
    return (
      <Badge variant={ativa ? "default" : "secondary"} className={ativa ? "bg-emerald-600" : ""}>
        {ativa ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
        {situacao || "—"}
      </Badge>
    );
  };
  const telefoneWhatsApp = result?.telefones?.map(numeroWhatsApp).find((telefone): telefone is string => Boolean(telefone));
  const linkMapa = result?.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.endereco)}` : null;
  const dadosFaltantes = result ? [["telefone", result.telefones?.length > 0], ["e-mail", result.emails?.length > 0], ["endereço", Boolean(result.endereco)], ["nome fantasia", Boolean(result.nome_fantasia)]].filter(([, disponivel]) => !disponivel).map(([nome]) => nome) : [];
  const empresaComparada = useMemo(() => compararCom && result && compararCom.cnpj !== result.cnpj ? compararCom : null, [compararCom, result]);
  const selecionarComparacao = (empresa: CnpjResult) => {
    if (!result || empresa.cnpj === result.cnpj) return toast({ title: "Escolha outra empresa", description: "A comparação precisa de duas empresas diferentes." });
    setCompararCom(empresa);
    setComparacaoAberta(true);
    window.setTimeout(() => document.getElementById("comparacao-cnpj")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const buscarComparacao = async () => {
    const raw = cnpjComparacao.replace(/\D/g, "");
    if (raw.length !== 14) return toast({ title: "CNPJ inválido", description: "Digite os 14 dígitos para comparar.", variant: "destructive" });
    if (raw === result?.cnpj.replace(/\D/g, "")) return toast({ title: "Escolha outra empresa", description: "A comparação precisa de duas empresas diferentes." });
    setCarregandoComparacao(true);
    const { data, error: erroComparacao } = await db.rpc("cnpj_buscar", { _cnpj: raw }) as unknown as { data: CnpjResult | null; error: { message: string } | null };
    setCarregandoComparacao(false);
    if (erroComparacao) return toast({ title: "Não foi possível consultar", description: erroComparacao.message, variant: "destructive" });
    if (data) {
      setCompararCom(data);
      registrarConsulta(data);
      setCnpjComparacao("");
      window.setTimeout(() => document.getElementById("comparacao-cnpj")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Building2}
        title="Consulta de CNPJ"
        subtitle="Busca em BrasilAPI, ReceitaWS e CNPJá"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Digite o CNPJ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 14);
                    let fmt = d;
                    if (d.length > 2) fmt = `${d.slice(0,2)}.${d.slice(2)}`;
                    if (d.length > 5) fmt = `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
                    if (d.length > 8) fmt = `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
                    if (d.length > 12) fmt = `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
                    setCnpj(fmt);
                  }}
                  className="pl-9 font-mono text-lg"
                  maxLength={18}
                  onKeyDown={(e) => e.key === "Enter" && consultar()}
                />
              </div>
              <Button onClick={consultar} disabled={loading} size="lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Card>
              <CardHeader className="space-y-5 pb-4">
                <div className="flex flex-col gap-4">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-xl">{result.razao_social}</CardTitle>
                    {result.nome_fantasia && result.nome_fantasia !== result.razao_social && (
                      <p className="text-muted-foreground">{result.nome_fantasia}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDossieAberto(true)}>
                      <ShieldCheck className="mr-1.5 h-4 w-4" /> Dossiê 360°
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => copiarDadosCompletos(result)}><Copy className="mr-2 h-4 w-4" />Copiar dados</Button>
                    <Button size="sm" variant="ghost" onClick={() => alternarFavorito(result)}><Star className="mr-2 h-4 w-4" fill={favoritos.some((empresa) => empresa.cnpj === result.cnpj) ? "currentColor" : "none"} />{favoritos.some((empresa) => empresa.cnpj === result.cnpj) ? "Favorita" : "Favoritar"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setComparacaoAberta((aberta) => !aberta)}><GitCompareArrows className="mr-2 h-4 w-4" />Comparar</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/solicitacoes", { state: { empresaCnpj: { nome: result.nome_fantasia || result.razao_social, cnpj: fmtCnpj(result.cnpj), endereco: result.endereco } } })}><FilePlus2 className="mr-2 h-4 w-4" />Criar solicitação</Button>
                    {telefoneWhatsApp && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild><a href={`https://wa.me/${telefoneWhatsApp}`} target="_blank" rel="noreferrer" aria-label={`Abrir WhatsApp de ${result.nome_fantasia || result.razao_social}`}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>}
                    {linkMapa && <Button size="sm" variant="outline" asChild><a href={linkMapa} target="_blank" rel="noreferrer" aria-label={`Abrir endereço de ${result.nome_fantasia || result.razao_social} no mapa`}><MapPin className="mr-2 h-4 w-4" />Abrir no mapa</a></Button>}
                    <Button size="sm" variant="ghost" onClick={() => void gerarPdfCnpj(result)}>
                      <FileDown className="mr-2 h-4 w-4" /> Gerar PDF
                    </Button>
                    {situacaoBadge(result.situacao)}
                    <Badge variant="outline">{result.fonte}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">CNPJ</span>
                    <span className="font-mono font-medium">{fmtCnpj(result.cnpj)}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5 ml-1" onClick={() => copiar(fmtCnpj(result.cnpj))}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Data Abertura</span>
                    <span>{result.data_abertura || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Matriz/Filial</span>
                    <span>{result.matriz || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Porte</span>
                    <span>{result.porte || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Natureza Jurídica</span>
                    <span>{result.natureza_juridica || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Capital Social</span>
                    <span className="font-medium">{result.capital_social || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Simples Nacional</span>
                    <span>{result.simples || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">MEI</span>
                    <span>{result.mei || "—"}</span>
                  </div>
                  {result.data_situacao && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Data Situação</span>
                      <span>{result.data_situacao}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{result.endereco || "—"}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copiar(result.endereco)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                   {result.telefones?.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a className="hover:text-primary hover:underline" href={`tel:${result.telefones[0].replace(/\D/g, "")}`}>{result.telefones.join(", ")}</a>
                    </div>
                  )}
                   {result.emails?.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a className="hover:text-primary hover:underline" href={`mailto:${result.emails[0]}`}>{result.emails.join(", ")}</a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <TransparenciaFornecedor cnpj={result.cnpj} nome={result.nome_fantasia || result.razao_social} auto />

            {comparacaoAberta && <Card className="border-primary/25"><CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><GitCompareArrows className="h-4 w-4 text-primary" />Selecionar empresa para comparar</CardTitle><p className="mt-1 text-xs text-muted-foreground">Escolha uma empresa salva ou consulte outro CNPJ.</p></div><Button size="sm" variant="ghost" onClick={() => setComparacaoAberta(false)}>Fechar</Button></CardHeader><CardContent className="space-y-5"><div className="flex flex-col gap-2 sm:flex-row"><Input value={cnpjComparacao} onChange={(event) => setCnpjComparacao(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void buscarComparacao()} placeholder="Digite outro CNPJ para comparar" className="font-mono" maxLength={18} /><Button onClick={() => void buscarComparacao()} disabled={carregandoComparacao}>{carregandoComparacao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Consultar</Button></div><div className="grid gap-4 sm:grid-cols-2"><SelecaoComparacao titulo="Favoritos" empresas={favoritos} onSelecionar={selecionarComparacao} /><SelecaoComparacao titulo="Consultas recentes" empresas={historico} onSelecionar={selecionarComparacao} /></div></CardContent></Card>}

            {empresaComparada && <Card id="comparacao-cnpj" className="border-primary/25 bg-primary/[0.03]"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Comparação cadastral</CardTitle><p className="mt-1 text-xs text-muted-foreground">Empresa atual e empresa selecionada lado a lado.</p></div><Button size="sm" variant="ghost" onClick={() => setCompararCom(null)}>Fechar</Button></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><ComparativoEmpresa titulo="Consulta atual" empresa={result} /><ComparativoEmpresa titulo="Empresa comparada" empresa={empresaComparada} /></CardContent></Card>}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" />Localização</CardTitle></CardHeader><CardContent>{linkMapa ? <iframe title={`Mapa de ${result.razao_social}`} className="h-64 w-full rounded-lg border" src={`https://www.google.com/maps?q=${encodeURIComponent(result.endereco)}&output=embed`} loading="lazy" /> : <p className="text-sm text-muted-foreground">Endereço não disponível para exibir o mapa.</p>}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" />Dados cadastrais</CardTitle></CardHeader><CardContent className="space-y-4">{dadosFaltantes.length ? <p className="text-sm text-muted-foreground">Sem informação de: <span className="font-medium text-foreground">{dadosFaltantes.join(", ")}</span>.</p> : <p className="text-sm text-emerald-600">Os principais dados de contato estão disponíveis.</p>}<div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consultas oficiais</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><a href="https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal" target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Certidão federal</a></Button><Button size="sm" variant="outline" asChild><a href="https://consultacnpj.redesim.gov.br/" target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Redesim</a></Button></div></div></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {result.cnae_principal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ScrollText className="w-4 h-4" /> CNAE Principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{result.cnae_principal}</p>
                  </CardContent>
                </Card>
              )}

               {result.cnaes_secundarios?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ScrollText className="w-4 h-4" /> CNAEs Secundários ({result.cnaes_secundarios.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {result.cnaes_secundarios.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

             {result.socios?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" /> Sócios ({result.socios.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {result.socios.map((s, i) => (
                      <div key={i} className="py-2 flex items-center justify-between text-sm">
                        <span className="font-medium">{s.nome}</span>
                        <span className="text-muted-foreground">{s.qualificacao}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
        {(favoritos.length > 0 || historico.length > 0) && <div className="grid gap-6 lg:grid-cols-2"><ListaEmpresas titulo="Fornecedores favoritos" icone={<Star className="h-4 w-4 text-amber-500" fill="currentColor" />} empresas={favoritos} onAbrir={setResult} onComparar={selecionarComparacao} /><ListaEmpresas titulo="Consultas recentes" icone={<History className="h-4 w-4 text-primary" />} empresas={historico} onAbrir={setResult} onComparar={selecionarComparacao} /></div>}

        <DossieFornecedorModal
          aberto={dossieAberto}
          onOpenChange={setDossieAberto}
          cnpj={result?.cnpj}
          dadosCadastrais={result}
          nomeFornecedor={result?.nome_fantasia || result?.razao_social}
        />
      </div>
    </div>
  );
}

function ListaEmpresas({ titulo, icone, empresas, onAbrir, onComparar }: { titulo: string; icone: React.ReactNode; empresas: CnpjResult[]; onAbrir: (empresa: CnpjResult) => void; onComparar: (empresa: CnpjResult) => void }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm">{icone}{titulo}</CardTitle></CardHeader><CardContent className="space-y-2">{empresas.length ? empresas.map((empresa) => <div key={empresa.cnpj} className="flex items-center justify-between gap-2 rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{empresa.nome_fantasia || empresa.razao_social}</p><p className="text-xs text-muted-foreground">{fmtCnpj(empresa.cnpj)}</p></div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => onAbrir(empresa)}>Abrir</Button><Button size="sm" variant="ghost" onClick={() => onComparar(empresa)}>Comparar</Button></div></div>) : <p className="text-sm text-muted-foreground">Nenhuma empresa salva.</p>}</CardContent></Card>;
}

function SelecaoComparacao({ titulo, empresas, onSelecionar }: { titulo: string; empresas: CnpjResult[]; onSelecionar: (empresa: CnpjResult) => void }) {
  return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>{empresas.length ? <div className="mt-2 space-y-1">{empresas.slice(0, 5).map((empresa) => <button key={empresa.cnpj} type="button" className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-background" onClick={() => onSelecionar(empresa)}><span className="min-w-0"><span className="block truncate font-medium">{empresa.nome_fantasia || empresa.razao_social}</span><span className="block text-xs text-muted-foreground">{fmtCnpj(empresa.cnpj)}</span></span><GitCompareArrows className="h-4 w-4 shrink-0 text-primary" /></button>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Nenhuma empresa disponível.</p>}</div>;
}

function ComparativoEmpresa({ titulo, empresa }: { titulo: string; empresa: CnpjResult }) {
  return <div className="rounded-lg border p-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{titulo}</p><p className="mt-2 font-medium">{empresa.nome_fantasia || empresa.razao_social}</p><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">CNPJ</dt><dd>{fmtCnpj(empresa.cnpj)}</dd></div><div><dt className="text-xs text-muted-foreground">Situação</dt><dd>{empresa.situacao || "—"}</dd></div><div><dt className="text-xs text-muted-foreground">Porte</dt><dd>{empresa.porte || "—"}</dd></div><div><dt className="text-xs text-muted-foreground">Contato</dt><dd>{empresa.telefones?.[0] || empresa.emails?.[0] || "—"}</dd></div></dl></div>;
}
