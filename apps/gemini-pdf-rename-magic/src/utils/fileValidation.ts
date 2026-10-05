/**
 * File-name sanitization and PDF validation helpers.
 * Extracted from PDFRenamer so they are unit-testable in isolation.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_FILES = 50;

/** Sanitiza um nome sugerido pela IA para uso seguro em `a.download`. */
export function sanitizeFileName(name: string): string {
  const base = (name || 'documento.pdf')
    .replace(/[\r\n\t\0]/g, '')
    .replace(/[/\\]/g, '_')
    .replace(/\.{2,}/g, '.')
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 180);
  const safe = base || 'documento';
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

/** Verifica assinatura mágica `%PDF-` nos primeiros 5 bytes. */
export async function isRealPdf(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return (
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 &&
    head[3] === 0x46 && head[4] === 0x2d
  );
}

export interface PartitionResult {
  valid: File[];
  rejected: { file: File; reason: 'type' | 'size' | 'signature' }[];
}

/** Aplica validação MIME + tamanho + assinatura, respeitando o cap MAX_FILES. */
export async function partitionFiles(files: File[]): Promise<PartitionResult> {
  const candidates = files.slice(0, MAX_FILES);
  const valid: File[] = [];
  const rejected: PartitionResult['rejected'] = [];
  for (const f of candidates) {
    if (f.type !== 'application/pdf') { rejected.push({ file: f, reason: 'type' }); continue; }
    if (f.size === 0 || f.size > MAX_FILE_BYTES) { rejected.push({ file: f, reason: 'size' }); continue; }
    if (!(await isRealPdf(f))) { rejected.push({ file: f, reason: 'signature' }); continue; }
    valid.push(f);
  }
  return { valid, rejected };
}
