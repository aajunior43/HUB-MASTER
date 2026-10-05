import { describe, expect, it } from "vitest";
import { PDFDocument } from "@cantoo/pdf-lib";
import {
  extrairPaginas,
  mesclarPdfs,
  parsePaginasInput,
  protegerPdf,
  compactarPdf,
} from "./pdfUtils";

async function makePdf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([200, 200]);
    page.drawText(`p${i + 1}`, { x: 20, y: 100, size: 12 });
  }
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe("parsePaginasInput", () => {
  it("parseia avulsas e intervalos", () => {
    expect(parsePaginasInput("1,3,5-8")).toEqual([1, 3, 5, 6, 7, 8]);
  });

  it("remove duplicatas e ordena", () => {
    expect(parsePaginasInput("3,1,2,1")).toEqual([1, 2, 3]);
  });

  it("aceita intervalo invertido", () => {
    expect(parsePaginasInput("4-2")).toEqual([2, 3, 4]);
  });
});

describe("pdf ops client-side", () => {
  it("mescla dois PDFs", async () => {
    const a = await makePdf(1);
    const b = await makePdf(2);
    const merged = await mesclarPdfs([a, b]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(3);
  });

  it("extrai páginas selecionadas", async () => {
    const src = await makePdf(5);
    const out = await extrairPaginas(src, [2, 4]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });

  it("rejeita página fora do intervalo", async () => {
    const src = await makePdf(2);
    await expect(extrairPaginas(src, [5])).rejects.toThrow(/inválida/);
  });

  it("protege PDF com senha", async () => {
    const src = await makePdf(1);
    const protectedBytes = await protegerPdf(src, "segredo123");
    expect(protectedBytes.byteLength).toBeGreaterThan(50);
    await expect(
      PDFDocument.load(protectedBytes, { ignoreEncryption: false }),
    ).rejects.toThrow();
  });

  it("compacta PDF mantendo as páginas", async () => {
    const src = await makePdf(3);
    const compactado = await compactarPdf(src, "maxima");
    const doc = await PDFDocument.load(compactado);
    expect(doc.getPageCount()).toBe(3);
    expect(compactado.byteLength).toBeGreaterThan(0);
    expect(compactado.byteLength).toBeLessThanOrEqual(src.byteLength);
  });
});
