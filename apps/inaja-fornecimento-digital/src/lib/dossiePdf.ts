import type { DossieFornecedorData } from "@/types/dossie";
import { loadImageAsDataUrl } from "@/lib/pdfGenerator";

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

export async function gerarPdfDossie(dados: DossieFornecedorData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 14;
  const L = W - 2 * M;
  let y = 38;

  const C = {
    deep: [6, 78, 59] as [number, number, number],
    gold: [201, 168, 76] as [number, number, number],
    textDark: [30, 41, 33] as [number, number, number],
    textMuted: [95, 105, 100] as [number, number, number],
    border: [215, 220, 215] as [number, number, number],
    bgLight: [247, 250, 248] as [number, number, number],
    alertBg: [254, 242, 242] as [number, number, number],
    alertBorder: [248, 113, 113] as [number, number, number],
    alertText: [153, 27, 27] as [number, number, number],
    okBg: [240, 253, 244] as [number, number, number],
    okBorder: [74, 222, 128] as [number, number, number],
    okText: [22, 101, 52] as [number, number, number],
    warnBg: [255, 251, 235] as [number, number, number],
    warnBorder: [251, 191, 36] as [number, number, number],
    warnText: [146, 64, 14] as [number, number, number],
  };

  const novaPaginaSeNecessario = (altura = 14) => {
    if (y + altura < H - 18) return;
    doc.addPage();
    y = 22;
  };

  const tituloSecao = (titulo: string) => {
    novaPaginaSeNecessario(14);
    doc.setFillColor(...C.deep);
    doc.roundedRect(M, y - 5, L, 7.5, 1, 1, "F");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(255, 255, 255);
    doc.text(titulo.toUpperCase(), M + 3, y);
    y += 8.5;
  };

  const linhaTexto = (rotulo: string, valor: string, larguraRotulo = 45) => {
    novaPaginaSeNecessario(7);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...C.textMuted);
    doc.text(rotulo, M, y);
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...C.textDark);
    const linhas = doc.splitTextToSize(valor || "—", L - larguraRotulo);
    doc.text(linhas, M + larguraRotulo, y);
    y += Math.max(5, linhas.length * 4.2);
  };

  doc.setProperties({
    title: `Dossiê 360° - ${dados.cnpjFormatado}`,
    author: "Prefeitura Municipal de Inajá",
    subject: "Dossiê Consolidado de Fornecedor",
  });

  const brasao = await loadImageAsDataUrl("/brasao.png");

  doc.setFillColor(...C.deep);
  doc.rect(0, 0, W, 26, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 26, W, 1.2, "F");

  if (brasao) {
    try {
      doc.addImage(brasao, "PNG", M, 3.5, 48, 19);
    } catch {
      // brasao opcional
    }
  }

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(255, 255, 255);
  doc.text("PREFEITURA MUNICIPAL DE INAJÁ", W - M, 10, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(240, 240, 240);
  doc.text("Estado do Paraná · Dossiê 360° de Fornecedor", W - M, 15, { align: "right" });
  doc.text(`Emitido em: ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`, W - M, 20, { align: "right" });

  const nomeRazao = dados.cadastral?.razao_social || dados.transparencia.tcu.consolidada?.razaoSocial || dados.pncp.registros[0]?.fornecedor_nome || dados.municipio.credorFixo?.nome || "FORNECEDOR / CREDOR";
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...C.deep);
  const nomeQuebrado = doc.splitTextToSize(nomeRazao, L);
  doc.text(nomeQuebrado, M, y);
  y += nomeQuebrado.length * 5.2;

  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...C.textDark);
  doc.text(`CNPJ: ${dados.cnpjFormatado}`, M, y);
  if (dados.cadastral?.nome_fantasia && dados.cadastral.nome_fantasia !== nomeRazao) {
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...C.textMuted);
    doc.text(`Nome Fantasia: ${dados.cadastral.nome_fantasia}`, M + 65, y);
  }
  y += 7;

  const risco = dados.diagnostico.nivelRisco;
  const boxCor = risco === "ALTO" ? C.alertBg : risco === "MEDIO" ? C.warnBg : C.okBg;
  const borderCor = risco === "ALTO" ? C.alertBorder : risco === "MEDIO" ? C.warnBorder : C.okBorder;
  const textCor = risco === "ALTO" ? C.alertText : risco === "MEDIO" ? C.warnText : C.okText;

  doc.setFillColor(...boxCor);
  doc.setDrawColor(...borderCor);
  doc.setLineWidth(0.4);
  const alturaBox = 16 + (dados.diagnostico.pontosAtencao.length + dados.diagnostico.pontosPositivos.length) * 4;
  doc.roundedRect(M, y, L, alturaBox, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...textCor);
  doc.text(`DIAGNÓSTICO: RISCO ${risco} — ${dados.diagnostico.status.toUpperCase()}`, M + 4, y + 5.5);

  let diagY = y + 10;
  doc.setFont("helvetica", "normal").setFontSize(7.5);
  for (const ponto of dados.diagnostico.pontosAtencao) {
    doc.setTextColor(...C.alertText);
    doc.text(`• [ATENÇÃO] ${ponto}`, M + 4, diagY);
    diagY += 4;
  }
  for (const ponto of dados.diagnostico.pontosPositivos) {
    doc.setTextColor(...C.okText);
    doc.text(`• [CONFORME] ${ponto}`, M + 4, diagY);
    diagY += 4;
  }
  y += alturaBox + 7;

  if (dados.cadastral) {
    tituloSecao("1. Dados Cadastrais (Receita Federal)");
    linhaTexto("Situação Cadastral", `${dados.cadastral.situacao || "—"} (${formatarData(dados.cadastral.data_situacao)})`);
    linhaTexto("Abertura / Tipo", `${formatarData(dados.cadastral.data_abertura)} · ${dados.cadastral.matriz || "—"} · Porte: ${dados.cadastral.porte || "—"}`);
    linhaTexto("Natureza Jurídica", dados.cadastral.natureza_juridica || "—");
    linhaTexto("Capital Social", dados.cadastral.capital_social || "—");
    linhaTexto("Regime", `Simples: ${dados.cadastral.simples || "—"} · MEI: ${dados.cadastral.mei || "—"}`);
    linhaTexto("Endereço", dados.cadastral.endereco || "—");
    linhaTexto("CNAE Principal", dados.cadastral.cnae_principal || "—");
    if (dados.cadastral.telefones?.length || dados.cadastral.emails?.length) {
      linhaTexto("Contatos", `Tel: ${dados.cadastral.telefones.filter(Boolean).join(", ") || "—"} · E-mail: ${dados.cadastral.emails.filter(Boolean).join(", ") || "—"}`);
    }
    if (dados.cadastral.socios?.length) {
      const sociosStr = dados.cadastral.socios.map(s => `${s.nome} (${s.qualificacao})`).join("; ");
      linhaTexto("Quadro Societário", sociosStr);
    }
    y += 3;
  }

  tituloSecao("2. Conformidade e Sanções (TCU & Portal da Transparência)");
  linhaTexto("Licitantes Inidôneos TCU", dados.transparencia.tcu.inidoneos.length > 0 ? `${dados.transparencia.tcu.inidoneos.length} registro(s) impeditivo(s)` : "Nada Consta (Regular)");
  if (dados.transparencia.tcu.inidoneos.length > 0) {
    for (const inid of dados.transparencia.tcu.inidoneos.slice(0, 3)) {
      linhaTexto("Detalhe TCU", `${inid.processo || "Proc."} · Acórdão: ${inid.acordo || "—"} · Fim Sanção: ${inid.fimSancao || "—"}`, 45);
    }
  }
  linhaTexto("Certidões TCU", `${dados.transparencia.tcu.certidoes.length} certidão(ões) consultadas · ${dados.transparencia.resumo.certidoesComOcorrencia} com ressalva`);
  linhaTexto("CEIS / CNEP Federal", dados.transparencia.portal.configurado ? `${dados.transparencia.portal.ceis.length + dados.transparencia.portal.cnep.length} ocorrência(s) registrada(s)` : "Portal da Transparência não configurado");
  linhaTexto("Contratos Federais", `${dados.transparencia.portal.contratos.length} contrato(s) federal(is) localizado(s)`);
  y += 3;

  tituloSecao("3. Contratações Públicas no PNCP");
  linhaTexto("Total Registros PNCP", `${dados.pncp.total} publicação(ões) localizada(s) · Valor total: ${formatarMoeda(dados.pncp.valorTotal)}`);
  if (dados.pncp.registros.length > 0) {
    novaPaginaSeNecessario(15);
    doc.setFillColor(...C.bgLight);
    doc.rect(M, y, L, 5, "F");
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...C.textDark);
    doc.text("Número / Ano", M + 2, y + 3.5);
    doc.text("Tipo / Modalidade", M + 35, y + 3.5);
    doc.text("Objeto", M + 75, y + 3.5);
    doc.text("Valor (R$)", W - M - 2, y + 3.5, { align: "right" });
    y += 6;

    for (const reg of dados.pncp.registros.slice(0, 8)) {
      novaPaginaSeNecessario(9);
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textDark);
      doc.text(`${reg.numero || reg.chave_pncp?.slice(0, 14)}/${reg.ano || "—"}`, M + 2, y + 3.5);
      doc.text(`${reg.tipo} · ${reg.modalidade || reg.situacao || "—"}`, M + 35, y + 3.5);
      const objClip = doc.splitTextToSize(reg.objeto || reg.titulo || "—", 70);
      doc.text(objClip[0] || "—", M + 75, y + 3.5);
      doc.text(formatarMoeda(reg.valor), W - M - 2, y + 3.5, { align: "right" });
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(M, y + 5, W - M, y + 5);
      y += 6;
    }
  }
  y += 3;

  tituloSecao("4. Histórico no Município de Inajá (Empenhos)");
  linhaTexto("Total Empenhos Locais", `${dados.municipio.totalEmpenhos} empenho(s) emitido(s) ${dados.municipio.anos.length ? `(${dados.municipio.anos.join(", ")})` : ""}`);
  linhaTexto("Total Empenhado Líquido", formatarMoeda(dados.municipio.totalEmpenhado));
  linhaTexto("Total Liquidado", formatarMoeda(dados.municipio.totalLiquidado));
  linhaTexto("Total Pago", formatarMoeda(dados.municipio.totalPago));
  linhaTexto("Saldo a Pagar", formatarMoeda(dados.municipio.saldoPagar));
  if (dados.municipio.credorFixo) {
    linhaTexto("Credor Fixo Municipal", `Sim · Departamento: ${dados.municipio.credorFixo.departamento} · Mensal: ${formatarMoeda(dados.municipio.credorFixo.valor_mensal)}`);
  }

  if (dados.municipio.ultimosEmpenhos.length > 0) {
    novaPaginaSeNecessario(15);
    doc.setFillColor(...C.bgLight);
    doc.rect(M, y, L, 5, "F");
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...C.textDark);
    doc.text("Empenho / Ano", M + 2, y + 3.5);
    doc.text("Data", M + 30, y + 3.5);
    doc.text("Especificação", M + 55, y + 3.5);
    doc.text("Empenhado", W - M - 30, y + 3.5, { align: "right" });
    doc.text("Saldo Pagar", W - M - 2, y + 3.5, { align: "right" });
    y += 6;

    for (const emp of dados.municipio.ultimosEmpenhos.slice(0, 8)) {
      novaPaginaSeNecessario(9);
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textDark);
      doc.text(`${emp.numero_empenho}/${emp.ano_empenho}`, M + 2, y + 3.5);
      doc.text(formatarData(emp.data), M + 30, y + 3.5);
      const espClip = doc.splitTextToSize(emp.especificacao || "—", 65);
      doc.text(espClip[0] || "—", M + 55, y + 3.5);
      doc.text(formatarMoeda(emp.valor_empenhado_bruto), W - M - 30, y + 3.5, { align: "right" });
      doc.text(formatarMoeda(emp.saldo_pagar), W - M - 2, y + 3.5, { align: "right" });
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(M, y + 5, W - M, y + 5);
      y += 6;
    }
  }

  const paginasTotal = doc.getNumberOfPages();
  for (let p = 1; p <= paginasTotal; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(M, H - 12, W - M, H - 12);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textMuted);
    doc.text("Prefeitura Municipal de Inajá — PR · Sistema Integrado de Gestão Pública", M, H - 8);
    doc.text(`Página ${p} de ${paginasTotal}`, W - M, H - 8, { align: "right" });
  }

  const nomeArquivo = `dossie-fornecedor-${dados.cnpj}.pdf`;
  doc.save(nomeArquivo);
}
