import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  isRealPdf,
  partitionFiles,
  MAX_FILE_BYTES,
  MAX_FILES,
} from './fileValidation';

/* ---------------- helpers ---------------- */
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

const makePdf = (name = 'doc.pdf', extraBytes = 100): File => {
  const body = new Uint8Array(PDF_HEADER.length + extraBytes);
  body.set(PDF_HEADER, 0);
  return new File([body], name, { type: 'application/pdf' });
};
const makeFakePdf = (name = 'fake.pdf'): File =>
  new File([new Uint8Array([0, 1, 2, 3, 4, 5])], name, { type: 'application/pdf' });
const makeTxt = (): File =>
  new File(['hello'], 'note.txt', { type: 'text/plain' });
const makeHuge = (): File => {
  // Simulate a >MAX_FILE_BYTES file without allocating memory:
  const f = makePdf('huge.pdf', 10);
  Object.defineProperty(f, 'size', { value: MAX_FILE_BYTES + 1 });
  return f;
};
const makeEmpty = (): File =>
  new File([], 'empty.pdf', { type: 'application/pdf' });

/* ============================================================
 * sanitizeFileName
 * ==========================================================*/
describe('sanitizeFileName', () => {
  it('mantém nome válido e adiciona .pdf se ausente', () => {
    expect(sanitizeFileName('contrato-2025')).toBe('contrato-2025.pdf');
  });

  it('preserva extensão .pdf existente (case-insensitive)', () => {
    expect(sanitizeFileName('NOTA.PDF')).toBe('NOTA.PDF');
  });

  it('remove path traversal (../../etc/passwd)', () => {
    const out = sanitizeFileName('../../etc/passwd');
    expect(out).not.toContain('..');
    expect(out).not.toContain('/');
    expect(out.endsWith('.pdf')).toBe(true);
  });

  it('remove separadores de caminho backslash e forward-slash', () => {
    expect(sanitizeFileName('a/b\\c.pdf')).toBe('a_b_c.pdf');
  });

  it('remove caracteres de controle e reservados do Windows', () => {
    expect(sanitizeFileName('bad<>:"|?*name\x00\x01.pdf')).toBe('badname.pdf');
  });

  it('remove quebras de linha, tabs e null bytes', () => {
    expect(sanitizeFileName('a\r\nb\tc\0d')).toBe('abcd.pdf');
  });

  it('descarta pontos iniciais para evitar arquivos ocultos', () => {
    expect(sanitizeFileName('...hidden.pdf')).toBe('hidden.pdf');
  });

  it('trunca em 180 caracteres', () => {
    const long = 'a'.repeat(500);
    const out = sanitizeFileName(long);
    expect(out.length).toBeLessThanOrEqual(184); // 180 + '.pdf'
  });

  it('devolve fallback quando entrada vazia', () => {
    expect(sanitizeFileName('')).toBe('documento.pdf');
  });

  it('devolve fallback quando string apenas com caracteres inválidos', () => {
    expect(sanitizeFileName('///\\\\')).toMatch(/\.pdf$/);
  });

  it('lida com input null/undefined sem quebrar', () => {
    // @ts-expect-error simulating runtime bad input
    expect(sanitizeFileName(undefined)).toBe('documento.pdf');
    // @ts-expect-error simulating runtime bad input
    expect(sanitizeFileName(null)).toBe('documento.pdf');
  });
});

/* ============================================================
 * isRealPdf
 * ==========================================================*/
describe('isRealPdf', () => {
  it('retorna true para arquivo com assinatura %PDF-', async () => {
    expect(await isRealPdf(makePdf())).toBe(true);
  });

  it('retorna false para arquivo com bytes arbitrários', async () => {
    expect(await isRealPdf(makeFakePdf())).toBe(false);
  });

  it('retorna false para arquivo vazio', async () => {
    expect(await isRealPdf(makeEmpty())).toBe(false);
  });

  it('retorna false para texto puro mesmo com MIME forjado', async () => {
    const forged = new File(['hello world'], 'x.pdf', { type: 'application/pdf' });
    expect(await isRealPdf(forged)).toBe(false);
  });
});

/* ============================================================
 * partitionFiles
 * ==========================================================*/
describe('partitionFiles', () => {
  it('estado vazio: lista vazia devolve estruturas vazias', async () => {
    const r = await partitionFiles([]);
    expect(r.valid).toEqual([]);
    expect(r.rejected).toEqual([]);
  });

  it('aceita PDF válido', async () => {
    const r = await partitionFiles([makePdf()]);
    expect(r.valid).toHaveLength(1);
    expect(r.rejected).toHaveLength(0);
  });

  it('rejeita por MIME incorreto', async () => {
    const r = await partitionFiles([makeTxt()]);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0].reason).toBe('type');
  });

  it('rejeita por tamanho zero', async () => {
    const r = await partitionFiles([makeEmpty()]);
    expect(r.rejected[0].reason).toBe('size');
  });

  it('rejeita arquivo acima do limite de tamanho', async () => {
    const r = await partitionFiles([makeHuge()]);
    expect(r.rejected[0].reason).toBe('size');
  });

  it('rejeita por assinatura ausente mesmo com MIME correto', async () => {
    const r = await partitionFiles([makeFakePdf()]);
    expect(r.rejected[0].reason).toBe('signature');
  });

  it('separa válidos e inválidos em batch misto', async () => {
    const files = [makePdf('ok.pdf'), makeTxt(), makeFakePdf(), makePdf('ok2.pdf')];
    const r = await partitionFiles(files);
    expect(r.valid.map(f => f.name).sort()).toEqual(['ok.pdf', 'ok2.pdf']);
    expect(r.rejected).toHaveLength(2);
  });

  it('respeita cap MAX_FILES', async () => {
    const files = Array.from({ length: MAX_FILES + 5 }, (_, i) => makePdf(`f${i}.pdf`));
    const r = await partitionFiles(files);
    expect(r.valid.length + r.rejected.length).toBe(MAX_FILES);
  });
});
