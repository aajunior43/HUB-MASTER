/**
 * Dispara o download de um Blob no navegador.
 * Centraliza a criação/limpeza do object URL e do <a> temporário.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Atalho para baixar conteúdo de texto plano. */
export const downloadText = (
  content: string,
  filename: string,
  mime = 'text/plain;charset=utf-8'
): void => {
  downloadBlob(new Blob([content], { type: mime }), filename);
};
