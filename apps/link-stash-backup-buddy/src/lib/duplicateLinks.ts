import type { Link } from '@/types/link';

const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'referrer',
]);

export function normalizeLinkUrl(rawUrl: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.hostname}${url.pathname}${url.search}`.toLowerCase();
  } catch {
    return rawUrl.trim().replace(/\/+$/, '').toLowerCase();
  }
}

export function findDuplicateLinkGroups(links: Link[]) {
  const groups = new Map<string, Link[]>();
  for (const link of links.filter((item) => !item.deleted_at)) {
    const key = normalizeLinkUrl(link.url);
    groups.set(key, [...(groups.get(key) ?? []), link]);
  }
  return Array.from(groups.values())
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length);
}
