import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SESSION_KEY = 'ml_session';

export async function getSession() {
  const { [SESSION_KEY]: s } = await chrome.storage.local.get(SESSION_KEY);
  if (!s) return null;
  if (s.expires_at && Date.now() / 1000 > s.expires_at - 60) {
    try { return await refresh(s.refresh_token); } catch { return null; }
  }
  return s;
}
async function saveSession(s) { await chrome.storage.local.set({ [SESSION_KEY]: s }); return s; }

export async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || 'Falha ao entrar');
  return saveSession(data);
}
async function refresh(refresh_token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error('Sessão expirada');
  return saveSession(data);
}
export async function signOut() { await chrome.storage.local.remove(SESSION_KEY); }

async function authHeaders() {
  const s = await getSession();
  if (!s) throw new Error('Não autenticado');
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${s.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function rest(path, init = {}) {
  const h = await authHeaders();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);
  return data;
}

async function fn(name, body) {
  const h = await authHeaders();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST', headers: h, body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

// ── Links ─────────────────────────────────
export const listFolders = () => rest('folders?select=id,name&order=name.asc');

export async function createLink({ title, url, folder_id, is_favorite, is_pinned, description }) {
  const s = await getSession();
  return rest('links', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: s.user.id,
      title, url,
      folder_id: folder_id || null,
      is_favorite: !!is_favorite,
      is_pinned: !!is_pinned,
      description: description || null,
    }),
  }).then((d) => Array.isArray(d) ? d[0] : d);
}

export async function createLinksBatch(items, folder_id) {
  const s = await getSession();
  if (!items.length) return [];
  const payload = items.map((it) => ({
    user_id: s.user.id,
    title: it.title || it.url,
    url: it.url,
    folder_id: folder_id || null,
  }));
  return rest('links', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
}

export async function findLinkByUrl(url) {
  const q = encodeURIComponent(`eq.${url}`);
  const rows = await rest(`links?select=id,title&url=${q}&deleted_at=is.null&limit=1`);
  return rows[0] || null;
}

export async function searchLinks(query) {
  const q = encodeURIComponent(`%${query}%`);
  return rest(`links?select=id,title,url&or=(title.ilike.${q},url.ilike.${q})&deleted_at=is.null&order=updated_at.desc&limit=8`);
}

// ── Notes ─────────────────────────────────
export async function createNote({ title, content }) {
  const s = await getSession();
  return rest('notes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: s.user.id, title: title || 'Sem título', content: content || '' }),
  }).then((d) => Array.isArray(d) ? d[0] : d);
}

// ── Prompts ───────────────────────────────
export const listPrompts = () => rest('ai_prompts?select=id,title,content&order=updated_at.desc&limit=50');

// ── Reminders ─────────────────────────────
export async function createReminder({ name, amount, interval_days, notes }) {
  const s = await getSession();
  return rest('payment_reminders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: s.user.id,
      name,
      amount: amount == null ? null : Number(amount),
      interval_days: interval_days || 30,
      notes: notes || null,
    }),
  }).then((d) => Array.isArray(d) ? d[0] : d);
}

// ── Site credentials (vault edge function) ─
export const listCredentials = () => rest('site_credentials?select=id,name,url,username&order=name.asc');
export const revealCredential = (id) => fn('vault', { action: 'site.reveal', id }).then((d) => d.value);
export const saveCredential = (payload) => fn('vault', { action: 'site.create', ...payload });

// ── Utils ─────────────────────────────────
export function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
