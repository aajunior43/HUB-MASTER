import { getSession, createLink, createLinksBatch, createNote, findLinkByUrl, searchLinks, domainOf } from './api.js';

// ── Atalhos de teclado ─────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  const session = await getSession();
  if (!session) { notify('Meus Links', 'Faça login pelo popup primeiro.'); return; }
  try {
    if (command === 'save-current-page') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !/^https?:/.test(tab.url)) { notify('Meus Links', 'Página não suportada.'); return; }
      await createLink({ title: tab.title || tab.url, url: tab.url });
      notify('Meus Links', 'Página salva.');
      updateBadge(tab);
    } else if (command === 'save-all-tabs') {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const items = tabs.filter((t) => /^https?:/.test(t.url || '')).map((t) => ({ title: t.title, url: t.url }));
      await createLinksBatch(items);
      notify('Meus Links', `${items.length} abas salvas.`);
    } else if (command === 'quick-note') {
      // Abre o popup do browser na aba de Notas
      await chrome.storage.local.set({ ml_active_tab: 'note' });
      chrome.action.openPopup();
    }
  } catch (e) { notify('Meus Links', `Erro: ${e.message}`); }
});




// ── Menus de contexto ──────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'save-page', title: 'Salvar página em Meus Links', contexts: ['page'] });
  chrome.contextMenus.create({ id: 'save-link', title: 'Salvar link em Meus Links', contexts: ['link'] });
  chrome.contextMenus.create({ id: 'save-selection', title: 'Salvar seleção como nota', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'save-selection-as-desc', title: 'Salvar página com seleção como descrição', contexts: ['selection'] });
  try { chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false }); } catch {}
});

async function notify(title, message) {
  try { await chrome.notifications.create({ type: 'basic', iconUrl: 'icon.png', title, message }); } catch {}
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const session = await getSession();
  if (!session) { notify('Meus Links', 'Faça login pelo popup primeiro.'); return; }
  try {
    if (info.menuItemId === 'save-page') {
      await createLink({ title: tab?.title || info.pageUrl, url: info.pageUrl });
      notify('Meus Links', 'Página salva.');
    } else if (info.menuItemId === 'save-link') {
      await createLink({ title: info.linkUrl, url: info.linkUrl });
      notify('Meus Links', 'Link salvo.');
    } else if (info.menuItemId === 'save-selection') {
      await createNote({
        title: tab?.title?.slice(0, 80) || 'Nota',
        content: `${info.selectionText || ''}\n\nFonte: ${info.pageUrl}`,
      });
      notify('Meus Links', 'Nota criada.');
    } else if (info.menuItemId === 'save-selection-as-desc') {
      await createLink({
        title: tab?.title || info.pageUrl,
        url: info.pageUrl,
        description: (info.selectionText || '').slice(0, 500),
      });
      notify('Meus Links', 'Página salva com descrição.');
    }
    updateBadge(tab);
  } catch (e) { notify('Meus Links', `Erro: ${e.message}`); }
});

// ── Omnibox: `ml <busca>` ──────────────────
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const session = await getSession();
  if (!session || text.trim().length < 2) { suggest([]); return; }
  try {
    const rows = await searchLinks(text.trim());
    suggest(rows.map((r) => ({
      content: r.url,
      description: `<match>${escapeXml(r.title)}</match> — <dim>${escapeXml(domainOf(r.url))}</dim>`,
    })));
  } catch { suggest([]); }
});
chrome.omnibox.onInputEntered.addListener((text) => {
  const url = text.startsWith('http') ? text : `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  chrome.tabs.update({ url });
});
function escapeXml(s) { return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }

// ── Badge de duplicata ─────────────────────
async function updateBadge(tab) {
  try {
    const t = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!t?.url || !/^https?:/.test(t.url)) { chrome.action.setBadgeText({ text: '' }); return; }
    const session = await getSession();
    if (!session) { chrome.action.setBadgeText({ text: '' }); return; }
    const found = await findLinkByUrl(t.url);
    chrome.action.setBadgeBackgroundColor({ color: '#2dd4a8' });
    chrome.action.setBadgeText({ text: found ? '✓' : '' });
  } catch { chrome.action.setBadgeText({ text: '' }); }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  updateBadge(tab);
});
chrome.tabs.onUpdated.addListener((_id, info, tab) => { if (info.status === 'complete') updateBadge(tab); });
chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'refresh-badge') updateBadge(); });
