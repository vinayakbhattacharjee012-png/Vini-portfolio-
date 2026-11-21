// NEXUS assistant service.
// A provider is `async (input, ctx) => ({ text, effects?, actions? })`:
//   effects — applied by the shell immediately, e.g. { type: 'open', app: 'notes' }
//   actions — buttons shown under the reply, each { label, effect }
// The shell only ever talks to `ask()`, so swapping providers needs no UI changes.
import { APPS, findApp, appById } from './registry.js';
import { evaluate, formatNumber } from './calc.js';

export const SUGGESTIONS = ['help', 'open notes', 'show system status', 'create a note Plan launch: draft the checklist', 'calculate (42 * 1.2) ^ 2', 'search my notes for welcome'];

const reply = (text, extra = {}) => ({ text, effects: [], actions: [], ...extra });

/** Deterministic, offline demo provider. Clearly not an AI model. */
export async function localProvider(raw, ctx) {
  const input = raw.trim();
  const q = input.toLowerCase().replace(/[?!.]+$/, '');
  let m;

  if (!q) return reply('Type a command, or try "help".');

  if (/^(help|commands|\?|what can you do)/.test(q)) {
    return reply(
      'Local demo mode — I understand these commands:\n' +
      '• open / close <app> — ' + APPS.map((a) => a.name).join(', ') + '\n' +
      '• show system status\n' +
      '• create a note <title>: <body>\n' +
      '• calculate <expression>\n' +
      '• search my notes <words>\n' +
      '• list notes · time · clear',
      { actions: SUGGESTIONS.slice(1, 4).map((s) => ({ label: s, effect: { type: 'ask', text: s } })) },
    );
  }

  if (/^(hi|hello|hey|yo)\b/.test(q)) return reply('Hello. NEXUS is online in local demo mode. Try "help" to see what I can do.');

  if (/^(clear|reset chat|clear chat)$/.test(q)) return reply('', { effects: [{ type: 'clearChat' }] });

  if ((m = q.match(/^(?:open|launch|start|run|show me)\s+(?:the\s+|my\s+)?(.+)$/)) && !/status/.test(m[1])) {
    const app = findApp(m[1]);
    if (!app) return reply(`I couldn't find an app called "${m[1]}". Installed: ${APPS.map((a) => a.name).join(', ')}.`);
    return reply(`Opening ${app.name}.`, { effects: [{ type: 'open', app: app.id }] });
  }

  if ((m = q.match(/^(?:close|quit|exit)\s+(?:the\s+)?(.+)$/))) {
    const app = findApp(m[1]);
    if (!app) return reply(`No app matches "${m[1]}".`);
    return reply(`Closing ${app.name}.`, { effects: [{ type: 'close', app: app.id }] });
  }

  if (/\b(system status|status|system|diagnostics|health)\b/.test(q) && !/note/.test(q)) {
    const s = ctx.system;
    return reply(
      `System status\n` +
      `• Uptime: ${s.uptime}\n` +
      `• Open windows: ${s.openWindows}\n` +
      `• Notes: ${ctx.notes.length}\n` +
      `• Local storage used: ${s.storage}\n` +
      `• Network: ${s.online ? 'online' : 'offline'} (browser-reported)\n` +
      `• Battery: ${s.battery}`,
      { actions: [{ label: 'Open System Monitor', effect: { type: 'open', app: 'monitor' } }] },
    );
  }

  if ((m = input.match(/^(?:create|make|add|new|write)\s+(?:a\s+)?(?:new\s+)?note\b[\s:,-]*(.*)$/is) || input.match(/^note(?: that|:)\s*(.+)$/is))) {
    const text = m[1].trim();
    if (!text) return reply('What should the note say? e.g. "create a note Groceries: milk, eggs"', { effects: [{ type: 'open', app: 'notes' }] });
    const [title, body] = splitNote(text);
    return reply(`Created note "${title}".`, {
      effects: [{ type: 'createNote', title, body }],
      actions: [{ label: 'Open Notes', effect: { type: 'open', app: 'notes' } }],
    });
  }

  if ((m = q.match(/^(?:search|find|look for)\s+(?:in\s+)?(?:my\s+)?notes?\s*(?:for|about|with|containing)?\s*(.*)$/)) || (m = q.match(/^(?:search|find)\s+(.+?)\s+in\s+(?:my\s+)?notes$/))) {
    const term = m[1].replace(/^["']|["']$/g, '').trim();
    if (!term) return reply('Search for what? e.g. "search my notes for launch"');
    const hits = searchNotes(ctx.notes, term);
    if (!hits.length) return reply(`No notes match "${term}".`);
    return reply(`${hits.length} note${hits.length > 1 ? 's match' : ' matches'} "${term}":\n` + hits.slice(0, 6).map((n) => `• ${n.title}`).join('\n'), {
      actions: hits.slice(0, 4).map((n) => ({ label: n.title, effect: { type: 'open', app: 'notes', payload: { noteId: n.id } } })),
    });
  }

  if (/^(list|show)\s+(?:all\s+|my\s+)?notes$/.test(q)) {
    if (!ctx.notes.length) return reply('You have no notes yet. Try "create a note …".');
    return reply('Your notes:\n' + ctx.notes.map((n) => `• ${n.title}`).join('\n'), { actions: [{ label: 'Open Notes', effect: { type: 'open', app: 'notes' } }] });
  }

  if (/^(what(?:'s| is) the )?(time|date|day)( is it)?( today)?$/.test(q)) {
    const d = ctx.now ?? new Date();
    return reply(d.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  }

  // Explicit "calculate" reports parse errors; "what is …" and bare expressions fall through quietly.
  const explicit = q.match(/^(?:calculate|calc|compute|=)\s*(.+)$/);
  const expr = explicit?.[1] ?? q.match(/^what(?:'s| is)\s+(.+)$/)?.[1] ?? (/\d/.test(q) ? q : null);
  if (expr) {
    try {
      const v = evaluate(expr);
      return reply(`${expr.trim()} = ${formatNumber(v)}`, { actions: [{ label: 'Open Calculator', effect: { type: 'open', app: 'calculator', payload: { expr: expr.trim() } } }] });
    } catch (e) {
      if (explicit) return reply(`I couldn't calculate that: ${e.message}.`);
    }
  }

  const app = findApp(q);
  if (app && q.split(/\s+/).length <= 2) {
    return reply(`Did you mean ${app.name}?`, { actions: [{ label: `Open ${app.name}`, effect: { type: 'open', app: app.id } }] });
  }

  return reply(`I'm a local demo assistant, so I only understand a fixed set of commands. "${input}" isn't one of them yet — try "help".`, {
    actions: [{ label: 'help', effect: { type: 'ask', text: 'help' } }],
  });
}

function splitNote(text) {
  const i = text.indexOf(':');
  if (i > 0 && i <= 80) return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
  const words = text.split(/\s+/);
  return words.length <= 6 ? [text, ''] : [words.slice(0, 6).join(' ') + '…', text];
}

export function searchNotes(notes, term) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  return notes.filter((n) => {
    const hay = `${n.title}\n${n.body}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/**
 * Real-model provider. Point it at YOUR server endpoint, which holds the API key and
 * calls the model; never ship provider keys to the browser. The server should return
 * the same { text, effects, actions } shape (validate effects there and here).
 */
export const remoteProvider = (endpoint) => async (input, ctx) => {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input, context: { apps: APPS.map((a) => a.id), noteTitles: ctx.notes.map((n) => n.title) } }),
  });
  if (!res.ok) throw new Error(`NEXUS server responded ${res.status}`);
  return res.json();
};

const EFFECTS = new Set(['open', 'close', 'createNote', 'clearChat', 'ask']);

/** Single entry point for the shell. Drops malformed effects so a provider can't drive arbitrary UI. */
export async function ask(input, ctx, provider = localProvider) {
  const r = await provider(input, ctx);
  const ok = (e) => e && EFFECTS.has(e.type) && (!e.app || appById(e.app));
  return {
    text: String(r?.text ?? ''),
    effects: (r?.effects ?? []).filter(ok),
    actions: (r?.actions ?? []).filter((a) => a && typeof a.label === 'string' && ok(a.effect)),
  };
}
