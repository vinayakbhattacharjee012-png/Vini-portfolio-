// App metadata shared by the shell, launcher, palette and NEXUS. Pure data — no DOM.
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONS = {
  nexus: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>'),
  notes: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
  files: svg('<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  calculator: svg('<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>'),
  monitor: svg('<path d="M3 12h4l3-7 4 14 3-7h4"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  grid: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  bell: svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  wifi: svg('<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a14.5 14.5 0 0 1 20 0"/>'),
  wifiOff: svg('<path d="m2 2 20 20M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M5 12.5a10 10 0 0 1 5-2.7M19 12.5a10 10 0 0 0-2.2-1.6M2 9a14.5 14.5 0 0 1 4.5-2.8M22 9a14.5 14.5 0 0 0-10-4"/>'),
  battery: svg('<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  min: svg('<path d="M6 12h12"/>'),
  max: svg('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
  restore: svg('<rect x="4" y="8" width="12" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  send: svg('<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>'),
  doc: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'),
  folder: svg('<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
};

export const APPS = [
  { id: 'nexus', name: 'NEXUS', category: 'Intelligence', desc: 'Command center and assistant', keywords: ['assistant', 'ai', 'command', 'chat', 'nexus'], size: [560, 600] },
  { id: 'notes', name: 'Notes', category: 'Productivity', desc: 'Write and organise notes', keywords: ['note', 'notes', 'write', 'text', 'memo'], size: [760, 520] },
  { id: 'files', name: 'Files', category: 'Productivity', desc: 'Browse your workspace', keywords: ['file', 'files', 'explorer', 'finder', 'documents', 'folder'], size: [680, 460] },
  { id: 'calculator', name: 'Calculator', category: 'Utilities', desc: 'Expressions and history', keywords: ['calc', 'calculator', 'math', 'maths'], size: [340, 520] },
  { id: 'monitor', name: 'System Monitor', category: 'System', desc: 'Live session status', keywords: ['system', 'status', 'monitor', 'performance', 'cpu', 'memory', 'stats'], size: [560, 500] },
  { id: 'settings', name: 'Settings', category: 'System', desc: 'Appearance and data', keywords: ['settings', 'preferences', 'config', 'theme', 'appearance', 'reset'], size: [600, 540] },
];

export const appById = (id) => APPS.find((a) => a.id === id);

/** Best app match for free text ("open the file explorer" → files). */
export function findApp(text) {
  const q = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  if (!q) return null;
  const words = q.split(/\s+/);
  return APPS.find((a) => a.name.toLowerCase() === q || a.id === q)
    || APPS.find((a) => words.some((w) => a.keywords.includes(w)))
    || APPS.find((a) => a.name.toLowerCase().startsWith(q))
    || null;
}
