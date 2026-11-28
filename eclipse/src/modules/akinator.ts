import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Handler, Module } from '../core/types.js';
import { bumpScore, card, eph } from './util.js';

/** Attribute questions. A character "has" an attribute if its code appears in its trait string. */
export const ATTRS: Record<string, string> = {
  video: 'Is your character from a video game?', anime: 'Is your character from an anime or manga?', movie: 'Is your character from a movie?',
  human: 'Is your character human?', hero: 'Is your character a hero (a good guy)?', female: 'Is your character female?', fly: 'Can your character fly or levitate?',
  hat: 'Does your character wear a hat, mask or helmet?', blade: 'Is your character known for a sword or blade?', magic: 'Does your character have superpowers or magic?',
  creature: 'Is your character an animal or non-human creature?', teen: 'Is your character a child or teenager?', hair: 'Does your character have spiky or unusual hair?',
  catch: 'Does your character have a famous catchphrase?', villain: 'Is your character a villain?', red: 'Does your character wear mostly red?', robot: 'Is your character a robot, AI or machine?', rogue: 'Is your character a pirate, thief or outlaw?',
};
const KEYS = Object.keys(ATTRS);
export const CHARS: [string, string][] = [
  ['Mario', 'video human hero hat red catch'], ['Link', 'video human hero blade hat teen'], ['Pikachu', 'video anime hero creature magic catch'], ['Naruto', 'anime human hero teen hair magic catch'],
  ['Goku', 'anime human hero hair magic fly catch'], ['Luffy', 'anime human hero hat teen rogue catch red'], ['Sonic', 'video creature hero catch'], ['Kirby', 'video creature hero fly'],
  ['Darth Vader', 'movie human villain hat blade magic robot'], ['Batman', 'movie human hero hat'], ['Spider-Man', 'movie human hero magic red teen'], ['Elsa', 'movie human hero female magic'],
  ['Harry Potter', 'movie human hero magic teen'], ['Shrek', 'movie creature hero'], ['WALL-E', 'movie robot hero'], ['Mikasa Ackerman', 'anime human hero female blade teen'],
  ['Light Yagami', 'anime human villain teen'], ['Samus Aran', 'video human hero female robot'], ['Princess Zelda', 'video human hero female magic'], ['Pac-Man', 'video creature hero'],
  ['Master Chief', 'video human hero hat robot'], ['Lara Croft', 'video human hero female rogue'], ['Saitama', 'anime human hero catch'], ['Totoro', 'anime creature hero fly'],
  ['Simba', 'movie creature hero'], ['Woody', 'movie human hero hat catch'], ['Iron Man', 'movie human hero robot fly red hat'], ['The Joker', 'movie human villain catch'],
  ['Hermione Granger', 'movie human hero female magic teen'], ['Ichigo Kurosaki', 'anime human hero blade hair teen magic'], ['Edward Elric', 'anime human hero teen magic'], ['Bowser', 'video creature villain fly red'],
  ['Mewtwo', 'video anime creature villain magic fly'], ['Yoda', 'movie creature hero magic blade catch'], ['Jack Sparrow', 'movie human rogue hat blade catch'], ['Satoru Gojo', 'anime human hero magic hair'],
  ['Tanjiro Kamado', 'anime human hero blade teen magic'], ['Cloud Strife', 'video human hero blade hair'], ['Sailor Moon', 'anime human hero female magic hair teen catch'], ['Ezio Auditore', 'video human hero blade hat rogue'],
];
const has = (c: [string, string], k: string) => c[1].split(' ').includes(k);
const DECKS: Record<string, (c: [string, string]) => boolean> = { all: () => true, anime: (c) => has(c, 'anime'), games: (c) => has(c, 'video'), movies: (c) => has(c, 'movie') };
export const ANS = [1, 0.75, 0.5, 0.25, 0]; // yes, probably, don't know, probably not, no
const ANS_LABEL = ['Yes', 'Probably', "Don't know", 'Probably not', 'No'];

export interface AkiState { deck: string; hist: [string, number][]; rejected: string[] }
export interface AkiView { posterior: [string, number][]; next: string | null; guess: [string, number] | null; confidence: number }

/** Pure Bayesian engine; state is the history so undo/restart are trivial and results are reproducible. */
export function think(s: AkiState): AkiView {
  const pool = CHARS.filter(DECKS[s.deck] ?? DECKS.all).filter((c) => !s.rejected.includes(c[0]));
  let w = pool.map(() => 1);
  for (const [k, a] of s.hist) pool.forEach((c, i) => { const p = has(c, k) ? a : 1 - a; w[i] *= Math.max(0.05, a === 0.5 ? 1 : p); }); // 'don't know' carries no information
  const tot = w.reduce((x, y) => x + y, 0) || 1; w = w.map((x) => x / tot);
  const posterior = pool.map((c, i) => [c[0], w[i]] as [string, number]).sort((a, b) => b[1] - a[1]);
  const asked = new Set(s.hist.map(([k]) => k)); let next: string | null = null, bestScore = 1;
  for (const k of KEYS) { if (asked.has(k)) continue; const py = pool.reduce((x, c, i) => x + (has(c, k) ? w[i] : 0), 0), sc = Math.abs(py - 0.5); if (py > 0.001 && py < 0.999 && sc < bestScore) { bestScore = sc; next = k; } }
  const top = posterior[0] ?? null, confidence = top?.[1] ?? 0;
  const guess = top && (confidence >= 0.8 || s.hist.length >= 14 || !next) ? top : null;
  return { posterior, next, guess, confidence };
}

const render = (s: AkiState) => {
  const v = think(s), mk = (id: string, l: string, st = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(l).setStyle(st);
  if (!v.guess) return { embeds: [card(`🧞 Question ${s.hist.length + 1}`, `**${ATTRS[v.next!]}**\n\nConfidence so far: ${(v.confidence * 100).toFixed(0)}% · top: ${v.posterior.slice(0, 3).map(([n, p]) => `${n} ${(p * 100).toFixed(0)}%`).join(', ')}`)],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(ANS_LABEL.map((l, i) => mk(`akinator:a:${i}`, l, i === 0 ? ButtonStyle.Success : i === 4 ? ButtonStyle.Danger : ButtonStyle.Secondary))),
      new ActionRowBuilder<ButtonBuilder>().addComponents(mk('akinator:undo', '↩ Undo'), mk('akinator:restart', '🔄 Restart'))] };
  return { embeds: [card(`🧞 Is it **${v.guess[0]}**?`, `Confidence ${(v.confidence * 100).toFixed(0)}% after ${s.hist.length} answers.`)],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(mk('akinator:gy', 'Yes, correct!', ButtonStyle.Success), mk('akinator:gn', 'No', ButtonStyle.Danger), mk('akinator:undo', '↩ Undo'))] };
};

export const H: Record<string, Handler> = {
  async start(c) {
    const s: AkiState = { deck: String(c.a.deck ?? 'all'), hist: [], rejected: [] };
    const m = await (c.channel as any).send({ content: `<@${c.actor.id}>`, allowedMentions: { users: [c.actor.id] }, ...render(s) }); c.store.set('aki', m.id, { uid: c.actor.id, ...s });
    return eph('Think of a character (fictional) — I will guess!');
  },
};

export const component: Module['component'] = async (i, d) => {
  const st = d.store.get<AkiState & { uid: string }>('aki', i.message.id);
  if (!st || st.uid !== i.user.id) return void i.reply(eph('This game belongs to someone else (or expired).'));
  const [, k, arg] = i.customId.split(':');
  if (k === 'a') { const v = think(st); if (v.next) st.hist.push([v.next, ANS[Number(arg)]]); }
  else if (k === 'undo') { if (think(st).guess && st.hist.length === 0) st.rejected.pop(); else st.hist.pop(); }
  else if (k === 'restart') { st.hist = []; st.rejected = []; }
  else if (k === 'gy') { bumpScore(d.store, i.guildId, 'akinator', i.user.id); d.store.del('aki', i.message.id); return void i.update({ embeds: [card('🎉 Got it!', `It was **${think(st).guess?.[0]}**.`)], components: [] }); }
  else if (k === 'gn') { const g = think(st).guess; if (g) st.rejected.push(g[0]); if (!think(st).posterior.length) { d.store.del('aki', i.message.id); return void i.update({ embeds: [card('🤔 I give up', 'Nobody in my database matches. You win!')], components: [] }); } }
  d.store.set('aki', i.message.id, st); await i.update(render(st));
};
