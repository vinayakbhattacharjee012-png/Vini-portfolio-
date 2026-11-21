// Persistent state in localStorage. Every access is guarded: private mode / blocked storage
// just means the session runs in memory.
const KEY = 'nova-os:v1';

export const DEFAULT_PREFS = { accent: 'violet', wallpaper: 'aurora', clock24: false, reduceMotion: false, widgets: true };

const seedNotes = () => {
  const now = Date.now();
  return [
    { id: 'n-welcome', title: 'Welcome to NOVA OS', body: 'NOVA is the desktop; NEXUS is the command layer.\n\n• Press Ctrl/Cmd + K for the command palette.\n• Drag windows by their title bar, resize from the edges.\n• Ask NEXUS to "create a note …" or "calculate 240 * 0.18".\n\nEverything you write is saved in this browser only.', updated: now },
    { id: 'n-launch', title: 'Launch checklist', body: '1. Polish dock animations\n2. Write NEXUS help text\n3. Test on mobile\n4. Ship it', updated: now - 3600e3 },
    { id: 'n-ideas', title: 'Ideas', body: 'Connect a real model via a server-side NEXUS endpoint.\nAdd a weather widget.\nKeyboard window switching.', updated: now - 86400e3 },
  ];
};

const fresh = () => ({ prefs: { ...DEFAULT_PREFS }, notes: seedNotes(), calcHistory: [], chat: [], activity: [], notifications: [], session: null });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw);
    const base = fresh();
    return { ...base, ...data, prefs: { ...base.prefs, ...data.prefs }, chat: (data.chat ?? []).filter((m) => !m.pending) };
  } catch {
    return fresh();
  }
}

export const state = load();
export const bus = new EventTarget();

let timer, wiped = false;
/** Mark `topic` changed: notify listeners now, write to storage shortly after. */
export function commit(topic) {
  bus.dispatchEvent(new CustomEvent('change', { detail: topic }));
  clearTimeout(timer);
  timer = setTimeout(flush, 250);
}
export function flush() {
  clearTimeout(timer);
  if (wiped) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked: keep running in memory */ }
}
addEventListener('pagehide', flush);

/** Subscribe to a topic ('*' for all); returns an unsubscribe function. */
export function on(topic, fn) {
  const h = (e) => (topic === '*' || e.detail === topic) && fn(e.detail);
  bus.addEventListener('change', h);
  return () => bus.removeEventListener('change', h);
}

export function storageBytes() {
  try { return new Blob([localStorage.getItem(KEY) ?? '']).size; } catch { return 0; }
}

/** Restore demo content; keeps appearance preferences. */
export function resetDemo() {
  const f = fresh();
  Object.assign(state, { ...f, prefs: state.prefs });
  flush();
}

/** Delete everything and stop saving (caller reloads the page). */
export function wipe() {
  wiped = true;
  clearTimeout(timer);
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}

export const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function logActivity(text) {
  state.activity.unshift({ t: Date.now(), text });
  state.activity.length = Math.min(state.activity.length, 40);
  commit('activity');
}
