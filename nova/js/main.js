// NOVA OS shell: wires the window manager, dock, launcher, palette, notifications, widgets and NEXUS.
import { APPS, ICONS, appById } from './registry.js';
import { ask, SUGGESTIONS, searchNotes } from './assistant.js';
import { state, commit, on, uid, storageBytes, logActivity, wipe } from './store.js';
import { createWM } from './wm.js';
import { RENDERERS, esc, ago, fmtBytes, accentColors } from './apps.js';

const $ = (s) => document.querySelector(s);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const bootTime = Date.now();
document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = ICONS[el.dataset.icon]));
if (isMac) document.querySelectorAll('.kbd-mod').forEach((k) => (k.textContent = '⌘K'));

/* ───────── system info (real where the browser exposes it) ───────── */
let battery = null;
navigator.getBattery?.().then((b) => { battery = b; const u = () => renderStatus(); b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u); u(); }).catch(() => {});

const fps = [];
{
  let frames = 0, last = performance.now();
  const tick = (t) => {
    frames++;
    if (t - last >= 1000) { fps.push(Math.round((frames * 1000) / (t - last))); if (fps.length > 60) fps.shift(); frames = 0; last = t; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function uptime() {
  const s = Math.floor((Date.now() - bootTime) / 1000);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return hh ? `${hh}h ${mm}m` : mm ? `${mm}m ${ss}s` : `${ss}s`;
}

function system() {
  return {
    uptime: uptime(),
    openWindows: wm.count(),
    storage: fmtBytes(storageBytes()),
    online: navigator.onLine,
    netType: navigator.connection?.effectiveType,
    battery: battery ? `${Math.round(battery.level * 100)}%${battery.charging ? ' · charging' : ''}` : '86% (simulated)',
    batterySim: !battery,
    heap: performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB` : null,
  };
}

/* ───────── window manager ───────── */
const os = {
  open: (id, payload) => { const w = wm.open(id, payload); if (w) recordOpen(id); },
  close: (id) => wm.close(id),
  ask: (text) => runNexus(text),
  applyEffect,
  createNote,
  notify,
  log: logActivity,
  system,
  fpsHistory: () => fps,
  wipe: () => { wipe(); location.reload(); },
};
let lastOpened = null;
function recordOpen(id) {
  if (lastOpened === id) return;
  lastOpened = id;
  logActivity(`Opened ${appById(id).name}`);
}

const wm = createWM({
  layer: $('#windows'),
  renderApp: (id, root, payload) => RENDERERS[id](root, os, payload),
  onChange: () => {
    renderDock();
    const top = wm.topmost();
    $('#activeApp').textContent = top ? appById(top).name : 'Desktop';
    if (top !== lastOpened) lastOpened = null;
    state.session = wm.snapshot();
    commit('session');
  },
});

/* ───────── NEXUS effects ───────── */
function createNote(title, body) {
  const n = { id: uid('n'), title, body, updated: Date.now() };
  state.notes.unshift(n);
  commit('notes');
  logActivity(`Created note "${title || 'Untitled'}"`);
  return n;
}

function applyEffect(e) {
  if (e.type === 'open') os.open(e.app, e.payload);
  else if (e.type === 'close') wm.close(e.app);
  else if (e.type === 'createNote') { createNote(e.title, e.body); notify('Note created', e.title); }
  else if (e.type === 'clearChat') { state.chat = []; commit('chat'); }
  else if (e.type === 'ask') runNexus(e.text);
}

async function runNexus(text, { openPanel = true } = {}) {
  if (openPanel && !wm.isVisible('nexus')) wm.open('nexus');
  else if (openPanel) wm.focus('nexus');
  state.chat.push({ role: 'user', text });
  commit('chat');
  let r;
  try {
    r = await ask(text, { notes: state.notes, system: system() });
  } catch (err) {
    r = { text: `NEXUS error: ${err.message}`, effects: [], actions: [] };
  }
  const isClear = r.effects.some((e) => e.type === 'clearChat');
  if (!isClear) {
    state.chat.push({ role: 'bot', text: r.text, actions: r.actions });
    state.chat = state.chat.slice(-60);
    commit('chat');
  }
  logActivity(`NEXUS: ${text.length > 40 ? text.slice(0, 40) + '…' : text}`);
  r.effects.forEach(applyEffect);
  return r;
}

/* ───────── notifications ───────── */
function notify(title, body = '') {
  state.notifications.unshift({ id: uid('x'), t: Date.now(), title, body, read: false });
  state.notifications.length = Math.min(state.notifications.length, 30);
  commit('notifications');
  const t = document.createElement('div');
  t.className = 'toast glass';
  t.innerHTML = `<strong>${esc(title)}</strong>${body ? `<span>${esc(body)}</span>` : ''}`;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

function renderNotifs() {
  const unread = state.notifications.filter((n) => !n.read).length;
  const badge = $('#bellBadge');
  badge.hidden = !unread;
  badge.textContent = unread > 9 ? '9+' : unread;
  $('#notifList').innerHTML = state.notifications.map((n) => `<li class="${n.read ? '' : 'unread'}"><strong>${esc(n.title)}</strong>${n.body ? `<span>${esc(n.body)}</span>` : ''}<time>${ago(n.t)}</time></li>`).join('') || '<li class="empty">You\'re all caught up</li>';
}

/* ───────── popovers: launcher, notifications, palette ───────── */
const pop = { launcher: $('#launcher'), notif: $('#notifCenter') };
function togglePop(name, force) {
  const el = pop[name];
  const show = force ?? el.hidden;
  Object.entries(pop).forEach(([k, p]) => { if (k !== name || !show) p.hidden = true; });
  el.hidden = !show;
  $('#launcherBtn').setAttribute('aria-expanded', !pop.launcher.hidden);
  $('#bellBtn').setAttribute('aria-expanded', !pop.notif.hidden);
  if (name === 'launcher' && show) { $('#launcherSearch').value = ''; renderLauncher(); $('#launcherSearch').focus(); }
  if (name === 'notif' && show) { state.notifications.forEach((n) => (n.read = true)); commit('notifications'); }
}
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.launcher, #launcherBtn, #brandBtn, .notif-center, #bellBtn')) { pop.launcher.hidden = pop.notif.hidden = true; $('#launcherBtn').setAttribute('aria-expanded', false); $('#bellBtn').setAttribute('aria-expanded', false); }
});
$('#launcherBtn').onclick = () => togglePop('launcher');
$('#brandBtn').onclick = () => togglePop('launcher');
$('#bellBtn').onclick = () => togglePop('notif');
$('#notifClear').onclick = () => { state.notifications = []; commit('notifications'); };

function renderLauncher() {
  const q = $('#launcherSearch').value.trim().toLowerCase();
  const match = (a) => !q || a.name.toLowerCase().includes(q) || a.keywords.some((k) => k.startsWith(q));
  const cats = [...new Set(APPS.map((a) => a.category))];
  $('#launcherBody').innerHTML = cats.map((c) => {
    const apps = APPS.filter((a) => a.category === c && match(a));
    return apps.length ? `<h3>${c}</h3><div class="l-grid">${apps.map((a) => `<button class="l-app" data-app="${a.id}"><span class="app-ico" data-app-ico="${a.id}">${ICONS[a.id]}</span><span>${a.name}</span><small>${a.desc}</small></button>`).join('')}</div>` : '';
  }).join('') || `<p class="empty">No apps match “${esc(q)}”. Press Enter to ask NEXUS.</p>`;
}
$('#launcherSearch').addEventListener('input', renderLauncher);
$('#launcherSearch').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const first = $('#launcherBody [data-app]');
  const v = e.target.value.trim();
  togglePop('launcher', false);
  if (first) os.open(first.dataset.app);
  else if (v) runNexus(v);
});
$('#launcherBody').addEventListener('click', (e) => { const b = e.target.closest('[data-app]'); if (b) { togglePop('launcher', false); os.open(b.dataset.app); } });

/* Command palette */
const palette = { el: $('#palette'), input: $('#paletteInput'), list: $('#paletteList'), items: [], sel: 0, returnFocus: null };
const COMMANDS = [
  { label: 'New note', hint: 'Notes', run: () => { const n = createNote('', ''); os.open('notes', { noteId: n.id }); } },
  { label: 'Show system status', hint: 'NEXUS', run: () => runNexus('show system status') },
  { label: 'NEXUS help', hint: 'NEXUS', run: () => runNexus('help') },
  { label: 'Clear NEXUS conversation', hint: 'NEXUS', run: () => { state.chat = []; commit('chat'); } },
  { label: 'Toggle reduce motion', hint: 'Settings', run: () => { state.prefs.reduceMotion = !state.prefs.reduceMotion; commit('prefs'); } },
  { label: 'Toggle desktop widgets', hint: 'Settings', run: () => { state.prefs.widgets = !state.prefs.widgets; commit('prefs'); } },
  { label: 'Cycle accent colour', hint: 'Settings', run: () => { const k = ['violet', 'cyan', 'emerald', 'rose', 'amber']; state.prefs.accent = k[(k.indexOf(state.prefs.accent) + 1) % k.length]; commit('prefs'); } },
  { label: 'Minimize all windows', hint: 'Windows', run: () => APPS.forEach((a) => wm.isVisible(a.id) && wm.minimize(a.id)) },
  { label: 'Close all windows', hint: 'Windows', run: () => APPS.forEach((a) => wm.close(a.id)) },
  { label: 'Reset demo data…', hint: 'Settings', run: () => os.open('settings') },
];

function openPalette() {
  palette.returnFocus = document.activeElement;
  palette.el.hidden = false;
  palette.input.value = '';
  renderPalette();
  palette.input.focus();
}
function closePalette() {
  palette.el.hidden = true;
  palette.returnFocus?.focus?.();
}
function renderPalette() {
  const q = palette.input.value.trim().toLowerCase();
  const has = (s) => s.toLowerCase().includes(q);
  const items = [];
  APPS.filter((a) => !q || has(a.name) || a.keywords.some((k) => k.startsWith(q))).forEach((a) => items.push({ group: 'Apps', label: `Open ${a.name}`, hint: a.desc, icon: a.id, run: () => os.open(a.id) }));
  COMMANDS.filter((c) => !q || has(c.label)).forEach((c) => items.push({ group: 'Commands', ...c }));
  if (q) searchNotes(state.notes, q).slice(0, 5).forEach((n) => items.push({ group: 'Notes', label: n.title || 'Untitled', hint: ago(n.updated), icon: 'notes', run: () => os.open('notes', { noteId: n.id }) }));
  if (q) items.push({ group: 'NEXUS', label: `Ask NEXUS: “${palette.input.value.trim()}”`, hint: 'Enter', icon: 'nexus', run: () => runNexus(palette.input.value.trim()) });
  palette.items = items;
  palette.sel = 0;
  let group = '';
  palette.list.innerHTML = items.map((it, i) => {
    const head = it.group !== group ? `<li class="p-group" role="presentation">${(group = it.group)}</li>` : '';
    return `${head}<li role="option" id="p-${i}" data-i="${i}" aria-selected="${i === 0}"><span class="ico">${ICONS[it.icon] ?? ICONS.search}</span><span class="p-label">${esc(it.label)}</span><small>${esc(it.hint ?? '')}</small></li>`;
  }).join('') || '<li class="empty">Type to search</li>';
  palette.input.setAttribute('aria-activedescendant', items.length ? 'p-0' : '');
}
function movePalette(d) {
  if (!palette.items.length) return;
  palette.sel = (palette.sel + d + palette.items.length) % palette.items.length;
  palette.list.querySelectorAll('[role=option]').forEach((li) => li.setAttribute('aria-selected', +li.dataset.i === palette.sel));
  palette.list.querySelector(`#p-${palette.sel}`).scrollIntoView({ block: 'nearest' });
  palette.input.setAttribute('aria-activedescendant', `p-${palette.sel}`);
}
function runPalette(i) {
  const it = palette.items[i];
  if (!it) return;
  palette.returnFocus = null;
  closePalette();
  it.run();
}
palette.input.addEventListener('input', renderPalette);
palette.input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); runPalette(palette.sel); }
  else if (e.key === 'Tab') e.preventDefault(); // keep focus inside the modal
});
palette.list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) runPalette(+li.dataset.i); });
palette.el.addEventListener('pointerdown', (e) => e.target === palette.el && closePalette());
$('#paletteBtn').onclick = openPalette;

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.el.hidden ? openPalette() : closePalette(); return; }
  if (e.key === 'Escape') {
    if (!palette.el.hidden) closePalette();
    else if (!pop.launcher.hidden || !pop.notif.hidden) { pop.launcher.hidden = pop.notif.hidden = true; $('#launcherBtn').focus(); }
  }
});

/* ───────── dock ───────── */
function renderDock() {
  const top = wm.topmost();
  $('#dockApps').innerHTML = APPS.map((a) => `<button class="dock-btn${a.id === 'nexus' ? ' nexus' : ''}${wm.isOpen(a.id) ? ' running' : ''}${a.id === top ? ' active' : ''}" data-app="${a.id}" aria-label="${a.name}${wm.isOpen(a.id) ? ' (open)' : ''}" title="${a.name}"><span class="ico">${ICONS[a.id]}</span></button>`).join('');
}
$('#dockApps').addEventListener('click', (e) => {
  const b = e.target.closest('[data-app]');
  if (!b) return;
  const id = b.dataset.app;
  const wasOpen = wm.isOpen(id);
  wm.toggle(id);
  if (!wasOpen) recordOpen(id);
});

/* ───────── top bar + widgets ───────── */
function renderClock() {
  const d = new Date();
  const opt = { hour: 'numeric', minute: '2-digit', hour12: !state.prefs.clock24 };
  $('#clock').innerHTML = `<span class="clock-date">${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span> ${d.toLocaleTimeString(undefined, opt)}`;
  $('#clock').dateTime = d.toISOString();
  $('#wTime').textContent = d.toLocaleTimeString(undefined, opt);
  $('#wDate').textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const h = d.getHours();
  $('#wGreet').textContent = h < 5 ? 'Late night session' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function renderStatus() {
  const s = system();
  $('#netStat').innerHTML = `${s.online ? ICONS.wifi : ICONS.wifiOff}`;
  $('#netStat').title = s.online ? `Online${s.netType ? ' · ' + s.netType : ''} (browser-reported)` : 'Offline';
  $('#netStat').setAttribute('aria-label', $('#netStat').title);
  const pct = battery ? Math.round(battery.level * 100) : 86;
  $('#batStat').innerHTML = `${ICONS.battery}<span>${pct}%</span>${battery ? '' : '<em>sim</em>'}`;
  $('#batStat').title = battery ? `Battery ${pct}%${battery.charging ? ', charging' : ''}` : 'Battery API unavailable — simulated value';
  $('#batStat').setAttribute('aria-label', $('#batStat').title);
  $('#batStat').style.setProperty('--lvl', pct / 100);
  $('#wSystem').innerHTML = [['Uptime', s.uptime], ['Windows', s.openWindows], ['Frame rate', fps.length ? `${fps[fps.length - 1]} fps` : '—'], ['Storage', s.storage]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}
addEventListener('online', renderStatus);
addEventListener('offline', () => { renderStatus(); notify('You are offline', 'NOVA keeps working; data is local.'); });

function renderWidgetNotes() {
  const items = [...state.notes].sort((a, b) => b.updated - a.updated).slice(0, 4);
  $('#wNotes').innerHTML = items.map((n) => `<li><button data-note="${n.id}"><strong>${esc(n.title || 'Untitled')}</strong><time>${ago(n.updated)}</time></button></li>`).join('') || '<li class="empty">No notes yet</li>';
}
$('#wNotes').addEventListener('click', (e) => { const b = e.target.closest('[data-note]'); if (b) os.open('notes', { noteId: b.dataset.note }); });
$('#widgets').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) os.open(b.dataset.open); });
$('#wNexusChips').innerHTML = SUGGESTIONS.slice(1, 5).map((s) => `<button class="chip" data-ask="${esc(s)}">${esc(s)}</button>`).join('');
$('#wNexusChips').addEventListener('click', (e) => { const b = e.target.closest('[data-ask]'); if (b) runNexus(b.dataset.ask); });
$('#wNexusForm').onsubmit = (e) => { e.preventDefault(); const v = $('#wNexusInput').value.trim(); if (v) { $('#wNexusInput').value = ''; runNexus(v); } };

/* ───────── preferences → DOM ───────── */
function applyPrefs() {
  const p = state.prefs;
  const [a, b] = accentColors(p.accent);
  const root = document.documentElement;
  root.style.setProperty('--accent', a);
  root.style.setProperty('--accent-2', b);
  root.dataset.wallpaper = p.wallpaper;
  root.classList.toggle('reduce-motion', !!p.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);
  $('#widgets').hidden = !p.widgets;
  renderClock();
  stars.restart();
}

/* ───────── starfield (2D canvas, paused when hidden or reduced motion) ───────── */
const stars = (() => {
  const c = $('#stars'), g = c.getContext('2d');
  let pts = [], raf = 0, W = 0, H = 0;
  const motion = () => !document.documentElement.classList.contains('reduce-motion') && state.prefs.wallpaper !== 'midnight';
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
    const n = state.prefs.wallpaper === 'starfield' ? 220 : 120;
    pts = Array.from({ length: Math.round(n * Math.min(1, (innerWidth * innerHeight) / 1.4e6) + 40) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.2 + 0.3) * dpr, s: Math.random() * 0.15 + 0.03, p: Math.random() * 6.28 }));
  }
  function draw(t) {
    g.clearRect(0, 0, W, H);
    for (const s of pts) {
      if (motion()) { s.y -= s.s; if (s.y < 0) { s.y = H; s.x = Math.random() * W; } }
      g.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(s.p + t / 2400));
      g.fillStyle = '#cfd8ff';
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
    }
    if (motion() && !document.hidden) raf = requestAnimationFrame(draw);
  }
  function restart() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); restart(); }, 150); });
  document.addEventListener('visibilitychange', restart);
  size();
  return { restart };
})();

/* ───────── boot ───────── */
on('prefs', applyPrefs);
on('notes', renderWidgetNotes);
on('notifications', renderNotifs);
applyPrefs();
renderDock();
renderNotifs();
renderWidgetNotes();
renderStatus();
setInterval(() => { renderClock(); renderStatus(); }, 1000);

const firstRun = !state.session;
if (state.session?.length) wm.restore(state.session);
else if (firstRun && !matchMedia('(max-width: 720px)').matches) wm.open('nexus');
if (firstRun) setTimeout(() => notify('Welcome to NOVA OS', `Press ${isMac ? '⌘' : 'Ctrl'}+K for the command palette.`), 600);
