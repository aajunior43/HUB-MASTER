import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Check, Copy, FileDown, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { loadImageAsDataUrl } from "@/lib/pdfGenerator";
import { PageHeader } from "@/components/PageHeader";

const BRASAO_URL = "/brasao.png";

/**
 * Base legal: Decreto Municipal nº 019/2025 — Inajá/PR
 *  Anexo I  — Lei nº 1.090/2019  (Prefeito, Vice e Secretários)
 *  Anexo II — Lei nº 1.087/2019 (alt. Lei nº 1.284/2023) — demais servidores
 *
 * Regra de cálculo:
 *  • Afastamento < 12h → sem direito a diária.
 *  • De 12h a 24h → 1 diária.
 *  • Acima de 24h → 1 diária + 1 diária extra a cada 12h além das 24h iniciais.
 */

type CargoKey =
  | "prefeito"
  | "secretario"
  | "procurador"
  | "diretor"
  | "supervisor"
  | "motorista"
  | "outros";

type DestinoKey =
  | "curitiba_foz"
  | "interior_pr"
  | "brasilia_capitais"
  | "fora_estado";

interface CargoDef {
  label: string;
  anexo: "I" | "II";
  // valores por destino
  valores: Partial<Record<DestinoKey, number>>;
}

const CARGOS: Record<CargoKey, CargoDef> = {
  prefeito: {
    label: "Prefeito / Vice-Prefeito",
    anexo: "I",
    valores: {
      curitiba_foz: 667.33,
      interior_pr: 333.67,
      brasilia_capitais: 1067.73,
      fora_estado: 600.60,
    },
  },
  secretario: {
    label: "Secretário(a) Municipal",
    anexo: "I",
    valores: {
      curitiba_foz: 667.33,
      interior_pr: 333.67,
      brasilia_capitais: 1001.00,
      fora_estado: 533.87,
    },
  },
  procurador: {
    label: "Procurador(a)",
    anexo: "II",
    valores: { interior_pr: 188.69, curitiba_foz: 419.32, brasilia_capitais: 524.15 },
  },
  diretor: {
    label: "Diretor(a)",
    anexo: "II",
    valores: { interior_pr: 188.69, curitiba_foz: 419.32, brasilia_capitais: 524.15 },
  },
  supervisor: {
    label: "Supervisor(a)",
    anexo: "II",
    valores: { interior_pr: 188.69, curitiba_foz: 419.32, brasilia_capitais: 524.15 },
  },
  motorista: {
    label: "Motorista",
    anexo: "II",
    valores: { interior_pr: 209.66, curitiba_foz: 419.32, brasilia_capitais: 524.15 },
  },
  outros: {
    label: "Outros Servidores",
    anexo: "II",
    valores: { interior_pr: 188.69, curitiba_foz: 419.32, brasilia_capitais: 524.15 },
  },
};

const DESTINOS: { key: DestinoKey; label: string; anexoI: boolean; anexoII: boolean }[] = [
  { key: "curitiba_foz", label: "Curitiba / Foz do Iguaçu", anexoI: true, anexoII: true },
  { key: "interior_pr", label: "Demais cidades do Paraná", anexoI: true, anexoII: true },
  { key: "brasilia_capitais", label: "Brasília / demais capitais", anexoI: true, anexoII: true },
  { key: "fora_estado", label: "Demais cidades fora do Estado", anexoI: true, anexoII: false },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function diffHours(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 36e5;
}

function contaPernoites(saida: Date, retorno: Date) {
  const cursor = new Date(
    saida.getFullYear(),
    saida.getMonth(),
    saida.getDate() + 1,
    0, 0, 0,
  );
  let n = 0;
  while (cursor < retorno) {
    n++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return n;
}

export function CalculadoraDiarias() {
  const [cargo, setCargo] = useState<CargoKey>("outros");
  const [destino, setDestino] = useState<DestinoKey>("interior_pr");
  const [cidadeDestino, setCidadeDestino] = useState("");
  const [servico, setServico] = useState("");
  const [saida, setSaida] = useState("");
  const [retorno, setRetorno] = useState("");
  const [textoCopiado, setTextoCopiado] = useState<"diaria" | "combustivel" | null>(null);
  
  

  const cargoDef = CARGOS[cargo];
  const destinosDisponiveis = DESTINOS.filter((d) =>
    cargoDef.anexo === "I" ? d.anexoI : d.anexoII,
  );
  const valorDiaria = cargoDef.valores[destino];

  const resultado = useMemo(() => {
    if (!saida || !retorno) return null;
    const s = new Date(saida);
    const r = new Date(retorno);
    if (isNaN(s.getTime()) || isNaN(r.getTime()) || r <= s) {
      return { erro: "Informe uma data/hora de retorno posterior à saída." };
    }
    if (valorDiaria == null) {
      return { erro: "Este cargo não possui diária definida para o destino escolhido." };
    }

    const horas = diffHours(s, r);
    const pernoites = contaPernoites(s, r);

    let integrais = 0;
    let motivo = "";

    if (horas < 12) {
      motivo = `Afastamento de ${horas.toFixed(1)}h (menor que 12h) → sem direito a diária.`;
    } else if (horas <= 24) {
      integrais = 1;
      motivo = `Afastamento de ${horas.toFixed(1)}h (entre 12h e 24h) → direito a 1 diária.`;
    } else {
      integrais = 1 + Math.floor((horas - 24) / 12);
      motivo = `Afastamento de ${horas.toFixed(1)}h → 1 diária pelas primeiras 24h + ${integrais - 1} diária(s) adicional(is) (12h cada após as 24h iniciais).`;
    }

    const total = valorDiaria * integrais;
    return { horas, pernoites, integrais, motivo, total, valorDiaria };
  }, [saida, retorno, valorDiaria]);

  const descricaoEmpenho = useMemo(() => {
    if (!cidadeDestino.trim() || !servico.trim() || !saida || !retorno) return null;
    const [dataSaida, horaSaida] = saida.split("T");
    const [dataRetorno, horaRetorno] = retorno.split("T");
    if (!dataSaida || !horaSaida || !dataRetorno || !horaRetorno) return null;
    const formatarData = (data: string) => data.split("-").reverse().join("/");
    const servicoFormatado = /^(do|da|dos|das|de)\s/i.test(servico.trim()) ? servico.trim() : `do ${servico.trim()}`;
    const base = `Pela despesa empenhada referente à viagem a ${cidadeDestino.trim()}, a serviço ${servicoFormatado}, conforme o requerimento de diária.`;
    const descricao = dataSaida === dataRetorno
      ? `${base}\nDia ${formatarData(dataSaida)}, saída às ${horaSaida} e retorno às ${horaRetorno}.`
      : `${base}\nSaída em ${formatarData(dataSaida)}, às ${horaSaida}, e retorno em ${formatarData(dataRetorno)}, às ${horaRetorno}.`;
    return descricao.toLocaleUpperCase("pt-BR");
  }, [cidadeDestino, retorno, saida, servico]);

  const descricaoCombustivel = useMemo(() => {
    if (!cidadeDestino.trim() || !servico.trim() || !saida || !retorno) return null;
    const [dataSaida, horaSaida] = saida.split("T");
    const [dataRetorno, horaRetorno] = retorno.split("T");
    if (!dataSaida || !horaSaida || !dataRetorno || !horaRetorno) return null;
    const formatarData = (data: string) => data.split("-").reverse().join("/");
    const servicoFormatado = /^(do|da|dos|das|de)\s/i.test(servico.trim()) ? servico.trim() : `do ${servico.trim()}`;
    const base = `Pela despesa empenhada referente ao fornecimento de combustível destinado à viagem a ${cidadeDestino.trim()}, a serviço ${servicoFormatado}, conforme o requerimento de diária.`;
    const descricao = dataSaida === dataRetorno
      ? `${base}\nDia ${formatarData(dataSaida)}, saída às ${horaSaida} e retorno às ${horaRetorno}.`
      : `${base}\nSaída em ${formatarData(dataSaida)}, às ${horaSaida}, e retorno em ${formatarData(dataRetorno)}, às ${horaRetorno}.`;
    return descricao.toLocaleUpperCase("pt-BR");
  }, [cidadeDestino, retorno, saida, servico]);

  const copiarDescricao = async (texto: string, tipo: "diaria" | "combustivel") => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(texto);
      else {
        const campo = document.createElement("textarea");
        campo.value = texto;
        campo.style.position = "fixed";
        campo.style.opacity = "0";
        document.body.appendChild(campo);
        campo.select();
        const copiado = document.execCommand("copy");
        campo.remove();
        if (!copiado) throw new Error("Cópia não permitida pelo navegador.");
      }
      setTextoCopiado(tipo);
      toast({ title: "Descrição copiada", description: "Cole o texto no campo de descrição do empenho." });
      window.setTimeout(() => setTextoCopiado(null), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", description: "Selecione e copie o texto manualmente.", variant: "destructive" });
    }
  };

  const exportarPDF = async () => {
    if (!resultado || "erro" in resultado) {
      toast({ title: "Preencha os campos", description: "Informe saída e retorno válidos antes de exportar.", variant: "destructive" });
      return;
    }
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297;
    const M = 18;
    const CW = W - M * 2;
    const EMERALD = [6, 78, 59] as const;
    const GOLD = [201, 168, 76] as const;
    const GOLD_SOFT = [245, 240, 224] as const;
    const INK = [30, 41, 33] as const;
    const MUTED = [110, 120, 115] as const;
    const BORDER = [210, 214, 208] as const;
    const CARD = [252, 252, 250] as const;

    const fmtDT = (v: string) =>
      new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    // ── Cabeçalho institucional ────────────────────────────────────────────
    doc.setFillColor(...EMERALD);
    doc.rect(0, 0, W, 28, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 28, W, 1.2, "F");
    const brasao = await loadImageAsDataUrl(BRASAO_URL);
    if (brasao) {
      try { doc.addImage(brasao, "PNG", M, 4, 20, 20); } catch { /* ignora */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("PREFEITURA MUNICIPAL DE INAJÁ", W / 2, 11, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Estado do Paraná — CNPJ 76.970.318/0001-67", W / 2, 16.5, { align: "center" });
    doc.text("Av. Antônio Veiga Martins, 80 — CEP 87670-200", W / 2, 21.5, { align: "center" });

    const temDireito = resultado.integrais > 0;
    const statusFill: [number, number, number] = temDireito ? [245, 240, 224] : [250, 226, 226];
    const statusBorder: [number, number, number] = temDireito ? [201, 168, 76] : [220, 150, 150];
    const statusText: [number, number, number] = temDireito ? [6, 78, 59] : [150, 20, 20];
    const qtdTexto = (() => {
      const partes: string[] = [];
      if (resultado.integrais > 0) partes.push(`${resultado.integrais} diária(s) integral(is)`);
      return partes.join(" + ");
    })();

    // ── Título do documento ───────────────────────────────────────────────
    let y = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...EMERALD);
    doc.text("CÁLCULO DE DIÁRIA DE VIAGEM", W / 2, y, { align: "center" });
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - 35, y + 3, W / 2 + 35, y + 3);
    y += 11;

    // ── Faixa de status ────────────────────────────────────────────────────
    doc.setFillColor(...statusFill);
    doc.rect(M, y, CW, 12, "F");
    doc.setDrawColor(...statusBorder);
    doc.setLineWidth(0.6);
    doc.rect(M, y, CW, 12, "S");
    doc.setFillColor(...EMERALD);
    doc.rect(M, y, 2, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...statusText);
    doc.text(
      temDireito ? `DIREITO A ${qtdTexto.toUpperCase()}` : "DIÁRIA REPROVADA",
      W / 2, y + 7.5, { align: "center" },
    );
    y += 18;

    // ── Cartão de dados ───────────────────────────────────────────────────
    const destinoLabel = DESTINOS.find((d) => d.key === destino)?.label ?? "—";
    const campos: [string, string][] = [
      ["Cargo / Função:", cargoDef.label],
      ["Destino:", destinoLabel],
      ["Saída:", fmtDT(saida)],
      ["Retorno:", fmtDT(retorno)],
      ["Tempo de afastamento:", `${resultado.horas!.toFixed(1)} h`],
      ["Pernoites:", String(resultado.pernoites)],
      ["Diárias integrais:", String(resultado.integrais)],
      ["Valor unitário da diária:", brl(resultado.valorDiaria!)],
    ];
    const rowH = 8;
    const boxTop = y;
    const boxH = campos.length * rowH + 4;
    doc.setFillColor(...CARD);
    doc.rect(M, boxTop, CW, boxH, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(M, boxTop, CW, boxH, "S");
    doc.setFillColor(...EMERALD);
    doc.rect(M, boxTop, 2, boxH, "F");
    campos.forEach(([k, v], i) => {
      const ly = boxTop + 6 + i * rowH;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...EMERALD);
      doc.text(k, M + 5, ly);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK);
      doc.text(v, M + 72, ly);
    });
    y = boxTop + boxH + 8;

    // ── Detalhamento do cálculo ────────────────────────────────────────────
    if (temDireito) {
      const bh = 14;
      doc.setFillColor(...GOLD_SOFT);
      doc.rect(M, y, CW, bh, "F");
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.rect(M, y, CW, bh, "S");
      doc.setFillColor(...EMERALD);
      doc.rect(M, y, 2, bh, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...EMERALD);
      doc.text(`${resultado.integrais} diária(s) × ${brl(resultado.valorDiaria!)}`, M + 5, y + 9);
      doc.setFontSize(12);
      doc.text(brl(resultado.total!), W - M - 5, y + 9, { align: "right" });
      y += bh + 8;
    }

    // ── Fundamentação ─────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...EMERALD);
    doc.text("FUNDAMENTAÇÃO", M, y);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(M, y + 1.5, M + 38, y + 1.5);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const motivoTxt = resultado.motivo.replace(/→/g, "-");
    const motivoLinhas = doc.splitTextToSize(motivoTxt, CW - 6);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.setFillColor(...CARD);
    doc.rect(M, y, CW, motivoLinhas.length * 4.6 + 6, "FD");
    doc.text(motivoLinhas, M + 3, y + 6);
    y += motivoLinhas.length * 4.6 + 10;

    // ── Rodapé ─────────────────────────────────────────────────────────────
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(M, H - 12, W - M, H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Prefeitura Municipal de Inajá — Documento gerado eletronicamente", M, H - 8);
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, W - M, H - 8, { align: "right" });

    const nomeArq = `diaria_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(nomeArq);
    toast({ title: "PDF gerado", description: nomeArq });
  };

  return (
    <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cargo / função</Label>
              <Select
                value={cargo}
                onValueChange={(v) => {
                  const novo = v as CargoKey;
                  setCargo(novo);
                  // se destino atual não existir no novo anexo, cai pro primeiro válido
                  const anexo = CARGOS[novo].anexo;
                  const ok = DESTINOS.find((d) => d.key === destino && (anexo === "I" ? d.anexoI : d.anexoII));
                  if (!ok) {
                    const first = DESTINOS.find((d) => (anexo === "I" ? d.anexoI : d.anexoII));
                    if (first) setDestino(first.key);
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CARGOS).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={destino} onValueChange={(v) => setDestino(v as DestinoKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {destinosDisponiveis.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade-destino">Cidade de destino</Label>
              <Input id="cidade-destino" value={cidadeDestino} onChange={(e) => setCidadeDestino(e.target.value)} placeholder="Ex.: Paranavaí" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servico">Setor ou finalidade</Label>
              <Input id="servico" value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Ex.: Esporte" />
            </div>
          </div>


          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saida">Saída</Label>
              <Input
                id="saida"
                type="datetime-local"
                value={saida}
                onChange={(e) => setSaida(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retorno">Retorno</Label>
              <Input
                id="retorno"
                type="datetime-local"
                value={retorno}
                onChange={(e) => setRetorno(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Valor da diária integral</span>
            <span className="font-semibold text-foreground">
              {valorDiaria != null ? brl(valorDiaria) : "—"}
            </span>
          </div>
        </Card>

        {resultado && (
          <Card className="p-6 space-y-3">
            {"erro" in resultado ? (
              <p className="text-destructive text-sm">{resultado.erro}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                  <Stat label="Horas fora" value={resultado.horas!.toFixed(1)} />
                  <Stat label="Pernoites" value={String(resultado.pernoites)} />
                  <Stat label="Diárias integrais" value={String(resultado.integrais)} />
                </div>

                <div className="rounded-md bg-muted/50 border border-border p-3 text-sm flex gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{resultado.motivo}</span>
                </div>

                <div className="space-y-3">
                  <DescricaoCopiavel titulo="Descrição para empenho de diária" texto={descricaoEmpenho} copiado={textoCopiado === "diaria"} onCopiar={() => { if (descricaoEmpenho) void copiarDescricao(descricaoEmpenho, "diaria"); }} />
                  <DescricaoCopiavel titulo="Descrição para empenho de combustível" texto={descricaoCombustivel} copiado={textoCopiado === "combustivel"} onCopiar={() => { if (descricaoCombustivel) void copiarDescricao(descricaoCombustivel, "combustivel"); }} />
                </div>

                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {resultado.integrais! > 0 ? "Valor total devido" : "Situação"}
                    </p>
                    {resultado.integrais! > 0 ? (
                      <p className="font-display font-bold text-2xl text-primary">
                        {brl(resultado.total!)}
                      </p>
                    ) : (
                      <p className="font-display font-bold text-2xl text-destructive">
                        Sem direito a diária
                      </p>
                    )}
                  </div>
                  <Button onClick={exportarPDF} className="gap-2">
                    <FileDown className="w-4 h-4" /> Exportar PDF
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="border-b bg-muted/35 px-4 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Consulta rápida</p>
            <h2 className="mt-1 font-display text-lg font-bold">Valores de referência das diárias</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tabelas dos Anexos I e II do decreto.</p>
          </div>
          <div className="space-y-6 p-4 sm:p-6">
            <div>
              <div className="mb-3"><p className="text-sm font-semibold">Anexo I</p><p className="text-xs text-muted-foreground">Lei nº 1.090/2019 · Prefeito, Vice-Prefeito e Secretários</p></div>
              <TabelaReferencia colunas={["Destino", "Prefeito e Vice-Prefeito", "Secretários"]} linhas={[
                ["Curitiba e Foz do Iguaçu", brl(667.33), brl(667.33)],
                ["Demais cidades do Estado", brl(333.67), brl(333.67)],
                ["Brasília e demais capitais", brl(1067.73), brl(1001)],
                ["Demais cidades fora do Estado", brl(600.60), brl(533.87)],
              ]} />
            </div>
            <div>
              <div className="mb-3"><p className="text-sm font-semibold">Anexo II</p><p className="text-xs text-muted-foreground">Lei nº 1.087/2019, alterada pela Lei nº 1.284/2023 · Demais servidores</p></div>
              <TabelaReferencia colunas={["Referência", "Interior do Estado", "Capital e Foz do Iguaçu", "Brasília"]} linhas={[
                ["Procurador(a)", brl(188.69), brl(419.32), brl(524.15)],
                ["Diretores", brl(188.69), brl(419.32), brl(524.15)],
                ["Supervisores", brl(188.69), brl(419.32), brl(524.15)],
                ["Motoristas", brl(209.66), brl(419.32), brl(524.15)],
                ["Outros servidores", brl(188.69), brl(419.32), brl(524.15)],
              ]} />
            </div>
          </div>
        </Card>

        <Card className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">
            Base legal — Decreto Municipal nº 019/2025 (Inajá/PR)
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Anexo I — Lei nº 1.090/2019 (Prefeito, Vice e Secretários).</li>
            <li>Anexo II — Lei nº 1.087/2019, alterada pela Lei nº 1.284/2023 (demais servidores).</li>
            <li>Afastamento inferior a 12h: sem direito a diária.</li>
            <li>De 12h até 24h de afastamento: 1 diária.</li>
            <li>Acima de 24h: cada 12h adicionais geram +1 diária.</li>
          </ul>
        </Card>
    </div>
  );
}

export default function Diarias() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calculator}
        title="Calculadora de diárias"
        subtitle="Decreto Municipal nº 019/2025 — Inajá/PR"
        maxWidth="max-w-3xl"
      />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <CalculadoraDiarias />
      </main>
    </div>
  );
}

function TabelaReferencia({ colunas, linhas }: { colunas: string[]; linhas: string[][] }) {
  return <div className="overflow-hidden rounded-lg border"><Table><TableHeader className="bg-muted/55"><TableRow>{colunas.map((coluna) => <TableHead key={coluna} className="h-auto whitespace-normal px-3 py-3 text-xs font-semibold text-foreground">{coluna}</TableHead>)}</TableRow></TableHeader><TableBody>{linhas.map((linha) => <TableRow key={linha[0]}>{linha.map((celula, indice) => <TableCell key={`${linha[0]}-${indice}`} className={indice === 0 ? "px-3 py-3 text-sm font-medium" : "whitespace-nowrap px-3 py-3 text-sm"}>{celula}</TableCell>)}</TableRow>)}</TableBody></Table></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-lg text-foreground">{value}</p>
    </div>
  );
}

function DescricaoCopiavel({ titulo, texto, copiado, onCopiar }: { titulo: string; texto: string | null; copiado: boolean; onCopiar: () => void }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-primary">{titulo}</p><p className="mt-0.5 text-xs text-muted-foreground">Preencha cidade e setor/finalidade para gerar o texto.</p></div>{texto && <Button size="sm" variant="outline" className="bg-background" onClick={onCopiar}>{copiado ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}{copiado ? "Copiada" : "Copiar descrição"}</Button>}</div>{texto ? <p className="mt-3 whitespace-pre-line rounded-lg border bg-background p-3 text-sm leading-6 text-foreground">{texto}</p> : <p className="mt-3 text-sm text-muted-foreground">Informe a cidade de destino e o setor ou finalidade da viagem.</p>}
    </div>
  );
}
