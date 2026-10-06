import {
  getSession, signIn, signOut,
  listFolders, createLink, createLinksBatch, findLinkByUrl,
  createNote, listPrompts, createReminder,
  listCredentials, revealCredential, saveCredential,
  domainOf,
} from './api.js';


const app = document.getElementById('app');
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

let currentTab = null;
let currentSelection = '';

async function loadContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab || null;
  currentSelection = '';
  try {
    if (tab?.id) {
      const [{ result } = {}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || '',
      });
      currentSelection = result || '';
    }
  } catch { /* páginas restritas (chrome://) */ }
}

async function render() {
  app.innerHTML = '';
  const session = await getSession();
  if (!session) return renderLogin();
  await loadContext();
  renderShell(session);
}

// ── Login ─────────────────────────────────
function renderLogin() {
  const view = el(`
    <div>
      <div class="brand">MEUS LINKS</div>
      <div style="margin-top:10px"><label>Email</label><input id="email" type="email" autocomplete="email" /></div>
      <div style="margin-top:8px"><label>Senha</label><input id="pw" type="password" autocomplete="current-password" /></div>
      <div id="msg" style="margin-top:8px"></div>
      <button id="btn" style="margin-top:10px">Entrar</button>
    </div>
  `);
  app.appendChild(view);
  view.querySelector('#btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    view.querySelector('#msg').innerHTML = '';
    try {
      await signIn(view.querySelector('#email').value.trim(), view.querySelector('#pw').value);
      render();
    } catch (err) {
      view.querySelector('#msg').innerHTML = `<div class="msg err">${err.message}</div>`;
      btn.disabled = false;
    }
  });
}

// ── Shell com abas ────────────────────────
const TABS = [
  { id: 'link', label: 'LINK' },
  { id: 'tabs', label: 'ABAS' },
  { id: 'note', label: 'NOTA' },
  { id: 'pass', label: 'SENHA' },
  { id: 'remind', label: 'LEMBRETE' },
  { id: 'prompt', label: 'PROMPT' },
];


async function renderShell(session) {
  const view = el(`
    <div>
      <div class="brand">MEUS LINKS</div>
      <div class="tabs">${TABS.map((t) => `<div class="tab" data-t="${t.id}">${t.label}</div>`).join('')}</div>
      <div id="pane"></div>
      <div class="footer">
        <span>${session.user?.email || ''}</span>
        <button class="link" id="logout">Sair</button>
      </div>
    </div>
  `);
  app.appendChild(view);
  view.querySelector('#logout').addEventListener('click', async () => { await signOut(); render(); });

  const { ml_active_tab = 'link' } = await chrome.storage.local.get('ml_active_tab');
  const setActive = async (id) => {
    view.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.t === id));
    await chrome.storage.local.set({ ml_active_tab: id });
    const pane = view.querySelector('#pane');
    pane.innerHTML = '';
    const renderers = { link: renderLinkPane, tabs: renderTabsPane, note: renderNotePane, pass: renderPassPane, remind: renderRemindPane, prompt: renderPromptPane };
    renderers[id](pane);
  };
  view.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setActive(t.dataset.t)));
  setActive(ml_active_tab);
}

const status = (root, kind, text) => { root.querySelector('#msg').innerHTML = `<div class="msg ${kind}">${text}</div>`; };

// ── LINK ──────────────────────────────────
async function renderLinkPane(root) {
  const title = currentTab?.title || '';
  const url = currentTab?.url || '';
  const pane = el(`
    <div>
      <div><label>Título</label><input id="title" /></div>
      <div style="margin-top:6px"><label>URL</label><input id="url" /></div>
      <div style="margin-top:6px"><label>Pasta</label><select id="folder"><option value="">Sem pasta</option></select></div>
      <div style="margin-top:6px"><label>Descrição (opcional)</label><textarea id="desc"></textarea></div>
      <div class="toggles" style="margin-top:6px">
        <label><input type="checkbox" id="fav" /> Favorito</label>
        <label><input type="checkbox" id="pin" /> Fixado</label>
      </div>
      <div id="msg" style="margin-top:6px"></div>
      <button id="save" style="margin-top:8px">Salvar link</button>
    </div>
  `);
  root.appendChild(pane);
  pane.querySelector('#title').value = title;
  pane.querySelector('#url').value = url;
  if (currentSelection) pane.querySelector('#desc').value = currentSelection.slice(0, 500);

  try {
    const folders = await listFolders();
    const sel = pane.querySelector('#folder');
    for (const f of folders) {
      const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; sel.appendChild(o);
    }
  } catch { /* silent */ }

  try {
    const existing = url && await findLinkByUrl(url);
    if (existing) status(pane, 'warn', `Já salvo: ${existing.title}`);
  } catch { /* silent */ }

  pane.querySelector('#save').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      await createLink({
        title: pane.querySelector('#title').value.trim(),
        url: pane.querySelector('#url').value.trim(),
        folder_id: pane.querySelector('#folder').value,
        is_favorite: pane.querySelector('#fav').checked,
        is_pinned: pane.querySelector('#pin').checked,
        description: pane.querySelector('#desc').value.trim(),
      });
      status(pane, 'ok', 'Salvo!');
      chrome.runtime.sendMessage({ type: 'refresh-badge' });
      setTimeout(() => window.close(), 600);
    } catch (err) { status(pane, 'err', err.message); btn.disabled = false; }
  });
}

// ── ABAS ──────────────────────────────────
async function renderTabsPane(root) {
  const pane = el(`
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <label style="margin:0">Abas abertas na janela</label>
        <div style="display:flex;gap:4px">
          <button class="ghost small" id="all">Todas</button>
          <button class="ghost small" id="none">Nenhuma</button>
        </div>
      </div>
      <div style="margin-top:6px"><label>Pasta</label><select id="folder"><option value="">Sem pasta</option></select></div>
      <div id="list" class="list" style="margin-top:6px;max-height:260px"></div>
      <div id="msg" style="margin-top:6px"></div>
      <div class="row" style="margin-top:8px">
        <button id="save">Salvar selecionadas</button>
        <button class="ghost" id="copy">Copiar URLs</button>
      </div>
    </div>
  `);
  root.appendChild(pane);

  try {
    const folders = await listFolders();
    const sel = pane.querySelector('#folder');
    for (const f of folders) { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; sel.appendChild(o); }
  } catch { /* silent */ }

  const tabs = (await chrome.tabs.query({ currentWindow: true })).filter((t) => /^https?:/.test(t.url || ''));
  const list = pane.querySelector('#list');
  if (!tabs.length) { list.innerHTML = '<div class="empty">Nenhuma aba web aberta.</div>'; return; }
  for (const t of tabs) {
    const row = el(`
      <label class="item" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
        <input type="checkbox" data-id="${t.id}" ${t.active ? '' : 'checked'} style="width:auto;margin-top:2px" />
        <div style="flex:1;min-width:0">
          <div class="name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.title || t.url)}</div>
          <div class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(domainOf(t.url))}</div>
        </div>
      </label>
    `);
    row.dataset.url = t.url;
    row.dataset.title = t.title || t.url;
    list.appendChild(row);
  }

  const selected = () => Array.from(list.querySelectorAll('label')).filter((r) => r.querySelector('input').checked);
  pane.querySelector('#all').addEventListener('click', () => list.querySelectorAll('input').forEach((i) => i.checked = true));
  pane.querySelector('#none').addEventListener('click', () => list.querySelectorAll('input').forEach((i) => i.checked = false));

  pane.querySelector('#copy').addEventListener('click', async () => {
    const urls = selected().map((r) => r.dataset.url).join('\n');
    if (!urls) return status(pane, 'warn', 'Selecione ao menos uma aba.');
    try { await navigator.clipboard.writeText(urls); status(pane, 'ok', 'URLs copiadas!'); }
    catch { status(pane, 'err', 'Falha ao copiar'); }
  });

  pane.querySelector('#save').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const items = selected().map((r) => ({ url: r.dataset.url, title: r.dataset.title }));
    if (!items.length) { status(pane, 'warn', 'Selecione ao menos uma aba.'); btn.disabled = false; return; }
    try {
      await createLinksBatch(items, pane.querySelector('#folder').value);
      status(pane, 'ok', `${items.length} link(s) salvos!`);
      chrome.runtime.sendMessage({ type: 'refresh-badge' });
      setTimeout(() => window.close(), 700);
    } catch (err) { status(pane, 'err', err.message); btn.disabled = false; }
  });
}

function escapeHtml(s) { return String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])); }


// ── NOTA ──────────────────────────────────
function renderNotePane(root) {
  const base = currentSelection || '';
  const src = currentTab?.url ? `\n\nFonte: ${currentTab.url}` : '';
  const pane = el(`
    <div>
      <div><label>Título</label><input id="title" placeholder="Nota rápida" /></div>
      <div style="margin-top:6px"><label>Conteúdo</label><textarea id="content" style="min-height:120px"></textarea></div>
      <div class="row" style="margin-top:6px">
        <button class="ghost small" id="shot">📸 Captura de tela</button>
        <button class="ghost small" id="quote">❝ Citar seleção</button>
      </div>
      <div id="msg" style="margin-top:6px"></div>
      <button id="save" style="margin-top:8px">Salvar nota</button>
    </div>
  `);
  root.appendChild(pane);
  pane.querySelector('#title').value = currentTab?.title?.slice(0, 80) || '';
  pane.querySelector('#content').value = base + src;

  pane.querySelector('#quote').addEventListener('click', () => {
    if (!currentSelection) return status(pane, 'warn', 'Nada selecionado na página.');
    const ta = pane.querySelector('#content');
    ta.value = `> ${currentSelection.split('\n').join('\n> ')}\n\n${ta.value}`;
  });

  pane.querySelector('#shot').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
      const ta = pane.querySelector('#content');
      ta.value = `${ta.value}\n\n![captura](${dataUrl})`;
      status(pane, 'ok', 'Captura anexada (markdown).');
    } catch (err) { status(pane, 'err', err.message); }
    finally { btn.disabled = false; }
  });


  pane.querySelector('#save').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      await createNote({
        title: pane.querySelector('#title').value.trim() || 'Sem título',
        content: pane.querySelector('#content').value,
      });
      status(pane, 'ok', 'Nota salva!');
      setTimeout(() => window.close(), 600);
    } catch (err) { status(pane, 'err', err.message); btn.disabled = false; }
  });
}

// ── SENHA ─────────────────────────────────
async function renderPassPane(root) {
  const domain = domainOf(currentTab?.url || '');
  const pane = el(`
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <label style="margin:0">Credenciais para <b style="color:var(--accent)">${domain || 'este site'}</b></label>
        <button class="ghost small" id="new">+ Nova</button>
      </div>
      <div id="list" class="list" style="margin-top:6px"></div>
      <div id="form" style="margin-top:8px;display:none">
        <div><label>Nome</label><input id="name" /></div>
        <div style="margin-top:6px"><label>URL</label><input id="url" /></div>
        <div class="row" style="margin-top:6px">
          <div><label>Usuário</label><input id="user" autocomplete="off" /></div>
          <div><label>Senha</label><input id="pw" type="password" autocomplete="off" /></div>
        </div>
        <button id="save" style="margin-top:8px">Salvar credencial</button>
      </div>
      <div id="msg" style="margin-top:6px"></div>
    </div>
  `);
  root.appendChild(pane);

  const list = pane.querySelector('#list');
  const renderList = async () => {
    list.innerHTML = '<div class="empty">Carregando…</div>';
    try {
      const all = await listCredentials();
      const matches = domain ? all.filter((c) => (c.url || '').includes(domain)) : all;
      const rows = matches.length ? matches : all;
      if (!rows.length) { list.innerHTML = '<div class="empty">Nenhuma credencial salva.</div>'; return; }
      list.innerHTML = '';
      for (const c of rows) {
        const it = el(`<div class="item"><div class="name">${c.name}</div><div class="sub">${c.username || ''} · ${c.url || ''}</div></div>`);
        it.addEventListener('click', () => useCredential(c));
        list.appendChild(it);
      }
    } catch (err) { list.innerHTML = `<div class="msg err">${err.message}</div>`; }
  };

  const useCredential = async (c) => {
    try {
      const password = await revealCredential(c.id);
      if (!currentTab?.id) throw new Error('Aba inválida');
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: (user, pw) => {
          const setVal = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
          const pwEl = document.querySelector('input[type="password"]');
          const userEl = document.querySelector('input[type="email"], input[autocomplete="username"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]');
          if (userEl && user) setVal(userEl, user);
          if (pwEl && pw) setVal(pwEl, pw);
        },
        args: [c.username || '', password],
      });
      status(pane, 'ok', 'Preenchido!');
      setTimeout(() => window.close(), 500);
    } catch (err) { status(pane, 'err', err.message); }
  };

  const form = pane.querySelector('#form');
  pane.querySelector('#new').addEventListener('click', () => {
    form.style.display = 'block';
    form.querySelector('#name').value = domain || currentTab?.title || '';
    form.querySelector('#url').value = currentTab?.url || '';
  });
  form.querySelector('#save').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      await saveCredential({
        name: form.querySelector('#name').value.trim(),
        url: form.querySelector('#url').value.trim(),
        username: form.querySelector('#user').value.trim(),
        password: form.querySelector('#pw').value,
      });
      status(pane, 'ok', 'Credencial salva!');
      form.style.display = 'none';
      renderList();
    } catch (err) { status(pane, 'err', err.message); }
    finally { btn.disabled = false; }
  });

  renderList();
}

// ── LEMBRETE ──────────────────────────────
function renderRemindPane(root) {
  const pane = el(`
    <div>
      <div><label>Nome</label><input id="name" /></div>
      <div class="row" style="margin-top:6px">
        <div><label>Valor (opcional)</label><input id="amount" type="number" step="0.01" /></div>
        <div><label>A cada (dias)</label><input id="interval" type="number" value="30" /></div>
      </div>
      <div style="margin-top:6px"><label>Notas</label><textarea id="notes"></textarea></div>
      <div id="msg" style="margin-top:6px"></div>
      <button id="save" style="margin-top:8px">Criar lembrete</button>
    </div>
  `);
  root.appendChild(pane);
  pane.querySelector('#name').value = currentTab?.title?.slice(0, 80) || '';
  pane.querySelector('#notes').value = currentTab?.url || '';

  pane.querySelector('#save').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      await createReminder({
        name: pane.querySelector('#name').value.trim(),
        amount: pane.querySelector('#amount').value || null,
        interval_days: parseInt(pane.querySelector('#interval').value, 10) || 30,
        notes: pane.querySelector('#notes').value.trim(),
      });
      status(pane, 'ok', 'Lembrete criado!');
      setTimeout(() => window.close(), 600);
    } catch (err) { status(pane, 'err', err.message); btn.disabled = false; }
  });
}

// ── PROMPT ────────────────────────────────
async function renderPromptPane(root) {
  const pane = el(`
    <div>
      <label>Clique para copiar</label>
      <div id="list" class="list"></div>
      <div id="msg" style="margin-top:6px"></div>
    </div>
  `);
  root.appendChild(pane);
  const list = pane.querySelector('#list');
  list.innerHTML = '<div class="empty">Carregando…</div>';
  try {
    const prompts = await listPrompts();
    if (!prompts.length) { list.innerHTML = '<div class="empty">Nenhum prompt salvo.</div>'; return; }
    list.innerHTML = '';
    for (const p of prompts) {
      const it = el(`<div class="item"><div class="name">${p.title}</div><div class="sub">${(p.content || '').slice(0, 60)}…</div></div>`);
      it.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(p.content || ''); status(pane, 'ok', 'Copiado!'); }
        catch { status(pane, 'err', 'Não foi possível copiar'); }
      });
      list.appendChild(it);
    }
  } catch (err) { list.innerHTML = `<div class="msg err">${err.message}</div>`; }
}

render();
