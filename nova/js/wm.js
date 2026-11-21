// Window manager: open/focus/minimize/maximize/close, drag, resize, z-order, session restore.
import { appById, ICONS } from './registry.js';

const MIN_W = 300, MIN_H = 220;
const isMobile = () => matchMedia('(max-width: 720px)').matches;

export function createWM({ layer, renderApp, onChange }) {
  const wins = new Map(); // appId -> { el, app, inst, prev }
  let z = 10, cascade = 0;

  const bounds = () => {
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top')) || 44;
    const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock')) || 84;
    return { top, w: innerWidth, h: innerHeight - dock };
  };

  function clampGeom(g) {
    const b = bounds();
    const w = Math.min(Math.max(g.w, MIN_W), b.w - 16);
    const h = Math.min(Math.max(g.h, MIN_H), b.h - b.top - 8);
    // keep the title bar reachable: at least 100px horizontally on screen, never above the top bar
    const x = Math.min(Math.max(g.x, 100 - w), b.w - 100);
    const y = Math.min(Math.max(g.y, b.top + 4), b.h - 40);
    return { x, y, w, h };
  }

  const place = (el, g) => Object.assign(el.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });
  // Read the stored (un-maximized) geometry from inline styles: works while hidden or maximized.
  const geom = (el) => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: parseFloat(el.style.width), h: parseFloat(el.style.height) });

  function defaultGeom(app) {
    const b = bounds();
    const [w, h] = app.size;
    const off = (cascade++ % 6) * 28;
    return clampGeom({ w, h, x: (b.w - Math.min(w, b.w)) / 2 + off - 60, y: b.top + Math.max(16, (b.h - b.top - h) / 2) + off - 40 });
  }

  function open(id, payload, saved) {
    const app = appById(id);
    if (!app) return null;
    let w = wins.get(id);
    if (w) {
      w.el.hidden = false;
      focus(id);
      if (payload) w.inst?.onPayload?.(payload);
      onChange();
      return w;
    }
    const el = document.createElement('section');
    el.className = 'win glass';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', app.name);
    el.dataset.app = id;
    el.innerHTML = `
      <header class="win-bar">
        <span class="ico win-ico">${ICONS[id]}</span>
        <h2 class="win-title">${app.name}</h2>
        <div class="win-ctl">
          <button data-act="min" aria-label="Minimize ${app.name}">${ICONS.min}</button>
          <button data-act="max" aria-label="Maximize ${app.name}">${ICONS.max}</button>
          <button data-act="close" class="close" aria-label="Close ${app.name}">${ICONS.close}</button>
        </div>
      </header>
      <div class="win-body"><div class="app"></div></div>
      <span class="rz rz-e" data-rz="e"></span><span class="rz rz-s" data-rz="s"></span><span class="rz rz-se" data-rz="se"></span><span class="rz rz-w" data-rz="w"></span>`;
    layer.append(el);
    place(el, saved ? clampGeom(saved) : defaultGeom(app));
    w = { el, app, inst: null, prev: null };
    wins.set(id, w);
    if (saved?.max) toggleMax(id, true);
    if (saved?.min) el.hidden = true;

    el.addEventListener('pointerdown', () => focus(id), true);
    el.addEventListener('focusin', () => focus(id));
    el.querySelector('.win-ctl').addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'min') minimize(id);
      else if (act === 'max') toggleMax(id);
      else if (act === 'close') close(id);
    });
    const bar = el.querySelector('.win-bar');
    bar.addEventListener('dblclick', (e) => !e.target.closest('button') && toggleMax(id));
    bar.addEventListener('pointerdown', (e) => startDrag(e, w));
    el.querySelectorAll('.rz').forEach((h) => h.addEventListener('pointerdown', (e) => startResize(e, w, h.dataset.rz)));

    w.inst = renderApp(id, el.querySelector('.win-body > .app'), payload) ?? null;
    if (!saved?.min) focus(id);
    el.classList.add('opening');
    el.addEventListener('animationend', () => el.classList.remove('opening'), { once: true });
    onChange();
    return w;
  }

  function startDrag(e, w) {
    if (e.button !== 0 || e.target.closest('button') || isMobile()) return;
    if (w.el.classList.contains('max')) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, g = geom(w.el);
    w.el.classList.add('dragging');
    const move = (ev) => place(w.el, clampGeom({ ...g, x: g.x + ev.clientX - sx, y: g.y + ev.clientY - sy }));
    track(e, move, () => { w.el.classList.remove('dragging'); onChange(); });
  }

  function startResize(e, w, dir) {
    if (e.button !== 0 || isMobile() || w.el.classList.contains('max')) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, g = geom(w.el);
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      const n = { ...g };
      if (dir.includes('e')) n.w = g.w + dx;
      if (dir.includes('s')) n.h = g.h + dy;
      if (dir === 'w') { n.w = Math.max(MIN_W, g.w - dx); n.x = g.x + g.w - n.w; }
      place(w.el, clampGeom(n));
    };
    track(e, move, onChange);
  }

  function track(e, move, done) {
    const t = e.currentTarget;
    t.setPointerCapture(e.pointerId);
    let raf = 0;
    const onMove = (ev) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => move(ev)); };
    const end = () => { t.removeEventListener('pointermove', onMove); t.removeEventListener('pointerup', end); t.removeEventListener('pointercancel', end); done(); };
    t.addEventListener('pointermove', onMove);
    t.addEventListener('pointerup', end);
    t.addEventListener('pointercancel', end);
  }

  function focus(id) {
    const w = wins.get(id);
    if (!w) return;
    const changed = topmost() !== id || !w.el.classList.contains('focused');
    if (topmost() !== id) w.el.style.zIndex = ++z;
    wins.forEach((o) => o.el.classList.toggle('focused', o === w));
    if (changed) onChange();
  }

  function minimize(id) {
    const w = wins.get(id);
    if (!w) return;
    w.el.hidden = true;
    w.el.classList.remove('focused');
    const next = topmost();
    if (next) wins.get(next).el.classList.add('focused');
    onChange();
  }

  function toggleMax(id, force) {
    const w = wins.get(id);
    if (!w) return;
    const max = force ?? !w.el.classList.contains('max');
    w.el.classList.toggle('max', max);
    const btn = w.el.querySelector('[data-act="max"]');
    btn.innerHTML = max ? ICONS.restore : ICONS.max;
    btn.setAttribute('aria-label', `${max ? 'Restore' : 'Maximize'} ${w.app.name}`);
    onChange();
  }

  function close(id) {
    const w = wins.get(id);
    if (!w) return;
    w.inst?.destroy?.();
    w.el.remove();
    wins.delete(id);
    onChange();
  }

  /** Dock behaviour: open → focus → minimize. */
  function toggle(id) {
    const w = wins.get(id);
    if (!w) return open(id);
    if (!w.el.hidden && topmost() === id) return minimize(id);
    open(id);
  }

  function topmost() {
    let best = null, bz = -1;
    wins.forEach((w, id) => { const zi = +w.el.style.zIndex || 0; if (!w.el.hidden && zi > bz) { bz = zi; best = id; } });
    return best;
  }

  const snapshot = () => [...wins.values()]
    .sort((a, b) => (+a.el.style.zIndex || 0) - (+b.el.style.zIndex || 0))
    .map((w) => ({ app: w.app.id, ...geom(w.el), max: w.el.classList.contains('max'), min: w.el.hidden }));

  // Pull windows back on screen after the viewport shrinks.
  addEventListener('resize', () => wins.forEach((w) => !isMobile() && place(w.el, clampGeom(geom(w.el)))));

  return {
    open, close, focus, minimize, toggleMax, toggle, topmost, snapshot,
    isOpen: (id) => wins.has(id),
    isVisible: (id) => wins.has(id) && !wins.get(id).el.hidden,
    count: () => wins.size,
    restore: (list) => list.forEach((s) => open(s.app, null, s)),
  };
}
