import { ActionRowBuilder, ButtonBuilder, ButtonStyle, LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import type { Handler, Module } from '../core/types.js';
import { bumpScore, card, eph, pick, rnd } from './util.js';

const btn = (id: string, label: string, style = ButtonStyle.Primary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const row = (...b: ButtonBuilder[]) => new ActionRowBuilder<ButtonBuilder>().addComponents(b);

export const TRIVIA: { q: string; a: string[]; c: number; cat: string; d: string }[] = [
  { q: 'What planet is known as the Red Planet?', a: ['Venus', 'Mars', 'Jupiter', 'Mercury'], c: 1, cat: 'science', d: 'easy' },
  { q: 'What gas do plants absorb for photosynthesis?', a: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], c: 2, cat: 'science', d: 'easy' },
  { q: 'What is the chemical symbol for gold?', a: ['Ag', 'Au', 'Gd', 'Go'], c: 1, cat: 'science', d: 'medium' },
  { q: 'Who developed the theory of general relativity?', a: ['Newton', 'Bohr', 'Einstein', 'Tesla'], c: 2, cat: 'science', d: 'medium' },
  { q: 'What is the powerhouse of the cell?', a: ['Ribosome', 'Mitochondrion', 'Nucleus', 'Golgi'], c: 1, cat: 'science', d: 'easy' },
  { q: 'In which year did World War II end?', a: ['1943', '1945', '1947', '1950'], c: 1, cat: 'history', d: 'easy' },
  { q: 'Who was the first emperor of Rome?', a: ['Julius Caesar', 'Nero', 'Augustus', 'Trajan'], c: 2, cat: 'history', d: 'medium' },
  { q: 'Which empire built Machu Picchu?', a: ['Aztec', 'Maya', 'Inca', 'Olmec'], c: 2, cat: 'history', d: 'medium' },
  { q: 'The Magna Carta was sealed in which year?', a: ['1066', '1215', '1348', '1492'], c: 1, cat: 'history', d: 'hard' },
  { q: 'What is the capital of Australia?', a: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], c: 2, cat: 'geography', d: 'easy' },
  { q: 'Which is the longest river in Africa?', a: ['Congo', 'Niger', 'Nile', 'Zambezi'], c: 2, cat: 'geography', d: 'medium' },
  { q: 'Which country has the most time zones (incl. territories)?', a: ['Russia', 'USA', 'France', 'China'], c: 2, cat: 'geography', d: 'hard' },
  { q: 'What does CPU stand for?', a: ['Central Processing Unit', 'Core Power Unit', 'Computer Primary Unit', 'Central Program Utility'], c: 0, cat: 'tech', d: 'easy' },
  { q: 'Which language runs natively in web browsers?', a: ['Python', 'Rust', 'JavaScript', 'Go'], c: 2, cat: 'tech', d: 'easy' },
  { q: 'What does HTTP status 404 mean?', a: ['Forbidden', 'Not Found', 'Server Error', 'Moved'], c: 1, cat: 'tech', d: 'easy' },
  { q: 'Which data structure uses LIFO order?', a: ['Queue', 'Stack', 'Heap', 'Graph'], c: 1, cat: 'tech', d: 'medium' },
  { q: 'What is the time complexity of binary search?', a: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], c: 1, cat: 'tech', d: 'medium' },
  { q: 'Which company created the Minecraft game originally?', a: ['Mojang', 'Valve', 'Epic', 'Riot'], c: 0, cat: 'games', d: 'easy' },
  { q: 'In chess, which piece can only move diagonally?', a: ['Rook', 'Knight', 'Bishop', 'Pawn'], c: 2, cat: 'games', d: 'easy' },
  { q: 'What year was the original Pac-Man released?', a: ['1978', '1980', '1983', '1985'], c: 1, cat: 'games', d: 'hard' },
  { q: 'Which studio produced "Spirited Away"?', a: ['Toei', 'Madhouse', 'Studio Ghibli', 'Bones'], c: 2, cat: 'anime', d: 'easy' },
  { q: 'Who is the author of the manga "One Piece"?', a: ['Eiichiro Oda', 'Masashi Kishimoto', 'Akira Toriyama', 'Hajime Isayama'], c: 0, cat: 'anime', d: 'medium' },
  { q: 'How many strings does a standard guitar have?', a: ['4', '5', '6', '7'], c: 2, cat: 'music', d: 'easy' },
  { q: 'Which composer wrote the "Moonlight Sonata"?', a: ['Mozart', 'Beethoven', 'Bach', 'Chopin'], c: 1, cat: 'music', d: 'medium' },
  { q: 'What is the largest ocean on Earth?', a: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], c: 2, cat: 'general', d: 'easy' },
  { q: 'How many continents are there?', a: ['5', '6', '7', '8'], c: 2, cat: 'general', d: 'easy' },
  { q: 'What is the smallest prime number?', a: ['0', '1', '2', '3'], c: 2, cat: 'general', d: 'medium' },
];
export const rpsResult = (a: string, b: string) => (a === b ? 'tie' : ({ rock: 'scissors', paper: 'rock', scissors: 'paper' } as Record<string, string>)[a] === b ? 'win' : 'lose');
const best = (c: Parameters<Handler>[0], game: string, uid: string, n: number) => c.store.upd<Record<string, number>>('scores', `${c.guild.id}:${game}`, () => ({}), (v) => { v[uid] = Math.max(v[uid] ?? 0, n); });

export const H: Record<string, Handler> = {
  async toss(c) {
    const res = pick(['heads', 'tails']), call = c.a.call && String(c.a.call).toLowerCase();
    if (call) { if (call === res) bumpScore(c.store, c.guild.id, 'toss', c.actor.id); return `🪙 **${res}** — ${call === res ? 'you called it! ✅' : 'missed ❌'}`; } return `🪙 **${res}**`;
  },
  async streak(c) { const m = await (c.channel as any).send({ content: `🔥 ${c.actor}: streak **0**. Call the next toss!`, components: [row(btn('games:st:heads', 'Heads'), btn('games:st:tails', 'Tails'))], allowedMentions: { users: [c.actor.id] } }); c.store.set('streak', m.id, { uid: c.actor.id, n: 0 }); return eph('Started!'); },
  async dice(c) { const s = Math.min(1000, Math.max(2, Number(c.a.sides ?? 6))), n = Math.min(10, Math.max(1, Number(c.a.count ?? 1))), r = Array.from({ length: n }, () => 1 + rnd(s)); return `🎲 d${s}×${n}: ${r.join(', ')}${n > 1 ? ` = **${r.reduce((x, y) => x + y)}**` : ''}`; },
  async rps(c) {
    const me = pick(['rock', 'paper', 'scissors']), you = String(c.a.pick).toLowerCase(); if (!['rock', 'paper', 'scissors'].includes(you)) return 'rock|paper|scissors';
    const r = rpsResult(you, me); if (r === 'win') bumpScore(c.store, c.guild.id, 'rps', c.actor.id); return `You **${you}** vs me **${me}** — ${r === 'win' ? 'you win 🎉' : r === 'lose' ? 'I win 😎' : 'tie'}`;
  },
  async trivia(c) {
    let pool = TRIVIA.filter((t) => (!c.a.category || t.cat === c.a.category) && (!c.a.difficulty || t.d === c.a.difficulty)); if (!pool.length) pool = TRIVIA;
    const idx = TRIVIA.indexOf(pick(pool)), t = TRIVIA[idx];
    const m = await (c.channel as any).send({ embeds: [card(`🧠 ${t.q}`, `Category **${t.cat}** · ${t.d}`)], components: [row(...t.a.map((x, i) => btn(`games:tv:${i}`, x.slice(0, 70))))] });
    c.store.set('trivia', m.id, { uid: c.actor.id, idx }); return eph('Question posted — only you can answer it.');
  },
  async duel(c) {
    const o = c.a.user, mx = Math.min(1000, Math.max(5, Number(c.a.max ?? 100))); if (o.bot || o.id === c.actor.id) return 'Pick another human.';
    const m = await (c.channel as any).send({ content: `⚔️ ${c.actor} vs ${o}: pick a number 1–${mx}. Closest to my secret number wins!`, components: [row(btn('games:dp', 'Enter my number'))], allowedMentions: { users: [o.id, c.actor.id] } });
    c.store.set('duel', m.id, { a: c.actor.id, b: o.id, mx, picks: {}, target: 1 + rnd(mx) }); return eph('Duel posted.');
  },
  async 'game.top'(c) {
    const g = String(c.a.game ?? 'toss'), rows = Object.entries(c.store.get<Record<string, number>>('scores', `${c.guild.id}:${g}`) ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { embeds: [card(`🏆 ${g}`, rows.map(([id, v], i) => `${i + 1}. <@${id}> — ${v}`).join('\n') || 'No scores yet.')], allowedMentions: { parse: [] } };
  },
};

export const component: Module['component'] = async (i, d) => {
  const [, kind, arg] = i.customId.split(':'), gid = i.guildId;
  if (kind === 'st') {
    const s = d.store.get<any>('streak', i.message.id); if (!s || s.uid !== i.user.id) return void i.reply(eph('This streak is not yours.'));
    if (pick(['heads', 'tails']) === arg) { s.n++; d.store.set('streak', i.message.id, s); return void i.update({ content: `🔥 <@${i.user.id}>: streak **${s.n}**. Call the next toss!` }); }
    d.store.upd<Record<string, number>>('scores', `${gid}:streak`, () => ({}), (v) => { v[i.user.id] = Math.max(v[i.user.id] ?? 0, s.n); }); d.store.del('streak', i.message.id);
    return void i.update({ content: `💥 <@${i.user.id}> missed. Final streak: **${s.n}**.`, components: [] });
  }
  if (kind === 'tv') {
    const s = d.store.get<any>('trivia', i.message.id); if (!s || s.uid !== i.user.id) return void i.reply(eph('Only the asker can answer.'));
    const t = TRIVIA[s.idx], ok = Number(arg) === t.c; d.store.del('trivia', i.message.id); if (ok) bumpScore(d.store, gid, 'trivia', i.user.id);
    return void i.update({ embeds: [card(`🧠 ${t.q}`, `${ok ? '✅ Correct!' : '❌ Wrong.'} Answer: **${t.a[t.c]}**`)], components: [] });
  }
  if (kind === 'dp') {
    const s = d.store.get<any>('duel', i.message.id); if (!s || ![s.a, s.b].includes(i.user.id)) return void i.reply(eph('Not your duel.'));
    return void i.showModal(new ModalBuilder().setCustomId(`games:dm:${i.message.id}`).setTitle('Number duel').addLabelComponents(new LabelBuilder().setLabel(`Your number (1–${s.mx})`).setTextInputComponent(new TextInputBuilder().setCustomId('n').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(5).setRequired(true))));
  }
  if (kind === 'dm' && i.isModalSubmit()) {
    const s = d.store.get<any>('duel', arg); if (!s || ![s.a, s.b].includes(i.user.id)) return void i.reply(eph('Duel not found.'));
    const n = Number(i.fields.getTextInputValue('n')); if (!Number.isInteger(n) || n < 1 || n > s.mx) return void i.reply(eph(`Enter a whole number 1–${s.mx}.`));
    if (s.picks[i.user.id]) return void i.reply(eph('You already picked.')); s.picks[i.user.id] = n; d.store.set('duel', arg, s);
    await i.reply(eph(`Locked in **${n}**.`)); if (Object.keys(s.picks).length < 2) return;
    const da = Math.abs(s.picks[s.a] - s.target), db = Math.abs(s.picks[s.b] - s.target), w = da === db ? null : da < db ? s.a : s.b;
    if (w) bumpScore(d.store, gid, 'duel', w); d.store.del('duel', arg);
    const msg = await i.channel?.messages.fetch(arg).catch(() => null); await msg?.edit({ content: `⚔️ Secret **${s.target}** — <@${s.a}> **${s.picks[s.a]}**, <@${s.b}> **${s.picks[s.b]}** → ${w ? `🏆 <@${w}> wins!` : 'tie!'}`, components: [], allowedMentions: { parse: [] } });
  }
};
void best;
