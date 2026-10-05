import { useToast } from '@/hooks/use-toast';
import type { Link } from '@/types/link';

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
const dateStamp = () => new Date().toISOString().split('T')[0];

const serializeLink = (link: Link) => ({
  id: link.id,
  title: link.title,
  url: link.url,
  description: link.description ?? null,
  createdAt: link.created_at,
  updatedAt: link.updated_at,
  categoryId: link.category_id ?? null,
  folderId: link.folder_id ?? null,
  tagIds: link.tagIds ?? [],
  isFavorite: link.is_favorite,
  isPinned: link.is_pinned,
  isArchived: link.is_archived,
  deletedAt: link.deleted_at ?? null,
});

/** Exportação de links: JSON completo, JSON de seleção e HTML padrão Netscape. */
export function useLinksBackup(links: Link[], categories: unknown[]) {
  const { toast } = useToast();

  const downloadBackup = () => {
    const payload = {
      format: 'jr-links-backup',
      version: 2,
      exportDate: new Date().toISOString(),
      totalLinks: links.length,
      links: links.map(serializeLink),
      categories,
    };
    download(`links-backup-${dateStamp()}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    toast({ title: 'Backup concluído', description: `${links.length} links exportados.` });
  };

  const downloadBackupHTML = () => {
    const rows = links
      .map((l) => {
        const ts = Math.floor(new Date(l.created_at).getTime() / 1000);
        const desc = l.description ? `\n        <DD>${escapeHtml(l.description)}` : '';
        return `    <DT><A HREF="${escapeHtml(l.url)}" ADD_DATE="${ts}">${escapeHtml(l.title)}</A>${desc}`;
      })
      .join('\n');
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>JR Links Export</TITLE>\n<H1>JR Links</H1>\n<DL><p>\n${rows}\n</DL>`;
    download(`links-${dateStamp()}.html`, new Blob([html], { type: 'text/html' }));
    toast({ title: 'HTML exportado', description: `${links.length} links prontos para importar no browser.` });
  };

  const exportSelection = (ids: string[]) => {
    const sel = links.filter((l) => ids.includes(l.id));
    const payload = {
      format: 'jr-links-backup',
      version: 2,
      exportDate: new Date().toISOString(),
      totalLinks: sel.length,
      links: sel.map(serializeLink),
    };
    download(`selected-links-${dateStamp()}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    toast({ title: `${ids.length} links exportados` });
  };

  return { downloadBackup, downloadBackupHTML, exportSelection };
}
