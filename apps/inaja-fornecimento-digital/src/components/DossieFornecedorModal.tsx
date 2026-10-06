import { useCallback, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, Download, ExternalLink, FileSpreadsheet, FileText, Gavel, Landmark, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { DadosCadastraisRfb, DossieFornecedorData } from "@/types/dossie";
import { gerarPdfDossie } from "@/lib/dossiePdf";
import { exportarDossieExcel } from "@/lib/dossieExcel";

type Props = {
  cnpj?: string | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  dadosCadastrais?: DadosCadastraisRfb | null;
  nomeFornecedor?: string | null;
};

function formatarMoeda(valor: number): string {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataIso?: string | null): string {
  if (!dataIso) return "—";
  const [dataPart] = dataIso.split("T");
  const partes = dataPart.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dataIso;
}

export function DossieFornecedorModal({ cnpj, aberto, onOpenChange, dadosCadastrais, nomeFornecedor }: Props) {
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState<DossieFornecedorData | null>(null);
  const [erro, setErro] = useState("");
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [gerandoExcel, setGerandoExcel] = useState(false);

  const carregarDossie = useCallback(async (semCache = false) => {
    const raw = String(cnpj || "").replace(/\D/g, "");
    if (raw.length !== 14) return;
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams({ cnpj: raw });
      if (semCache) params.set("semCache", "1");
      if (nomeFornecedor) params.set("razaoSocial", nomeFornecedor);
      const res = await fetch(`/api/fornecedor/dossie?${params}`, { credentials: "same-origin" });
      const json = await res.json() as { data?: DossieFornecedorData; error?: { message?: string } };
      if (!res.ok || json.error) throw new Error(json.error?.message || "Não foi possível carregar o dossiê.");
      if (json.data) {
        setDados({
          ...json.data,
          cadastral: dadosCadastrais || json.data.cadastral || null,
        });
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido ao carregar dossiê.");
    } finally {
      setCarregando(false);
    }
  }, [cnpj, dadosCadastrais, nomeFornecedor]);

  useEffect(() => {
    if (aberto && cnpj) {
      void carregarDossie(false);
    } else if (!aberto) {
      setDados(null);
      setErro("");
    }
  }, [aberto, cnpj, carregarDossie]);

  const baixarPdf = async () => {
    if (!dados) return;
    setGerandoPdf(true);
    try {
      await gerarPdfDossie(dados);
      toast({ title: "PDF gerado", description: "O Dossiê 360° foi baixado com sucesso." });
    } catch (e) {
      toast({ title: "Erro ao gerar PDF", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setGerandoPdf(false);
    }
  };

  const baixarExcel = async () => {
    if (!dados) return;
    setGerandoExcel(true);
    try {
      await exportarDossieExcel(dados);
      toast({ title: "Excel gerado", description: "O Dossiê 360° em planilha foi baixado com sucesso." });
    } catch (e) {
      toast({ title: "Erro ao gerar Excel", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setGerandoExcel(false);
    }
  };

  const risco = dados?.diagnostico?.nivelRisco;
  const corRisco = risco === "ALTO" ? "destructive" : risco === "MEDIO" ? "secondary" : "default";

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <DialogTitle className="text-xl">Dossiê 360° do Fornecedor</DialogTitle>
                {dados?.diagnostico && (
                  <Badge variant={corRisco} className={risco === "BAIXO" ? "bg-emerald-600" : ""}>
                    Risco {dados.diagnostico.nivelRisco} · {dados.diagnostico.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {dados?.cnpjFormatado || cnpj} · {dadosCadastrais?.razao_social || dados?.transparencia?.tcu?.consolidada?.razaoSocial || nomeFornecedor || "Conferência Unificada"}
              </p>
            </div>
            {dados && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void carregarDossie(true)} disabled={carregando}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${carregando ? "animate-spin" : ""}`} />
                  Recarregar
                </Button>
                <Button size="sm" variant="outline" onClick={() => void baixarExcel()} disabled={gerandoExcel}>
                  {gerandoExcel ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />}
                  Excel
                </Button>
                <Button size="sm" onClick={() => void baixarPdf()} disabled={gerandoPdf}>
                  {gerandoPdf ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  Baixar PDF 360°
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {carregando && !dados && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Consolidando informações de Receita Federal, TCU, PNCP e Município...</p>
          </div>
        )}

        {erro && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{erro}</p>
          </div>
        )}

        {dados && (
          <div className="space-y-5 pt-2">
            <div className={`rounded-xl border p-4 ${risco === "ALTO" ? "border-red-300 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20" : risco === "MEDIO" ? "border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20" : "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"}`}>
              <div className="flex items-start gap-3">
                {risco === "ALTO" ? <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" /> : risco === "MEDIO" ? <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />}
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-base">
                    Diagnóstico de Risco: {dados.diagnostico.nivelRisco} ({dados.diagnostico.status})
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {dados.diagnostico.apto ? "Fornecedor habilitado para contratação e empenho com base nas fontes consultadas." : "Requer atenção ou regularização antes de nova contratação/pagamento."}
                  </p>
                  <div className="pt-2 grid sm:grid-cols-2 gap-2 text-xs">
                    {dados.diagnostico.pontosAtencao.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                    {dados.diagnostico.pontosPositivos.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">TCU Inidôneos</p>
                <p className={`text-xl font-bold mt-1 ${dados.transparencia.tcu.inidoneos.length > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {dados.transparencia.tcu.inidoneos.length > 0 ? `${dados.transparencia.tcu.inidoneos.length} impeditivos` : "Nada Consta"}
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">CEIS / CNEP</p>
                <p className={`text-xl font-bold mt-1 ${(dados.transparencia.portal.ceis.length + dados.transparencia.portal.cnep.length) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {dados.transparencia.portal.ceis.length + dados.transparencia.portal.cnep.length}
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">Publicações PNCP</p>
                <p className="text-xl font-bold mt-1">{dados.pncp.total}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatarMoeda(dados.pncp.valorTotal)}</p>
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">Empenhos em Inajá</p>
                <p className="text-xl font-bold mt-1">{dados.municipio.totalEmpenhos}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatarMoeda(dados.municipio.totalEmpenhado)}</p>
              </div>
            </div>

            <Tabs defaultValue="cadastral" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="cadastral" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Cadastral</TabsTrigger>
                <TabsTrigger value="conformidade" className="gap-1.5"><Landmark className="w-3.5 h-3.5" />TCU & Sanções</TabsTrigger>
                <TabsTrigger value="pncp" className="gap-1.5"><Gavel className="w-3.5 h-3.5" />PNCP ({dados.pncp.total})</TabsTrigger>
                <TabsTrigger value="municipio" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Inajá ({dados.municipio.totalEmpenhos})</TabsTrigger>
              </TabsList>

              <TabsContent value="cadastral" className="space-y-3 pt-3">
                {dados.cadastral ? (
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Razão Social</p><p className="font-semibold">{dados.cadastral.razao_social}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Nome Fantasia</p><p className="font-semibold">{dados.cadastral.nome_fantasia || "—"}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Situação Cadastral</p><p className="font-semibold">{dados.cadastral.situacao} · {formatarData(dados.cadastral.data_situacao)}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Abertura / Porte</p><p className="font-semibold">{formatarData(dados.cadastral.data_abertura)} · {dados.cadastral.porte}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Natureza Jurídica</p><p className="font-semibold">{dados.cadastral.natureza_juridica}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Capital Social / Simples</p><p className="font-semibold">{dados.cadastral.capital_social} · Simples: {dados.cadastral.simples}</p></div>
                    <div className="rounded-lg border p-3 sm:col-span-2"><p className="text-xs text-muted-foreground">Endereço</p><p className="font-semibold">{dados.cadastral.endereco || "—"}</p></div>
                    <div className="rounded-lg border p-3 sm:col-span-2"><p className="text-xs text-muted-foreground">CNAE Principal</p><p className="font-semibold">{dados.cadastral.cnae_principal || "—"}</p></div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                    Para visualizar os dados cadastrais completos da Receita Federal, faça a busca na aba Consulta de CNPJ.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="conformidade" className="space-y-4 pt-3 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">TCU — Licitantes Inidôneos</h4>
                  {dados.transparencia.tcu.inidoneos.length > 0 ? (
                    <div className="space-y-2">
                      {dados.transparencia.tcu.inidoneos.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
                          <p className="font-medium text-destructive">{item.nome || item.registro}</p>
                          <p className="text-xs text-muted-foreground">Processo: {item.processo} · Acórdão: {item.acordo} · Término da Sanção: {item.fimSancao}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200">
                      Nenhum registro de inidoneidade localizado no TCU para este CNPJ.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Portal da Transparência — CEIS & CNEP</h4>
                  {dados.transparencia.portal.ceis.length + dados.transparencia.portal.cnep.length > 0 ? (
                    <div className="space-y-2">
                      {[...dados.transparencia.portal.ceis, ...dados.transparencia.portal.cnep].map((item, idx) => (
                        <div key={idx} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{item.tipo || item.cadastro}</span>
                            <Badge variant="destructive">{item.cadastro}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.orgaoSancionador} · Vigência: {item.dataInicio} a {item.dataFim}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border">
                      {dados.transparencia.portal.configurado ? "Nenhuma sanção ativa encontrada no CEIS ou CNEP." : "Chave do Portal da Transparência não configurada no servidor."}
                    </p>
                  )}
                </div>

                {dados.transparencia.tcu.certidoes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Certidões Consolidadas TCU ({dados.transparencia.tcu.certidoes.length})</h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {dados.transparencia.tcu.certidoes.map((cert, idx) => (
                        <div key={idx} className="rounded-lg border p-2.5 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium truncate">{cert.tipo || cert.descricao || "Certidão"}</span>
                            <Badge variant="outline">{cert.situacao || "—"}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 text-[11px]">{cert.emissor} · {cert.dataEmissao || "Data não informada"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Emissão e Verificação Externa Direta</h4>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <a
                      href={dados.linksUteisCertidoes?.cndt || "https://cndt-certidao.tst.jus.br/inicio.faces"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between gap-2 text-blue-600 dark:text-blue-400 font-medium"
                    >
                      <span>CNDT — Débitos Trabalhistas (TST)</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <a
                      href={dados.linksUteisCertidoes?.fgts || "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between gap-2 text-blue-600 dark:text-blue-400 font-medium"
                    >
                      <span>CRF — Regularidade FGTS (Caixa)</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <a
                      href={dados.linksUteisCertidoes?.cndFederal || "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between gap-2 text-blue-600 dark:text-blue-400 font-medium"
                    >
                      <span>CND Federal / Previdenciária (RFB/PGFN)</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <a
                      href={dados.linksUteisCertidoes?.cnjImprobidade || "https://www.cnj.jus.br/improbidade_adm/consultar_requerido.php"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg border hover:bg-muted/50 flex items-center justify-between gap-2 text-blue-600 dark:text-blue-400 font-medium"
                    >
                      <span>Condenações por Improbidade (CNJ)</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pncp" className="space-y-3 pt-3">
                {dados.pncp.registros.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número / Ano</TableHead>
                          <TableHead>Tipo / Objeto</TableHead>
                          <TableHead>Publicação</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.pncp.registros.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {item.numero || item.chave_pncp?.slice(0, 16)}
                              <div className="text-xs text-muted-foreground">{item.ano || ""}</div>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="line-clamp-2 text-xs">{item.objeto || item.titulo || "Sem descrição"}</p>
                              <Badge variant="outline" className="mt-1 text-[10px]">{item.tipo} · {item.situacao || "Registrado"}</Badge>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{formatarData(item.data_publicacao)}</TableCell>
                            <TableCell className="text-right text-xs font-medium whitespace-nowrap">{formatarMoeda(item.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                    Nenhum registro específico vinculado no PNCP para este CNPJ no banco de dados local.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="municipio" className="space-y-4 pt-3">
                {dados.municipio.credorFixo && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20 text-xs">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">Fornecedor cadastrado como Credor Fixo</p>
                    <p className="text-muted-foreground mt-0.5">
                      Departamento: {dados.municipio.credorFixo.departamento} · Valor Mensal: {formatarMoeda(dados.municipio.credorFixo.valor_mensal)} · {dados.municipio.credorFixo.descricao}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Total Empenhado</p><p className="font-bold text-sm mt-0.5">{formatarMoeda(dados.municipio.totalEmpenhado)}</p></div>
                  <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Total Liquidado</p><p className="font-bold text-sm mt-0.5">{formatarMoeda(dados.municipio.totalLiquidado)}</p></div>
                  <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Total Pago</p><p className="font-bold text-sm mt-0.5">{formatarMoeda(dados.municipio.totalPago)}</p></div>
                  <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Saldo a Pagar</p><p className="font-bold text-sm mt-0.5">{formatarMoeda(dados.municipio.saldoPagar)}</p></div>
                </div>

                {dados.municipio.ultimosEmpenhos.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº Empenho</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Especificação</TableHead>
                          <TableHead className="text-right">Empenhado</TableHead>
                          <TableHead className="text-right">Saldo Pagar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.municipio.ultimosEmpenhos.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium text-xs whitespace-nowrap">{emp.numero_empenho}/{emp.ano_empenho}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{formatarData(emp.data)}</TableCell>
                            <TableCell className="text-xs max-w-sm line-clamp-2">{emp.especificacao || "—"}</TableCell>
                            <TableCell className="text-right text-xs whitespace-nowrap">{formatarMoeda(emp.valor_empenhado_bruto)}</TableCell>
                            <TableCell className="text-right text-xs whitespace-nowrap font-medium">{formatarMoeda(emp.saldo_pagar)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                    Nenhum empenho orçamentário registrado para este fornecedor em Inajá.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
