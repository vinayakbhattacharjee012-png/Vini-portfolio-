import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Message } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { schedule } from '../core/scheduler.js';
import type { Deps, Handler, Module } from '../core/types.js';
import { bumpScore, card, eph, pick, rnd } from './util.js';

export const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const NAMES: string[][] = [
  ['Mosslet', 'Emberpup', 'Drizzlet', 'Pebblin', 'Sprigling', 'Gustkit', 'Burrowl', 'Fluffin', 'Dewbug', 'Cindermoth', 'Puddlefin', 'Thistlet', 'Nibbler', 'Glowcap', 'Snowpuff', 'Sandscamp'],
  ['Thornwolf', 'Tidecrab', 'Voltfox', 'Frostowl', 'Ashstag', 'Gloomcat', 'Quillboar', 'Mistfawn', 'Rustbeetle', 'Cragbear'],
  ['Stormhawk', 'Moonmoth', 'Magmapede', 'Glacierhorn', 'Duskpanther', 'Coralisk', 'Sunstag'], ['Aurorawyrm', 'Voidstalker', 'Tempestdrake', 'Eclipsefox'], ['Solarion', 'Lunaris', 'Umbrion']];
export const SPECIES = NAMES.flatMap((l, r) => l.map((name) => ({ name, r })));
const WEIGHT = [60, 25, 10, 4, 1], CATCH = [0.8, 0.6, 0.4, 0.25, 0.12];
export const statsOf = (idx: number) => { const s = SPECIES[idx], b = 1 + s.r * 0.45; return { hp: Math.round((40 + (idx * 7) % 15) * b), atk: Math.round((10 + (idx * 5) % 6) * b), def: Math.round((6 + (idx * 3) % 5) * b), spd: 5 + ((idx * 11) % 9) }; };
export const rollSpecies = (r: () => number = Math.random, force?: number) => {
  const tier = force ?? (() => { let x = r() * 100; for (let t = 0; t < 5; t++) { if ((x -= WEIGHT[t]) < 0) return t; } return 0; })();
  const pool = SPECIES.map((s, i) => [s, i] as const).filter(([s]) => s.r === tier); return pool[Math.floor(r() * pool.length)][1];
};
export const catchChance = (rarity: number, pity: number) => Math.min(0.95, CATCH[rarity] + Math.min(0.3, 0.03 * pity));

// ── pure turn-based battle engine ────────────────────────────────────────────
export interface Fighter { idx: number; hp: number; max: number; atk: number; def: number; spd: number }
export interface BState { teams: [Fighter[], Fighter[]]; active: [number, number]; turn: 0 | 1; guard: [boolean, boolean]; log: string; winner: 0 | 1 | null }
const fighter = (idx: number): Fighter => { const s = statsOf(idx); return { idx, hp: s.hp, max: s.hp, atk: s.atk, def: s.def, spd: s.spd }; };
export function startBattle(a: number[], b: number[]): BState {
  const t: [Fighter[], Fighter[]] = [a.map(fighter), b.map(fighter)];
  return { teams: t, active: [0, 0], turn: t[1][0].spd > t[0][0].spd ? 1 : 0, guard: [false, false], log: 'Battle start!', winner: null };
}
export function act(s: BState, action: 'atk' | 'spc' | 'grd', r: () => number = Math.random): BState {
  if (s.winner !== null) return s;
  const me = s.turn, foe = (1 - me) as 0 | 1, A = s.teams[me][s.active[me]], D = s.teams[foe][s.active[foe]], n = (i: number) => SPECIES[i].name;
  s.guard[me] = false;
  if (action === 'grd') { s.guard[me] = true; s.log = `${n(A.idx)} braces!`; }
  else {
    const hit = action === 'atk' || r() < 0.7;
    if (!hit) s.log = `${n(A.idx)}'s special missed!`;
    else { let dmg = Math.max(1, Math.round(A.atk * (action === 'spc' ? 1.8 : 1) * (0.85 + 0.15 * r()) - D.def * 0.5)); if (s.guard[foe]) { dmg = Math.max(1, Math.floor(dmg / 2)); s.guard[foe] = false; }
      D.hp = Math.max(0, D.hp - dmg); s.log = `${n(A.idx)} ${action === 'spc' ? 'unleashes a special on' : 'hits'} ${n(D.idx)} for ${dmg}!`; }
    if (D.hp === 0) { const nx = s.teams[foe].findIndex((f) => f.hp > 0); if (nx < 0) { s.winner = me; s.log += ` ${n(D.idx)} fainted — victory!`; } else { s.active[foe] = nx; s.log += ` ${n(D.idx)} fainted, ${n(s.teams[foe][nx].idx)} steps in.`; } }
  }
  if (s.winner === null) s.turn = foe; return s;
}

// ── persistence ─────────────────────────────────────────────────────────────
interface Prof { coll: Record<number, number>; pity: number; team: number[]; caught: number }
const prof = (st: Deps['store'], gid: string, uid: string): Prof => st.get<Prof>('ac', `${gid}:${uid}`) ?? { coll: {}, pity: 0, team: [], caught: 0 };
const save = (st: Deps['store'], gid: string, uid: string, p: Prof) => st.set('ac', `${gid}:${uid}`, p);
const owns = (p: Prof, i: number) => (p.coll[i] ?? 0) > 0;
const kb = (...b: ButtonBuilder[]) => new ActionRowBuilder<ButtonBuilder>().addComponents(b);
const btn = (id: string, l: string, s = ButtonStyle.Primary) => new ButtonBuilder().setCustomId(id).setLabel(l).setStyle(s);
const em = (i: number) => `**${SPECIES[i].name}** (${RARITY[SPECIES[i].r]})`;

async function spawn(d: Deps, ch: any, gid: string, force?: number) {
  const idx = rollSpecies(Math.random, force), st = statsOf(idx);
  const m = await ch.send({ embeds: [card('🌿 A wild creature appeared!', `${em(idx)}\nHP ${st.hp} · ATK ${st.atk} · DEF ${st.def} · SPD ${st.spd}\nIt will flee in 90 seconds…`, 0x57f287)], components: [kb(btn('anicatch:catch', '🎯 Catch'))] });
  d.store.set('acspawn', m.id, { idx, gid, ch: ch.id }); schedule(d, { at: Date.now() + 90_000, kind: 'flee', module: 'anicatch', guildId: gid, data: { id: m.id, ch: ch.id } });
}
const view = (s: BState, ids: string[]) => ({ embeds: [card('⚔️ AniCatch battle', s.teams.map((t, k) => `<@${ids[k]}>${s.winner === k ? ' 🏆' : ''}\n${t.map((f, i) => `${i === s.active[k] && f.hp > 0 ? '▶' : '·'} ${SPECIES[f.idx].name} ${f.hp}/${f.max}`).join('\n')}`).join('\n\n') + `\n\n${s.log}\n${s.winner === null ? `Turn: <@${ids[s.turn]}>` : ''}`)],
  components: s.winner === null ? [kb(btn('anicatch:b:atk', 'Attack'), btn('anicatch:b:spc', 'Special (70%)'), btn('anicatch:b:grd', 'Guard', ButtonStyle.Secondary))] : [], allowedMentions: { parse: [] as never[] } });

export const H: Record<string, Handler> = {
  async spawn(c) { await spawn({ client: c.client, store: c.store } as any, c.channel, c.guild.id, c.a.rarity ? RARITY.indexOf(c.a.rarity) : undefined); return eph('Spawned.'); },
  async config(c) { c.store.set('cfg:anicatch', c.guild.id, { ch: c.a.channel.id, every: Number(c.a.every ?? 30) }); return `✅ Spawns in ${c.a.channel} roughly every ${c.a.every ?? 30} messages.`; },
  async collection(c) {
    const u = c.a.user ?? c.actor.user, p = prof(c.store, c.guild.id, u.id), f = c.a.rarity && c.a.rarity !== 'all' ? RARITY.indexOf(c.a.rarity) : -1;
    const rows = Object.entries(p.coll).filter(([i, n]) => n > 0 && (f < 0 || SPECIES[+i].r === f)).map(([i, n]) => `#${i} ${em(+i)} ×${n}`);
    return { embeds: [card(`${u.username}'s collection (${rows.length}/${SPECIES.length})`, rows.join('\n') || 'Nothing yet.')], allowedMentions: { parse: [] } };
  },
  async dex(c) {
    const p = prof(c.store, c.guild.id, c.actor.id), pg = Math.max(1, Number(c.a.page ?? 1)), sl = SPECIES.map((s, i) => `${owns(p, i) ? '✅' : '⬜'} #${i} ${owns(p, i) ? s.name : '???'} — ${RARITY[s.r]}`).slice((pg - 1) * 10, pg * 10);
    return { embeds: [card(`Dex page ${pg}/${Math.ceil(SPECIES.length / 10)} · ${Object.keys(p.coll).length}/${SPECIES.length}`, sl.join('\n') || 'Empty page.')] };
  },
  async pity(c) { const p = prof(c.store, c.guild.id, c.actor.id); return `🍀 Pity: **${p.pity}** failed catches → +${Math.min(30, p.pity * 3)}% catch chance (max +30%). Resets on a successful catch.`; },
  async team(c) {
    const p = prof(c.store, c.guild.id, c.actor.id), i = Number(c.a.creature), s = Number(c.a.slot); if (!SPECIES[i] || !owns(p, i)) return 'You do not own that creature (see `/anicatch collection`).';
    if (p.team.some((x, k) => x === i && k !== s - 1)) return 'Already on your team.'; p.team[s - 1] = i; p.team = p.team.filter((x) => x !== undefined && x !== null); save(c.store, c.guild.id, c.actor.id, p);
    return `✅ Team: ${p.team.map((x) => SPECIES[x].name).join(', ')}`;
  },
  async battle(c) {
    const o = c.a.user; if (o.bot || o.id === c.actor.id) return 'Pick another human.'; if (!prof(c.store, c.guild.id, c.actor.id).team.length) return 'Set a team first: `/anicatch team`.';
    const m = await (c.channel as any).send({ content: `${o}, **${c.actor.user.username}** challenges you to a battle!`, components: [kb(btn('anicatch:bacc', 'Accept', ButtonStyle.Success))], allowedMentions: { users: [o.id] } });
    c.store.set('abattle', m.id, { ids: [c.actor.id, o.id], s: null }); return eph('Challenge sent.');
  },
  async trade(c) {
    const p = prof(c.store, c.guild.id, c.actor.id), o = c.a.user; if (o.bot || o.id === c.actor.id) return 'Pick another human.'; if (!owns(p, Number(c.a.mine))) return 'You do not own that creature.'; if (!SPECIES[Number(c.a.theirs)]) return 'Bad creature id.';
    const id = randomUUID().slice(0, 8); c.store.set('actrade', id, { gid: c.guild.id, a: c.actor.id, b: o.id, mine: Number(c.a.mine), theirs: Number(c.a.theirs), exp: Date.now() + 300_000 });
    return { content: `${o}: swap your ${em(Number(c.a.theirs))} for ${c.actor.user.username}'s ${em(Number(c.a.mine))}?`, components: [kb(btn(`anicatch:tr:${id}`, 'Accept', ButtonStyle.Success))], allowedMentions: { users: [o.id] } };
  },
  async 'anicatch.top'(c) {
    const rows = c.store.entries<Prof>('ac', `${c.guild.id}:`).map(([k, p]) => [k.split(':')[1], Object.keys(p.coll).length, p.caught] as const).sort((a, b) => b[1] - a[1] || b[2] - a[2]).slice(0, 10);
    return { embeds: [card('🏆 AniCatch', rows.map(([id, n, t], i) => `${i + 1}. <@${id}> — ${n} species · ${t} catches`).join('\n') || 'No catches yet.')], allowedMentions: { parse: [] } };
  },
};

export const component: Module['component'] = async (i, d) => {
  const [, k, arg] = i.customId.split(':'), gid = i.guildId;
  if (k === 'catch') {
    const sp = d.store.get<any>('acspawn', i.message.id); if (!sp) return void i.reply(eph('It already got away.'));
    const p = prof(d.store, gid, i.user.id), r = SPECIES[sp.idx].r;
    if (Math.random() < catchChance(r, p.pity)) { p.coll[sp.idx] = (p.coll[sp.idx] ?? 0) + 1; p.pity = 0; p.caught++; save(d.store, gid, i.user.id, p); d.store.del('acspawn', i.message.id); bumpScore(d.store, gid, 'anicatch', i.user.id);
      return void i.update({ embeds: [card('🎉 Caught!', `<@${i.user.id}> caught ${em(sp.idx)}!`, 0xfee75c)], components: [] }); }
    p.pity++; save(d.store, gid, i.user.id, p);
    if (Math.random() < 0.25) { d.store.del('acspawn', i.message.id); return void i.update({ embeds: [card('💨 It fled!', `${em(sp.idx)} escaped.`)], components: [] }); }
    return void i.reply(eph(`It broke free! Pity ${p.pity} (+${Math.min(30, p.pity * 3)}% next time).`));
  }
  if (k === 'tr') {
    const t = d.store.get<any>('actrade', arg); if (!t || t.exp < Date.now()) return void i.reply(eph('Offer expired.')); if (i.user.id !== t.b) return void i.reply(eph('Not for you.'));
    const a = prof(d.store, gid, t.a), b = prof(d.store, gid, t.b); if (!owns(a, t.mine) || !owns(b, t.theirs)) return void i.reply(eph('Someone no longer owns their creature.'));
    a.coll[t.mine]--; b.coll[t.theirs]--; a.coll[t.theirs] = (a.coll[t.theirs] ?? 0) + 1; b.coll[t.mine] = (b.coll[t.mine] ?? 0) + 1;
    a.team = a.team.filter((x) => owns(a, x)); b.team = b.team.filter((x) => owns(b, x)); save(d.store, gid, t.a, a); save(d.store, gid, t.b, b); d.store.del('actrade', arg);
    return void i.update({ content: `✅ Trade complete: ${em(t.mine)} ⇄ ${em(t.theirs)}`, components: [] });
  }
  const bt = d.store.get<any>('abattle', i.message.id); if (!bt) return void i.reply(eph('Battle not found.'));
  if (k === 'bacc') {
    if (i.user.id !== bt.ids[1]) return void i.reply(eph('Only the challenged player can accept.')); const tb = prof(d.store, gid, bt.ids[1]).team, ta = prof(d.store, gid, bt.ids[0]).team;
    if (!tb.length) return void i.reply(eph('Set a team first: `/anicatch team`.')); bt.s = startBattle(ta, tb);
  } else if (k === 'b' && bt.s) {
    if (i.user.id !== bt.ids[bt.s.turn]) return void i.reply(eph('Not your turn.')); act(bt.s, arg as any);
    if (bt.s.winner !== null) { bumpScore(d.store, gid, 'anicatch', bt.ids[bt.s.winner], 2); d.store.del('abattle', i.message.id); return void i.update(view(bt.s, bt.ids)); }
  } else return;
  d.store.set('abattle', i.message.id, bt); await i.update(view(bt.s, bt.ids));
};

export const jobs: Module['jobs'] = {
  async flee(j, d) {
    const sp = d.store.get<any>('acspawn', j.data.id); if (!sp) return; d.store.del('acspawn', j.data.id);
    const m = await (d.client.channels.cache.get(j.data.ch) as any)?.messages.fetch(j.data.id).catch(() => null);
    await m?.edit({ embeds: [card('💨 It fled!', `${em(sp.idx)} slipped away.`)], components: [] }).catch(() => {});
  },
};

const counters = new Map<string, number>();
export const hook: Module['hook'] = (d) => {
  d.client.on('messageCreate', async (m: Message) => {
    if (!m.inGuild() || m.author.bot) return;
    const cfg = d.store.get<any>('cfg:anicatch', m.guildId); if (!cfg || m.channelId !== cfg.ch) return;
    const n = (counters.get(m.guildId) ?? 0) + 1; if (n < cfg.every * (0.7 + Math.random() * 0.6)) return void counters.set(m.guildId, n);
    counters.set(m.guildId, 0); await spawn(d, m.channel, m.guildId);
  });
};
void pick; void rnd;
