// App renderers. Each takes (root, os, payload) and may return { onPayload, destroy }.
import { ICONS } from './registry.js';
import { SUGGESTIONS, searchNotes } from './assistant.js';
import { evaluate, formatNumber } from './calc.js';
import { state, commit, on, storageBytes, resetDemo } from './store.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
export const fmtBytes = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/* ───────────── NEXUS ───────────── */
function nexus(root, os) {
  root.classList.add('app-nexus');
  root.innerHTML = `
    <div class="nx-main">
      <div class="nx-status"><span class="dot"></span>Local demo assistant · deterministic commands, no AI model connected</div>
      <ol class="nx-log" aria-live="polite" aria-label="Conversation"></ol>
      <div class="chips nx-chips">${SUGGESTIONS.map((s) => `<button class="chip" data-ask="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="nx-form"><input placeholder="Command NEXUS…" aria-label="Command NEXUS" autocomplete="off" /><button class="btn primary" aria-label="Send">${ICONS.send}</button></form>
    </div>
    <aside class="nx-side">
      <h3>Quick actions</h3>
      <div class="nx-quick">
        <button data-ask="create a note Untitled idea">${ICONS.plus}New note</button>
        <button data-ask="show system status">${ICONS.monitor}Status</button>
        <button data-open="files">${ICONS.files}Files</button>
        <button data-open="calculator">${ICONS.calculator}Calc</button>
      </div>
      <h3>Recent activity</h3>
      <ul class="nx-activity"></ul>
    </aside>`;
  const log = root.querySelector('.nx-log');
  const input = root.querySelector('input');
  const act = root.querySelector('.nx-activity');

  const renderMsg = (m) => {
    const li = h(`<li class="msg ${m.role}"><div class="bubble"></div></li>`);
    li.firstChild.textContent = m.text;
    if (m.actions?.length) {
      const row = h('<div class="msg-actions"></div>');
      m.actions.forEach((a) => {
        const b = h(`<button class="chip"></button>`);
        b.textContent = a.label;
        b.onclick = () => os.applyEffect(a.effect);
        row.append(b);
      });
      li.append(row);
    }
    log.append(li);
  };
  const renderLog = () => {
    log.innerHTML = '';
    if (!state.chat.length) renderMsg({ role: 'bot', text: 'NEXUS online. I run locally in demo mode and understand a fixed set of commands — type "help" or pick a suggestion.' });
    state.chat.forEach(renderMsg);
    log.scrollTop = log.scrollHeight;
  };
  const renderAct = () => {
    act.innerHTML = state.activity.slice(0, 12).map((a) => `<li><span>${esc(a.text)}</span><time>${ago(a.t)}</time></li>`).join('') || '<li class="empty">Nothing yet</li>';
  };

  root.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    os.ask(v);
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask],[data-open]');
    if (!b) return;
    if (b.dataset.ask) os.ask(b.dataset.ask);
    else os.open(b.dataset.open);
  });

  renderLog();
  renderAct();
  const offs = [on('chat', renderLog), on('activity', renderAct)];
  setTimeout(() => input.focus(), 50);
  return { onPayload: () => input.focus(), destroy: () => offs.forEach((f) => f()) };
}

/* ───────────── Notes ───────────── */
function notes(root, os, payload) {
  root.classList.add('app-notes');
  root.innerHTML = `
    <aside class="nt-side">
      <div class="nt-tools"><div class="field sm">${ICONS.search}<input type="search" placeholder="Search notes" aria-label="Search notes" /></div><button class="btn icon primary" data-new aria-label="New note">${ICONS.plus}</button></div>
      <ul class="nt-list" role="listbox" aria-label="Notes"></ul>
    </aside>
    <section class="nt-editor">
      <div class="nt-empty">Select or create a note</div>
      <div class="nt-form" hidden>
        <input class="nt-title" aria-label="Note title" placeholder="Title" />
        <textarea class="nt-body" aria-label="Note body" placeholder="Start writing…"></textarea>
        <footer><span class="nt-meta"></span><button class="btn ghost danger" data-del>${ICONS.trash}Delete</button></footer>
      </div>
    </section>`;
  const list = root.querySelector('.nt-list');
  const search = root.querySelector('input[type=search]');
  const form = root.querySelector('.nt-form');
  const title = root.querySelector('.nt-title');
  const body = root.querySelector('.nt-body');
  const meta = root.querySelector('.nt-meta');
  let current = payload?.noteId ?? state.notes[0]?.id ?? null;

  const sorted = () => [...state.notes].sort((a, b) => b.updated - a.updated);
  const renderList = () => {
    const q = search.value.trim();
    const items = q ? searchNotes(sorted(), q) : sorted();
    list.innerHTML = items.map((n) => `<li role="option" tabindex="0" data-id="${n.id}" aria-selected="${n.id === current}"><strong>${esc(n.title || 'Untitled')}</strong><span>${esc(n.body.slice(0, 80) || 'No content')}</span><time>${ago(n.updated)}</time></li>`).join('') || `<li class="empty">${q ? 'No matches' : 'No notes yet'}</li>`;
  };
  const renderEditor = () => {
    const n = state.notes.find((x) => x.id === current);
    form.hidden = !n;
    root.querySelector('.nt-empty').hidden = !!n;
    root.classList.toggle('editing', !!n);
    if (!n) return;
    if (document.activeElement !== title) title.value = n.title;
    if (document.activeElement !== body) body.value = n.body;
    meta.textContent = `Saved locally · edited ${ago(n.updated)}`;
  };
  const select = (id) => { current = id; renderList(); renderEditor(); };

  list.addEventListener('click', (e) => { const li = e.target.closest('li[data-id]'); if (li) select(li.dataset.id); });
  list.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.closest('li[data-id]')?.click(); });
  search.addEventListener('input', renderList);
  root.querySelector('[data-new]').onclick = () => { const n = os.createNote('', ''); select(n.id); title.focus(); };
  root.querySelector('[data-del]').onclick = () => {
    const n = state.notes.find((x) => x.id === current);
    if (!n || !confirm(`Delete "${n.title || 'Untitled'}"?`)) return;
    state.notes = state.notes.filter((x) => x.id !== current);
    os.log(`Deleted note "${n.title || 'Untitled'}"`);
    current = sorted()[0]?.id ?? null;
    commit('notes');
  };
  const edit = () => {
    const n = state.notes.find((x) => x.id === current);
    if (!n) return;
    n.title = title.value;
    n.body = body.value;
    n.updated = Date.now();
    commit('notes');
  };
  title.addEventListener('input', edit);
  body.addEventListener('input', edit);
  // Back to list on narrow layouts
  root.addEventListener('keydown', (e) => e.key === 'Escape' && root.classList.contains('editing') && root.classList.remove('editing'));

  renderList();
  renderEditor();
  const off = on('notes', () => { if (!state.notes.some((n) => n.id === current)) current = sorted()[0]?.id ?? null; renderList(); renderEditor(); });
  return { onPayload: (p) => p?.noteId && select(p.noteId), destroy: off };
}

/* ───────────── Files ───────────── */
const DOCS = [
  { id: 'd-readme', name: 'README.md', body: '# NOVA OS\n\nA browser desktop shell with the NEXUS command layer.\n\nAll data lives in this browser\'s localStorage. Nothing is sent to a server.' },
  { id: 'd-keys', name: 'Shortcuts.txt', body: 'Ctrl/Cmd + K   Command palette\nEsc            Close palette / launcher\nDouble-click   Title bar maximizes a window\nEnter          Run a command in NEXUS' },
  { id: 'd-arch', name: 'NEXUS-architecture.md', body: '# NEXUS architecture\n\nThe shell calls ask(input, context, provider).\nA provider returns { text, effects, actions }.\n\nlocalProvider  — deterministic demo, runs offline (active)\nremoteProvider — POSTs to your own server endpoint, which holds the model API key.\n\nEffects are whitelisted (open, close, createNote, clearChat, ask) before the shell applies them.' },
];
function files(root, os) {
  root.classList.add('app-files');
  root.innerHTML = `
    <aside class="fl-side" role="tablist" aria-label="Locations">
      <button role="tab" data-loc="notes">${ICONS.notes}Notes</button>
      <button role="tab" data-loc="docs">${ICONS.folder}Documents</button>
      <button role="tab" data-loc="system">${ICONS.settings}System</button>
    </aside>
    <section class="fl-main">
      <div class="fl-bar"><nav class="crumbs" aria-label="Path"></nav><div class="field sm">${ICONS.search}<input type="search" placeholder="Filter" aria-label="Filter files" /></div></div>
      <ul class="fl-grid"></ul>
      <div class="fl-preview" hidden><div class="fl-pv-bar"><button class="btn ghost" data-back>${ICONS.back}Back</button><strong></strong><span class="pill">read-only</span></div><pre></pre></div>
    </section>`;
  let loc = 'notes';
  const grid = root.querySelector('.fl-grid');
  const filter = root.querySelector('input');
  const preview = root.querySelector('.fl-preview');
  const items = () => {
    if (loc === 'notes') return state.notes.map((n) => ({ id: n.id, name: `${n.title || 'Untitled'}.note`, sub: ago(n.updated), kind: 'note' }));
    if (loc === 'docs') return DOCS.map((d) => ({ id: d.id, name: d.name, sub: fmtBytes(d.body.length), kind: 'doc' }));
    return [
      { id: 'prefs', name: 'preferences.json', sub: 'live', kind: 'sys' },
      { id: 'session', name: 'session.json', sub: 'live', kind: 'sys' },
    ];
  };
  const render = () => {
    root.querySelectorAll('[data-loc]').forEach((b) => b.setAttribute('aria-selected', b.dataset.loc === loc));
    root.querySelector('.crumbs').innerHTML = `<span>Home</span><span>/</span><strong>${{ notes: 'Notes', docs: 'Documents', system: 'System' }[loc]}</strong>`;
    const q = filter.value.toLowerCase();
    const list = items().filter((i) => i.name.toLowerCase().includes(q));
    grid.innerHTML = list.map((i) => `<li><button data-id="${i.id}" data-kind="${i.kind}">${i.kind === 'note' ? ICONS.notes : ICONS.doc}<span>${esc(i.name)}</span><small>${esc(i.sub)}</small></button></li>`).join('') || '<li class="empty">No files</li>';
  };
  const show = (name, text) => {
    preview.hidden = false;
    grid.hidden = true;
    preview.querySelector('strong').textContent = name;
    preview.querySelector('pre').textContent = text;
  };
  root.querySelector('.fl-side').onclick = (e) => { const b = e.target.closest('[data-loc]'); if (b) { loc = b.dataset.loc; preview.hidden = true; grid.hidden = false; render(); } };
  root.querySelector('[data-back]').onclick = () => { preview.hidden = true; grid.hidden = false; };
  filter.addEventListener('input', render);
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const { id, kind } = b.dataset;
    if (kind === 'note') return os.open('notes', { noteId: id });
    if (kind === 'doc') { const d = DOCS.find((x) => x.id === id); return show(d.name, d.body); }
    if (id === 'prefs') return show('preferences.json', JSON.stringify(state.prefs, null, 2));
    show('session.json', JSON.stringify({ windows: state.session, notes: state.notes.length, storage: fmtBytes(storageBytes()) }, null, 2));
  });
  render();
  return { destroy: on('notes', render) };
}

/* ───────────── Calculator ───────────── */
function calculator(root, os, payload) {
  root.classList.add('app-calc');
  const keys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '^', '='];
  root.innerHTML = `
    <div class="cl-display"><input aria-label="Expression" autocomplete="off" spellcheck="false" /><output aria-live="polite">0</output></div>
    <div class="cl-keys">${keys.map((k) => `<button class="${/[=]/.test(k) ? 'eq' : /[÷×\-+^()C]/.test(k) ? 'op' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
    <details class="cl-hist"><summary>History</summary><ul></ul></details>`;
  const input = root.querySelector('input');
  const out = root.querySelector('output');
  const hist = root.querySelector('.cl-hist ul');
  const preview = () => {
    if (!input.value.trim()) { out.textContent = '0'; out.classList.remove('err'); return; }
    try { out.textContent = formatNumber(evaluate(input.value)); out.classList.remove('err'); } catch { out.textContent = '…'; }
  };
  const run = () => {
    const expr = input.value.trim();
    if (!expr) return;
    try {
      const n = evaluate(expr), v = formatNumber(n);
      state.calcHistory.unshift({ expr, v });
      state.calcHistory.length = Math.min(state.calcHistory.length, 20);
      commit('calc');
      input.value = String(+n.toPrecision(12));
      out.textContent = v;
      out.classList.remove('err');
      renderHist();
    } catch (e) { out.textContent = e.message; out.classList.add('err'); }
  };
  const renderHist = () => { hist.innerHTML = state.calcHistory.map((x, i) => `<li><button data-i="${i}"><span>${esc(x.expr)}</span><strong>= ${esc(x.v)}</strong></button></li>`).join('') || '<li class="empty">No calculations yet</li>'; };
  root.querySelector('.cl-keys').onclick = (e) => {
    const k = e.target.closest('button')?.dataset.k;
    if (!k) return;
    if (k === 'C') input.value = '';
    else if (k === '=') return run();
    else input.value += k;
    preview();
  };
  hist.onclick = (e) => { const b = e.target.closest('button'); if (b) { input.value = state.calcHistory[b.dataset.i].expr; preview(); input.focus(); } };
  input.addEventListener('input', preview);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); if (e.key === 'Escape') { input.value = ''; preview(); } });
  const load = (p) => { if (p?.expr) { input.value = p.expr; preview(); } input.focus(); };
  renderHist();
  load(payload);
  return { onPayload: load };
}

/* ───────────── System Monitor ───────────── */
function monitor(root, os) {
  root.classList.add('app-monitor');
  root.innerHTML = `
    <div class="mn-cards"></div>
    <section class="mn-graph glass-inset"><header><h3>Frame rate</h3><span class="pill">measured</span><strong class="fps-now"></strong></header><canvas height="90" aria-label="Frame rate history"></canvas></section>
    <p class="fine">Values marked <span class="pill">sim</span> are simulated because this browser doesn't expose them.</p>`;
  const cards = root.querySelector('.mn-cards');
  const canvas = root.querySelector('canvas');
  const ctx2 = canvas.getContext('2d');
  const render = () => {
    const s = os.system();
    const rows = [
      ['Uptime', s.uptime], ['Open windows', s.openWindows], ['Notes', state.notes.length], ['Storage used', s.storage],
      ['Network', s.online ? `Online${s.netType ? ' · ' + s.netType : ''}` : 'Offline'], ['Battery', s.battery, s.batterySim],
      ['CPU threads', navigator.hardwareConcurrency || '—'], ['JS heap', s.heap ?? 'n/a in this browser'],
      ['Viewport', `${innerWidth} × ${innerHeight}`], ['Accent', state.prefs.accent[0].toUpperCase() + state.prefs.accent.slice(1)],
    ];
    cards.innerHTML = rows.map(([k, v, sim]) => `<div class="mn-card"><span>${k}${sim ? ' <span class="pill">sim</span>' : ''}</span><strong>${esc(v)}</strong></div>`).join('');
    const fps = os.fpsHistory();
    root.querySelector('.fps-now').textContent = fps.length ? `${fps[fps.length - 1]} fps` : '—';
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio), hh = (canvas.height = 90 * devicePixelRatio);
    ctx2.clearRect(0, 0, w, hh);
    if (fps.length < 2) return;
    const accent = getComputedStyle(root).getPropertyValue('--accent-2').trim() || '#22d3ee';
    const max = Math.max(70, ...fps);
    ctx2.beginPath();
    fps.forEach((f, i) => { const x = (i / (fps.length - 1)) * w, y = hh - (f / max) * (hh - 6) - 3; i ? ctx2.lineTo(x, y) : ctx2.moveTo(x, y); });
    ctx2.strokeStyle = accent;
    ctx2.lineWidth = 2 * devicePixelRatio;
    ctx2.stroke();
    ctx2.lineTo(w, hh); ctx2.lineTo(0, hh); ctx2.closePath();
    ctx2.globalAlpha = 0.12; ctx2.fillStyle = accent; ctx2.fill(); ctx2.globalAlpha = 1;
  };
  render();
  const t = setInterval(render, 1000);
  return { destroy: () => clearInterval(t) };
}

/* ───────────── Settings ───────────── */
const ACCENTS = { violet: ['#8b5cf6', '#22d3ee'], cyan: ['#22d3ee', '#818cf8'], emerald: ['#34d399', '#22d3ee'], rose: ['#f472b6', '#a78bfa'], amber: ['#fbbf24', '#f472b6'] };
export const accentColors = (name) => ACCENTS[name] ?? ACCENTS.violet;

function settings(root, os) {
  root.classList.add('app-settings');
  const toggle = (key, label, desc) => `<label class="row"><span><strong>${label}</strong><small>${desc}</small></span><input type="checkbox" class="switch" data-pref="${key}" /></label>`;
  root.innerHTML = `
    <section><h3>Appearance</h3>
      <div class="row"><span><strong>Accent</strong><small>Highlight colour across the shell</small></span>
        <div class="swatches" role="radiogroup" aria-label="Accent">${Object.entries(ACCENTS).map(([k, [a, b]]) => `<button role="radio" data-accent="${k}" aria-label="${k}" style="--a:${a};--b:${b}"></button>`).join('')}</div></div>
      <div class="row"><span><strong>Wallpaper</strong><small>Background style</small></span>
        <select data-pref="wallpaper" aria-label="Wallpaper"><option value="aurora">Aurora</option><option value="starfield">Starfield</option><option value="midnight">Midnight (static)</option></select></div>
      ${toggle('clock24', '24-hour clock', 'Use 24-hour time in the top bar')}
      ${toggle('reduceMotion', 'Reduce motion', 'Stop background animation and window transitions')}
      ${toggle('widgets', 'Desktop widgets', 'Show clock, NEXUS, system and notes widgets')}
    </section>
    <section><h3>Data</h3>
      <div class="row"><span><strong>Local storage</strong><small>Notes, preferences, history and window layout live only in this browser</small></span><strong class="st-bytes"></strong></div>
      <div class="row"><span><strong>Reset demo data</strong><small>Restore sample notes; clear chat, history, activity and notifications. Keeps appearance.</small></span><button class="btn" data-reset>Reset</button></div>
      <div class="row"><span><strong>Clear everything</strong><small>Delete all NOVA OS data from this browser and reload</small></span><button class="btn danger" data-wipe>Clear all</button></div>
    </section>
    <section><h3>About</h3><p class="fine">NOVA OS · NEXUS command layer running in <strong>local demo mode</strong>. No AI service is connected; responses come from deterministic rules in <code>js/assistant.js</code>.</p></section>`;
  const sync = () => {
    root.querySelectorAll('[data-pref]').forEach((el) => { el.type === 'checkbox' ? (el.checked = !!state.prefs[el.dataset.pref]) : (el.value = state.prefs[el.dataset.pref]); });
    root.querySelectorAll('[data-accent]').forEach((b) => b.setAttribute('aria-checked', b.dataset.accent === state.prefs.accent));
    root.querySelector('.st-bytes').textContent = fmtBytes(storageBytes());
  };
  root.addEventListener('change', (e) => {
    const k = e.target.dataset.pref;
    if (!k) return;
    state.prefs[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    commit('prefs');
  });
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-accent]');
    if (a) { state.prefs.accent = a.dataset.accent; commit('prefs'); }
    if (e.target.closest('[data-reset]') && confirm('Reset demo data? Your notes, chat and history will be replaced with the samples.')) {
      resetDemo();
      ['notes', 'chat', 'activity', 'notifications', 'calc'].forEach(commit);
      os.notify('Demo data reset', 'Sample notes restored.');
    }
    if (e.target.closest('[data-wipe]') && confirm('Delete all NOVA OS data from this browser?')) {
      os.wipe();
    }
  });
  sync();
  const off = on('*', sync);
  return { destroy: off };
}

export const RENDERERS = { nexus, notes, files, calculator, monitor, settings };
