let pdfLibPromise: Promise<typeof import("@cantoo/pdf-lib")> | null = null;

function carregarPdfLib() {
  pdfLibPromise ??= import("@cantoo/pdf-lib");
  return pdfLibPromise;
}

export function downloadPdfBytes(bytes: Uint8Array, nome: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome.endsWith(".pdf") ? nome : `${nome}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export async function mesclarPdfs(arquivos: ArrayBuffer[]): Promise<Uint8Array> {
  if (arquivos.length < 2) {
    throw new Error("Envie ao menos 2 PDFs");
  }
  const { PDFDocument } = await carregarPdfLib();
  const out = await PDFDocument.create();
  for (const buf of arquivos) {
    const src = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  return out.save();
}

export function parsePaginasInput(input: string): number[] {
  const result: number[] = [];
  for (const p of input.split(",")) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) {
      result.push(parseInt(trimmed, 10));
    } else if (/^\d+-\d+$/.test(trimmed)) {
      const [a, b] = trimmed.split("-").map(Number);
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      for (let i = from; i <= to; i++) result.push(i);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

export async function extrairPaginas(
  arquivo: ArrayBuffer,
  paginas1Based: number[],
): Promise<Uint8Array> {
  if (!paginas1Based.length) {
    throw new Error("Informe as páginas (ex: 1,3,5-8)");
  }
  const { PDFDocument } = await carregarPdfLib();
  const src = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  const total = src.getPageCount();
  const indices: number[] = [];
  for (const n of paginas1Based) {
    if (n < 1 || n > total) {
      throw new Error(`Página ${n} inválida (documento tem ${total} página(s))`);
    }
    indices.push(n - 1);
  }
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  for (const page of pages) out.addPage(page);
  return out.save();
}

export async function protegerPdf(
  arquivo: ArrayBuffer,
  senha: string,
): Promise<Uint8Array> {
  const s = senha.trim();
  if (!s) throw new Error("Informe uma senha");
  const { PDFDocument } = await carregarPdfLib();
  const doc = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  doc.encrypt({
    userPassword: s,
    ownerPassword: s,
  });
  return doc.save();
}

export async function contarPaginas(arquivo: ArrayBuffer): Promise<number> {
  const { PDFDocument } = await carregarPdfLib();
  const doc = await PDFDocument.load(arquivo, { ignoreEncryption: true });
  return doc.getPageCount();
}

export type NivelCompressao = "equilibrada" | "maxima";

export async function compactarPdf(
  arquivo: ArrayBuffer,
  nivel: NivelCompressao = "equilibrada",
): Promise<Uint8Array> {
  const { PDFDocument } = await carregarPdfLib();
  const doc = await PDFDocument.load(arquivo, { ignoreEncryption: true, updateMetadata: false });
  const original = new Uint8Array(arquivo.slice(0));
  const candidatos: Uint8Array[] = [];
  const opcoes = nivel === "maxima"
    ? [
      { useObjectStreams: true, rewrite: true },
      { useObjectStreams: false, rewrite: true },
    ]
    : [
      { useObjectStreams: false, rewrite: true },
      { useObjectStreams: true, rewrite: true },
    ];

  for (const options of opcoes) {
    const copia = await doc.copy();
    candidatos.push(await copia.save(options));
  }

  return candidatos.reduce((menor, atual) => atual.byteLength < menor.byteLength ? atual : menor, original);
}

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ParaBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let offset = 0; offset < binary.length; offset += 0x8000) {
    const fim = Math.min(offset + 0x8000, binary.length);
    for (let i = offset; i < fim; i++) bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function compactarPdfNoServidorLocal(
  arquivo: ArrayBuffer,
  nivel: NivelCompressao = "equilibrada",
): Promise<Uint8Array> {
  const resposta = await fetch("/api/pdf/comprimir", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentBase64: arrayBufferParaBase64(arquivo), nivel }),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !corpo?.data?.contentBase64) {
    throw new Error(corpo?.error?.message || "Não foi possível comprimir o PDF no servidor local.");
  }
  return base64ParaBytes(corpo.data.contentBase64);
}
