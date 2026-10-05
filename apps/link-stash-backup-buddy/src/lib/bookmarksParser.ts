/**
 * Parses Netscape Bookmark HTML files exported from Chrome, Firefox, Edge, Safari.
 * Returns a flat list of links with optional folder names (from <H3>).
 */
export interface ParsedBookmark {
  title: string;
  url: string;
  createdAt: string;
  folder?: string;
}

export const parseBookmarksHtml = (html: string): ParsedBookmark[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const result: ParsedBookmark[] = [];

  // Walk the DOM. Each <DL> is a folder level. Folder names live in the preceding <H3>.
  const walk = (node: Element, folderPath: string[] = []) => {
    const children = Array.from(node.children);
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      const tag = el.tagName.toUpperCase();

      if (tag === 'DT') {
        const inner = el.firstElementChild;
        if (!inner) continue;
        const innerTag = inner.tagName.toUpperCase();

        if (innerTag === 'A') {
          const href = inner.getAttribute('href');
          const addDate = inner.getAttribute('add_date');
          if (href && /^https?:\/\//i.test(href)) {
            const title = (inner.textContent || href).trim().slice(0, 200);
            const createdAt = addDate
              ? new Date(parseInt(addDate, 10) * 1000).toISOString()
              : new Date().toISOString();
            result.push({ title: title || href, url: href, createdAt, folder: folderPath.join(' / ') || undefined });
          }
        } else if (innerTag === 'H3') {
          // Folder header. Following <DL> is its content.
          const folderName = (inner.textContent || '').trim();
          const next = el.nextElementSibling;
          if (next && next.tagName.toUpperCase() === 'DL') {
            walk(next, folderName ? [...folderPath, folderName] : folderPath);
          }
          // Some browsers nest <DL> inside <DT>
          const nestedDL = el.querySelector(':scope > dl');
          if (nestedDL) walk(nestedDL, folderName ? [...folderPath, folderName] : folderPath);
        }
      } else if (tag === 'DL') {
        walk(el, folderPath);
      }
    }
  };

  // Root: usually a single <DL> at top level
  const rootDL = doc.querySelector('dl');
  if (rootDL) walk(rootDL);

  // Deduplicate by URL
  const seen = new Set<string>();
  return result.filter(b => {
    const key = b.url.replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
