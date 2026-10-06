// Tiny memoized helpers used across the link list to avoid recomputing
// the same URL parsing thousands of times when the user has many links.

const domainCache = new Map<string, string>();

export const getDomainCached = (url: string): string => {
  const cached = domainCache.get(url);
  if (cached !== undefined) return cached;
  let result = url;
  try {
    result = new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', '');
  } catch {
    /* keep original */
  }
  if (domainCache.size > 5000) domainCache.clear(); // bound memory
  domainCache.set(url, result);
  return result;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateCache = new Map<string, string>();
export const formatDateCached = (iso: string): string => {
  const cached = dateCache.get(iso);
  if (cached !== undefined) return cached;
  let result = iso;
  try {
    result = dateFormatter.format(new Date(iso));
  } catch {
    /* keep original */
  }
  if (dateCache.size > 5000) dateCache.clear();
  dateCache.set(iso, result);
  return result;
};
