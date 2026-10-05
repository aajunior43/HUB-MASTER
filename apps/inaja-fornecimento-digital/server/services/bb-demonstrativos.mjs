import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { UPLOADS_DIR } from "../db.mjs";

const API = "https://demonstrativos.api.daf.bb.com.br/v1/demonstrativo/daf";
const OUTPUT_DIR = path.join(UPLOADS_DIR, "demonstrativos-bb");
const headers = { "Content-Type": "application/json", Origin: "https://demonstrativos.apps.bb.com.br", Referer: "https://demonstrativos.apps.bb.com.br/" };

function normalizar(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim(); }
function formatarData(data) { const [ano, mes, dia] = String(data).split("-"); if (!ano || !mes || !dia) throw new Error("Informe as datas no formato correto."); return `${dia}.${mes}.${ano}`; }
function validarPeriodo(inicio, fim) { const a = new Date(`${inicio}T00:00:00`); const b = new Date(`${fim}T00:00:00`); if (Number.isNaN(a.valueOf()) || Number.isNaN(b.valueOf()) || b < a) throw new Error("Informe um período válido."); if ((b - a) / 86400000 > 31) throw new Error("O portal do Banco do Brasil aceita consultas de, no máximo, 31 dias."); }
async function post(endpoint, body) {
  // O curl do Windows usa o repositório de certificados do próprio sistema,
  // necessário em instalações onde o Node não reconhece a cadeia corporativa.
  const args = ["-sS", "--fail-with-body", "--max-time", "30", "-X", "POST", `${API}${endpoint}`, "-H", "Content-Type: application/json", "-H", "Origin: https://demonstrativos.apps.bb.com.br", "-H", "Referer: https://demonstrativos.apps.bb.com.br/", "--data", JSON.stringify(body)];
  const output = await new Promise((resolve, reject) => execFile("curl.exe", args, { windowsHide: true, timeout: 35000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => error ? reject(new Error(stderr || error.message)) : resolve(stdout)));
  const json = JSON.parse(String(output || "{}"));
  if (json?.errors?.length) throw new Error(json.errors[0].message || "Não foi possível consultar os demonstrativos do Banco do Brasil.");
  return json;
}
function resolverBeneficiario(lista, solicitado) { const [nome, uf] = normalizar(solicitado).split(/\s*-\s*/); return lista.find((item) => normalizar(item.nomeBeneficiarioSaida) === nome && (!uf || normalizar(item.siglaUnidadeFederacaoSaida) === uf)) || lista.find((item) => normalizar(item.siglaUnidadeFederacaoSaida) === "PR") || lista[0]; }
function linhasDoDemonstrativo(ocorrencias) {
  return (ocorrencias || []).flatMap(({ nomeBeneficio }) => {
    const bruto = String(nomeBeneficio || "").trimEnd();
    const texto = bruto.trim();
    if (!texto || /^DATA\s+PARCELA\s+VALOR\s+DISTRIBUIDO$/i.test(texto) || /^[A-ZÀ-Ú\s]+-\s*PR$/i.test(texto)) return [];
    const possuiValor = /(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}[CD]$/i.test(texto);
    if ((/^[A-Z0-9]{2,8}\s*-\s*.+$/i.test(texto) || /^TOTAL(?:\s|$)/i.test(texto)) && !possuiValor) return [{ tipo: "grupo", titulo: texto.replace(/\s+/g, " ") }];
    const partes = bruto.split(/\s{4,}/).map((parte) => parte.trim());
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(partes[0])) return [{ tipo: "linha", data: partes[0], parcela: partes[1] || "", valor: partes.slice(2).join(" ") || "" }];
    const parcelaComValor = texto.match(/^(.*?)\s{2,}(\d{1,3}(?:\.\d{3})*|\d+),\d{2}[CD]$/i);
    return [{ tipo: "linha", data: "", parcela: parcelaComValor?.[1]?.trim() || partes[0] || "", valor: parcelaComValor?.[2] || partes.slice(1).join(" ") || "" }];
  });
}
function csvCampo(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function nomeSeguro(value) { return normalizar(value).toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function valorNumerico(valor) {
  const texto = String(valor || "").trim();
  const encontrado = texto.match(/(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})([CD])$/i);
  if (!encontrado) return null;
  const numero = Number(`${encontrado[1].replaceAll(".", "")}.${encontrado[2]}`);
  return encontrado[3].toUpperCase() === "D" ? -numero : numero;
}
const tabelaCrc32 = (() => { const tabela = new Uint32Array(256); for (let i = 0; i < 256; i++) { let codigo = i; for (let bit = 0; bit < 8; bit++) codigo = codigo & 1 ? 0xEDB88320 ^ (codigo >>> 1) : codigo >>> 1; tabela[i] = codigo >>> 0; } return tabela; })();
function crc32(conteudo) { let codigo = 0xFFFFFFFF; for (const byte of conteudo) codigo = tabelaCrc32[(codigo ^ byte) & 0xFF] ^ (codigo >>> 8); return (codigo ^ 0xFFFFFFFF) >>> 0; }
function arquivoZip(arquivos) {
  let deslocamento = 0; const locais = []; const centrais = [];
  for (const { nome, conteudo } of arquivos) {
    const nomeBuffer = Buffer.from(nome, "utf8"); const original = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo, "utf8"); const compactado = deflateRawSync(original, { level: 9 }); const crc = crc32(original);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034B50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(compactado.length, 18); local.writeUInt32LE(original.length, 22); local.writeUInt16LE(nomeBuffer.length, 26);
    locais.push(local, nomeBuffer, compactado);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014B50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt32LE(crc, 16); central.writeUInt32LE(compactado.length, 20); central.writeUInt32LE(original.length, 24); central.writeUInt16LE(nomeBuffer.length, 28); central.writeUInt32LE(deslocamento, 42);
    centrais.push(central, nomeBuffer); deslocamento += local.length + nomeBuffer.length + compactado.length;
  }
  const diretorio = Buffer.concat(centrais); const fim = Buffer.alloc(22); fim.writeUInt32LE(0x06054B50, 0); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10); fim.writeUInt32LE(diretorio.length, 12); fim.writeUInt32LE(deslocamento, 16);
  return Buffer.concat([...locais, diretorio, fim]);
}
function escaparXml(valor) { return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function celulaExcel(referencia, valor, estilo = 0) { if (typeof valor === "number") return `<c r="${referencia}" s="${estilo}"><v>${valor}</v></c>`; return `<c r="${referencia}" s="${estilo}" t="inlineStr"><is><t>${escaparXml(valor)}</t></is></c>`; }
async function criarExcel({ beneficiario, dataInicio, dataFim, linhas }) {
  const linhasXml = [
    `<row r="1" ht="28" customHeight="1">${celulaExcel("A1", "DEMONSTRATIVO DA DISTRIBUIÇÃO DA ARRECADAÇÃO", 1)}</row>`,
    `<row r="2">${celulaExcel("A2", `BENEFICIÁRIO: ${beneficiario}`, 2)}</row>`,
    `<row r="3">${celulaExcel("A3", `PERÍODO: ${formatarData(dataInicio)} A ${formatarData(dataFim)}`, 2)}</row>`,
    `<row r="5">${celulaExcel("A5", "DATA", 3)}${celulaExcel("B5", "PARCELA / NATUREZA", 3)}${celulaExcel("C5", "VALOR DISTRIBUÍDO", 3)}</row>`,
    ...linhas.map((linha, indice) => { const numero = indice + 6; if (linha.tipo === "grupo") return `<row r="${numero}">${celulaExcel(`A${numero}`, linha.titulo, 4)}${celulaExcel(`B${numero}`, "", 4)}${celulaExcel(`C${numero}`, "", 4)}</row>`; const valor = valorNumerico(linha.valor); return `<row r="${numero}">${celulaExcel(`A${numero}`, linha.data || "")}${celulaExcel(`B${numero}`, linha.parcela || "")}${celulaExcel(`C${numero}`, valor ?? linha.valor ?? "", typeof valor === "number" ? 5 : 0)}</row>`; }),
  ].join("");
  const ultimaLinha = linhas.length + 5;
  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="R$ #,##0.00;[Red]-R$ #,##0.00"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FF064E3B"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF064E3B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFFFFFFF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs></styleSheet>`;
  const planilha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="15" customWidth="1"/><col min="2" max="2" width="46" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/></cols><sheetData>${linhasXml}</sheetData><mergeCells count="3"><mergeCell ref="A1:C1"/><mergeCell ref="A2:C2"/><mergeCell ref="A3:C3"/></mergeCells><autoFilter ref="A5:C${ultimaLinha}"/></worksheet>`;
  return arquivoZip([{ nome: "[Content_Types].xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` }, { nome: "_rels/.rels", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` }, { nome: "xl/workbook.xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Demonstrativo DAF" sheetId="1" r:id="rId1"/></sheets></workbook>` }, { nome: "xl/_rels/workbook.xml.rels", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` }, { nome: "xl/worksheets/sheet1.xml", conteudo: planilha }, { nome: "xl/styles.xml", conteudo: estilos }]);
}
async function criarZip(destino, arquivos) {
  writeFileSync(destino, arquivoZip(arquivos.map((arquivo) => ({ nome: path.basename(arquivo), conteudo: readFileSync(arquivo) }))));
}
async function criarPdf({ beneficiario, dataInicio, dataFim, linhas }) {
  const { PDFDocument, StandardFonts, rgb } = await import("@cantoo/pdf-lib");
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const largura = 841.89; const altura = 595.28; const margem = 34; const larguraUtil = largura - margem * 2;
  const verde = rgb(0.025, 0.306, 0.231); const verdeSuave = rgb(0.925, 0.965, 0.95); const dourado = rgb(0.79, 0.66, 0.30);
  const grafite = rgb(0.12, 0.16, 0.20); const cinza = rgb(0.38, 0.42, 0.47); const linhaCor = rgb(0.84, 0.87, 0.89); const branco = rgb(1, 1, 1);
  const brasaoPath = path.resolve(UPLOADS_DIR, "..", "..", "public", "brasao.png");
  const brasao = existsSync(brasaoPath) ? await pdf.embedPng(readFileSync(brasaoPath)) : null;
  const formatarMoeda = (valor) => `R$ ${Math.abs(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const valores = linhas.filter((linha) => linha.tipo === "linha").map((linha) => valorNumerico(linha.valor)).filter((valor) => typeof valor === "number");
  const creditos = valores.filter((valor) => valor >= 0).reduce((total, valor) => total + valor, 0);
  const debitos = Math.abs(valores.filter((valor) => valor < 0).reduce((total, valor) => total + valor, 0));
  const saldo = creditos - debitos;
  const limitar = (texto, maximo, tamanho = 8, negrito = false) => {
    const usada = negrito ? fonteNegrito : fonte; let resultado = String(texto || "");
    while (resultado.length && usada.widthOfTextAtSize(resultado, tamanho) > maximo) resultado = resultado.slice(0, -1);
    return resultado === String(texto || "") ? resultado : `${resultado.slice(0, -3)}...`;
  };
  const desenharDireita = (texto, direita, baseY, tamanho = 8, usada = fonte, cor = grafite) => pagina.drawText(String(texto || ""), { x: direita - usada.widthOfTextAtSize(String(texto || ""), tamanho), y: baseY, size: tamanho, font: usada, color: cor });
  const desenharCentro = (texto, centro, baseY, tamanho = 8, usada = fonte, cor = grafite) => pagina.drawText(texto, { x: centro - usada.widthOfTextAtSize(texto, tamanho) / 2, y: baseY, size: tamanho, font: usada, color: cor });
  const desenharTopo = () => {
    const topo = altura - margem;
    if (brasao) pagina.drawImage(brasao, { x: margem + 2, y: topo - 46, width: 36, height: 44 });
    pagina.drawText("PREFEITURA MUNICIPAL DE INAJÁ", { x: margem + 50, y: topo - 15, size: 12.5, font: fonteNegrito, color: verde });
    pagina.drawText("ESTADO DO PARANÁ", { x: margem + 50, y: topo - 29, size: 8, font: fonteNegrito, color: cinza });
    pagina.drawText("Av. Antônio Veiga Martins, 80 - CEP 87670-000 - Inajá/PR", { x: margem + 50, y: topo - 42, size: 7.4, font: fonte, color: cinza });
    desenharDireita("DEMONSTRATIVO DAF", largura - margem, topo - 15, 11, fonteNegrito, verde);
    desenharDireita(`BENEFICIÁRIO: ${beneficiario}`, largura - margem, topo - 29, 7.8, fonteNegrito, grafite);
    desenharDireita(`PERÍODO: ${formatarData(dataInicio)} A ${formatarData(dataFim)}`, largura - margem, topo - 42, 7.8, fonte, cinza);
    pagina.drawLine({ start: { x: margem, y: topo - 54 }, end: { x: largura - margem, y: topo - 54 }, thickness: 1.6, color: dourado });
  };
  const desenharResumo = () => {
    const baseY = altura - margem - 94; const espaco = 8; const larguraCard = (larguraUtil - espaco * 3) / 4;
    const cards = [["LANÇAMENTOS", String(linhas.filter((linha) => linha.tipo === "linha").length)], ["CRÉDITOS", formatarMoeda(creditos)], ["DEDUÇÕES", formatarMoeda(debitos)], ["SALDO LÍQUIDO", `${saldo < 0 ? "- " : ""}${formatarMoeda(saldo)}`]];
    cards.forEach(([rotulo, valor], indice) => { const x = margem + indice * (larguraCard + espaco); pagina.drawRectangle({ x, y: baseY, width: larguraCard, height: 31, color: indice === 3 ? verdeSuave : rgb(0.96, 0.97, 0.98), borderColor: indice === 3 ? verde : linhaCor, borderWidth: 0.6 }); pagina.drawText(rotulo, { x: x + 9, y: baseY + 19, size: 6.5, font: fonteNegrito, color: cinza }); pagina.drawText(limitar(valor, larguraCard - 18, 9.5, true), { x: x + 9, y: baseY + 7, size: 9.5, font: fonteNegrito, color: indice === 3 ? verde : grafite }); });
  };
  const desenharCabecalhoTabela = (topo) => {
    pagina.drawRectangle({ x: margem, y: topo - 21, width: larguraUtil, height: 21, color: verde });
    desenharCentro("DATA", margem + 49, topo - 14, 7.8, fonteNegrito, branco);
    pagina.drawText("PARCELA / NATUREZA", { x: margem + 108, y: topo - 14, size: 7.8, font: fonteNegrito, color: branco });
    desenharDireita("VALOR DISTRIBUÍDO", largura - margem - 10, topo - 14, 7.8, fonteNegrito, branco);
    y = topo - 21;
  };
  let pagina; let y; let indiceLinha = 0;
  const novaPagina = (primeira = false) => { pagina = pdf.addPage([largura, altura]); desenharTopo(); if (primeira) desenharResumo(); desenharCabecalhoTabela(primeira ? altura - margem - 108 : altura - margem - 68); };
  novaPagina(true);
  for (const linha of linhas) {
    const alturaLinha = linha.tipo === "grupo" ? 17 : 15;
    if (y - alturaLinha < 39) novaPagina(false);
    const baseY = y - alturaLinha;
    if (linha.tipo === "grupo") {
      pagina.drawRectangle({ x: margem, y: baseY, width: larguraUtil, height: alturaLinha, color: verdeSuave });
      pagina.drawRectangle({ x: margem, y: baseY, width: 3, height: alturaLinha, color: dourado });
      pagina.drawText(limitar(linha.titulo, larguraUtil - 22, 7.5, true), { x: margem + 10, y: baseY + 5, size: 7.5, font: fonteNegrito, color: verde });
    } else {
      if (indiceLinha % 2) pagina.drawRectangle({ x: margem, y: baseY, width: larguraUtil, height: alturaLinha, color: rgb(0.985, 0.988, 0.99) });
      pagina.drawText(limitar(linha.data, 84, 7.4), { x: margem + 9, y: baseY + 4.5, size: 7.4, font: fonte, color: grafite });
      pagina.drawText(limitar(linha.parcela, 470, 7.4), { x: margem + 108, y: baseY + 4.5, size: 7.4, font: fonte, color: grafite });
      desenharDireita(limitar(linha.valor, 142, 7.4, true), largura - margem - 10, baseY + 4.5, 7.4, fonteNegrito, String(linha.valor || "").endsWith("D") ? rgb(0.66, 0.13, 0.13) : grafite);
      indiceLinha++;
    }
    pagina.drawLine({ start: { x: margem, y: baseY }, end: { x: largura - margem, y: baseY }, thickness: 0.35, color: linhaCor });
    y = baseY;
  }
  const paginas = pdf.getPages();
  paginas.forEach((item, indice) => {
    item.drawLine({ start: { x: margem, y: 29 }, end: { x: largura - margem, y: 29 }, thickness: 0.5, color: linhaCor });
    item.drawText("Fonte: Banco do Brasil - Demonstrativos da Arrecadação Federal (DAF)", { x: margem, y: 17, size: 6.8, font: fonte, color: cinza });
    const paginaTexto = `PÁGINA ${indice + 1} DE ${paginas.length}`;
    item.drawText(paginaTexto, { x: largura - margem - fonteNegrito.widthOfTextAtSize(paginaTexto, 6.8), y: 17, size: 6.8, font: fonteNegrito, color: verde });
  });
  return Buffer.from(await pdf.save());
}
async function criarWord({ beneficiario, dataInicio, dataFim, linhas }) {
  const { AlignmentType, BorderStyle, Document, Header, ImageRun, Packer, PageOrientation, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } = await import("docx");
  const fonte = "Arial"; const verde = "064E3B"; const dourado = "C9A84C"; const cinza = "F2F4F7";
  // A4 paisagem: 29,7 cm (16.838 DXA); com margens de 1,27 cm restam 15.398 DXA úteis.
  const larguraUtil = 15398;
  const texto = (value, options = {}) => new TextRun({ text: String(value || ""), font: fonte, size: options.size || 18, bold: options.bold, color: options.color });
  const paragrafo = (value, options = {}) => new Paragraph({ children: [texto(value, options)], alignment: options.alignment || AlignmentType.LEFT, spacing: { after: options.after ?? 80, before: options.before ?? 0 }, keepNext: options.keepNext });
  const bordas = { top: { style: BorderStyle.SINGLE, size: 4, color: "C8CDD3" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "C8CDD3" }, left: { style: BorderStyle.SINGLE, size: 4, color: "C8CDD3" }, right: { style: BorderStyle.SINGLE, size: 4, color: "C8CDD3" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E4E7EB" }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "E4E7EB" } };
  const celula = (value, width, options = {}) => new TableCell({ width: { size: width, type: WidthType.DXA }, columnSpan: options.columnSpan, shading: options.fill ? { fill: options.fill } : undefined, verticalAlign: "center", margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: [texto(value, { size: options.size || 16, bold: options.bold, color: options.color })], alignment: options.alignment || AlignmentType.LEFT, spacing: { after: 0 } })] });
  const brasaoPath = path.resolve(UPLOADS_DIR, "..", "..", "public", "brasao.png");
  const brasao = existsSync(brasaoPath) ? readFileSync(brasaoPath) : null;
  const cabecalho = new Header({ children: [new Table({
    width: { size: larguraUtil, type: WidthType.DXA }, columnWidths: [1800, 13598],
    layout: TableLayoutType.FIXED,
    borders: { bottom: { style: BorderStyle.SINGLE, size: 10, color: dourado } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: {}, children: [new Paragraph({ children: brasao ? [new ImageRun({ data: brasao, transformation: { width: 55, height: 55 }, type: "png" })] : [] })] }),
      new TableCell({ width: { size: 13598, type: WidthType.DXA }, borders: {}, children: [
        new Paragraph({ children: [texto("PREFEITURA MUNICIPAL DE INAJÁ", { size: 24, bold: true, color: verde })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
        new Paragraph({ children: [texto("ESTADO DO PARANÁ", { size: 14, bold: true, color: "4B5563" })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
        new Paragraph({ children: [texto("Av. Antônio Veiga Martins, 80 - CEP 87670-000 - Inajá/PR", { size: 13, color: "4B5563" })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
      ] }),
    ] })],
  })] });
  const larguraColunas = [2200, 8900, 4298];
  const tabela = new Table({ width: { size: larguraUtil, type: WidthType.DXA }, columnWidths: larguraColunas, layout: TableLayoutType.FIXED, borders: bordas, rows: [new TableRow({ tableHeader: true, children: [celula("DATA", larguraColunas[0], { fill: verde, bold: true, color: "FFFFFF", alignment: AlignmentType.CENTER }), celula("PARCELA / NATUREZA", larguraColunas[1], { fill: verde, bold: true, color: "FFFFFF" }), celula("VALOR DISTRIBUÍDO", larguraColunas[2], { fill: verde, bold: true, color: "FFFFFF", alignment: AlignmentType.RIGHT })] }), ...linhas.map((linha) => linha.tipo === "grupo" ? new TableRow({ children: [celula(linha.titulo, larguraUtil, { columnSpan: 3, fill: cinza, bold: true, size: 17 })] }) : new TableRow({ children: [celula(linha.data, larguraColunas[0]), celula(linha.parcela, larguraColunas[1]), celula(linha.valor, larguraColunas[2], { alignment: AlignmentType.RIGHT })] }))] });
  // A biblioteca inverte as dimensões ao usar LANDSCAPE. Informe A4 em retrato aqui para o OOXML final ficar 29,7 × 21 cm.
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1360, right: 720, bottom: 720, left: 720 }, size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE } } }, headers: { default: cabecalho }, children: [paragrafo("DEMONSTRATIVO DA DISTRIBUIÇÃO DA ARRECADAÇÃO", { size: 25, bold: true, color: verde, alignment: AlignmentType.CENTER, after: 80, before: 160, keepNext: true }), paragrafo(`BENEFICIÁRIO: ${beneficiario}`, { size: 17, bold: true, alignment: AlignmentType.CENTER, after: 40, keepNext: true }), paragrafo(`PERÍODO: ${formatarData(dataInicio)} A ${formatarData(dataFim)}`, { size: 17, color: "4B5563", alignment: AlignmentType.CENTER, after: 240, keepNext: true }), tabela, paragrafo("Fonte: Banco do Brasil - Demonstrativos da Arrecadação Federal (DAF).", { size: 13, color: "6B7280", after: 0, before: 100 })] }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function baixarDemonstrativosBb({ beneficiario, dataInicio, dataFim }) {
  validarPeriodo(dataInicio, dataFim);
  const solicitado = normalizar(beneficiario || "INAJA - PR");
  const termoBusca = solicitado.split(/\s*-\s*/)[0].split(/\s+/)[0];
  const encontrados = await post("/beneficiario", { nomeBeneficiarioEntrada: termoBusca });
  const selecionado = resolverBeneficiario(encontrados.listaBeneficiario || [], solicitado);
  if (!selecionado) throw new Error("Nenhum beneficiário foi encontrado. Informe ao menos parte do nome.");
  const demonstrativo = await post("/consulta", { codigoBeneficiario: Number(selecionado.codigoBeneficiarioSaida), codigoFundo: 0, dataInicio: formatarData(dataInicio), dataFim: formatarData(dataFim) });
  const linhas = linhasDoDemonstrativo(demonstrativo.quantidadeOcorrencia);
  if (!linhas.length) throw new Error("O Banco do Brasil não retornou lançamentos para o período informado.");
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const base = `demonstrativo-daf-${nomeSeguro(`${selecionado.nomeBeneficiarioSaida}-${selecionado.siglaUnidadeFederacaoSaida}`)}-${dataInicio}-a-${dataFim}`;
  const csv = `\uFEFFDATA;PARCELA;VALOR DISTRIBUÍDO\n${linhas.map((linha) => (linha.tipo === "grupo" ? [linha.titulo, "", ""] : [linha.data, linha.parcela, linha.valor]).map(csvCampo).join(";")).join("\n")}\n`;
  const txt = [`DEMONSTRATIVO DAF - ${selecionado.nomeBeneficiarioSaida} - ${selecionado.siglaUnidadeFederacaoSaida}`, `PERÍODO: ${formatarData(dataInicio)} A ${formatarData(dataFim)}`, "", ...linhas.map((linha) => linha.tipo === "grupo" ? linha.titulo : [linha.data, linha.parcela, linha.valor].filter(Boolean).join(" | "))].join("\n");
  const identificacao = `${selecionado.nomeBeneficiarioSaida} - ${selecionado.siglaUnidadeFederacaoSaida}`;
  const pdf = await criarPdf({ beneficiario: identificacao, dataInicio, dataFim, linhas });
  const word = await criarWord({ beneficiario: identificacao, dataInicio, dataFim, linhas });
  const excel = await criarExcel({ beneficiario: identificacao, dataInicio, dataFim, linhas });
  const nomes = [`${base}.pdf`, `${base}.docx`, `${base}.xlsx`, `${base}.csv`, `${base}.txt`];
  writeFileSync(path.join(OUTPUT_DIR, `${base}.csv`), csv, "utf8"); writeFileSync(path.join(OUTPUT_DIR, `${base}.txt`), txt, "utf8"); writeFileSync(path.join(OUTPUT_DIR, `${base}.pdf`), pdf); writeFileSync(path.join(OUTPUT_DIR, `${base}.docx`), word); writeFileSync(path.join(OUTPUT_DIR, `${base}.xlsx`), excel);
  const nomeZip = `${base}-arquivos-completos.zip`;
  await criarZip(path.join(OUTPUT_DIR, nomeZip), nomes.map((nome) => path.join(OUTPUT_DIR, nome)));
  return { beneficiario: identificacao, periodo: { inicio: dataInicio, fim: dataFim }, registros: linhas.length, arquivos: [...nomes, nomeZip].map((nome) => ({ nome, path: `demonstrativos-bb/${nome}`, tipo: path.extname(nome).slice(1).toUpperCase() })) };
}

export function listarDemonstrativosBb() { if (!existsSync(OUTPUT_DIR)) return []; return readdirSync(OUTPUT_DIR).filter((nome) => /\.(csv|txt|pdf|docx|xlsx|zip)$/i.test(nome)).map((nome) => { const info = statSync(path.join(OUTPUT_DIR, nome)); return { nome, path: `demonstrativos-bb/${nome}`, tipo: path.extname(nome).slice(1).toUpperCase(), tamanho: info.size, criadoEm: info.mtime.toISOString() }; }).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)); }

export function removerDemonstrativosBb(paths) {
  const arquivos = Array.isArray(paths) ? paths : [];
  let removidos = 0;
  for (const arquivo of arquivos) {
    const relativo = String(arquivo || "").replace(/\\/g, "/");
    if (!relativo.startsWith("demonstrativos-bb/") || relativo.includes("..")) continue;
    const destino = path.join(UPLOADS_DIR, relativo);
    if (destino.startsWith(OUTPUT_DIR) && existsSync(destino)) { rmSync(destino, { force: true }); removidos++; }
  }
  return { removidos };
}
