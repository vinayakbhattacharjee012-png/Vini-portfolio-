import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callAI } from '../src/modules/ai.js';
import { AI_SETUP_NOTICE } from '../src/core/env.js';
import { checkRole, checkTarget } from '../src/core/hierarchy.js';
import { Limiter } from '../src/core/limiter.js';
import { DEFAULTS, evaluate, tier } from '../src/modules/automod.js';
import { slide } from '../src/modules/security.js';
import { SLOT_PAY, SYMS, slotPayout } from '../src/modules/economy.js';
import { drawWinners } from '../src/modules/tickets.js';
import { ANS, CHARS, think, type AkiState } from '../src/modules/akinator.js';
import { SPECIES, act, catchChance, rollSpecies, startBattle } from '../src/modules/anicatch.js';
import { audioStatus } from '../src/modules/music.js';
import { rpsResult } from '../src/modules/games.js';
import { Store } from '../src/storage/store.js';

const m = (id: string, pos: number) => ({ id, roles: { highest: { position: pos } } });
const g = (bot: number) => ({ ownerId: 'owner', id: 'gid', members: { me: m('bot', bot) } });

test('hierarchy: never above actor or bot, never owner/self', () => {
  assert.equal(checkTarget(g(10), m('a', 5), m('t', 3)), null);
  assert.match(checkTarget(g(10), m('a', 5), m('t', 5))!, /equal to or above yours/);
  assert.match(checkTarget(g(4), m('a', 9), m('t', 5))!, /above mine/);
  assert.match(checkTarget(g(10), m('a', 5), m('owner', 1))!, /owner/);
  assert.match(checkTarget(g(10), m('a', 5), m('a', 1))!, /yourself/);
  assert.match(checkRole(g(10), m('a', 5), { id: 'r', position: 7, managed: false })!, /above/);
  assert.match(checkRole(g(10), m('a', 5), { id: 'r', position: 1, managed: true })!, /managed/);
});
test('limiter: cooldown and sliding bucket', () => {
  let t = 0; const l = new Limiter(() => t);
  assert.equal(l.cooldown('k', 1000), 0); assert.equal(l.cooldown('k', 1000), 1000); t = 1001; assert.equal(l.cooldown('k', 1000), 0);
  assert.ok(l.bucket('b', 2, 100) && l.bucket('b', 2, 100) && !l.bucket('b', 2, 100)); t += 200; assert.ok(l.bucket('b', 2, 100));
});
test('automod rules + escalation', () => {
  const cfg = structuredClone(DEFAULTS); for (const r of Object.values(cfg.rules)) r.on = true; cfg.words = ['badword'];
  assert.equal(evaluate('hi', 0, [], cfg, 1000), null);
  assert.equal(evaluate('join discord.gg/abc', 0, [], cfg), 'invites'); assert.equal(evaluate('free nitro here', 0, [], cfg), 'invites');
  assert.equal(evaluate('hello', 6, [], cfg), 'mentions'); assert.equal(evaluate('THIS IS ALL CAPS MESSAGE', 0, [], cfg), 'caps');
  assert.equal(evaluate('a BadWord b', 0, [], cfg), 'profanity'); assert.equal(evaluate('x', 0, Array(5).fill({ t: 999, c: 'y' }), cfg, 1000), 'spam');
  assert.equal(evaluate('same', 0, [{ t: 0, c: 'same' }, { t: 0, c: 'same' }], cfg, 99999), 'duplicates');
  assert.equal(evaluate('😀'.repeat(10), 0, [], cfg), 'emoji'); assert.equal(evaluate('z̀́̂̃̄̅', 0, [], cfg), 'zalgo');
  assert.deepEqual([1, 3, 6, 10].map((n) => tier(n, cfg.esc)), ['none', 'timeout', 'kick', 'ban']);
});
test('anti-nuke sliding window', () => { const a: number[] = []; assert.deepEqual([0, 1000, 2000, 20000].map((t) => slide(a, t, 5000)), [1, 2, 3, 1]); });
test('slots: house edge for every mode (exact EV < 1)', () => {
  const n = SYMS.length; let rtp: Record<string, number> = {};
  for (const mode of Object.keys(SLOT_PAY)) { let sum = 0; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) sum += slotPayout(1000, [SYMS[a], SYMS[b], SYMS[c]], mode); rtp[mode] = sum / (n ** 3 * 1000); assert.ok(rtp[mode] < 1, `${mode} rtp ${rtp[mode]}`); }
});
test('giveaway draw is unique and bounded', () => { const w = drawWinners(['a', 'b', 'c', 'a'], 5); assert.equal(new Set(w).size, w.length); assert.equal(w.length, 3); assert.deepEqual(drawWinners([], 2), []); });
test('akinator identifies a character from honest answers', () => {
  for (const [name, traits] of [CHARS[0], CHARS[10], CHARS[21], CHARS[36]]) {
    const s: AkiState = { deck: 'all', hist: [], rejected: [] };
    for (let i = 0; i < 20; i++) { const v = think(s); if (v.guess) break; s.hist.push([v.next!, traits.split(' ').includes(v.next!) ? ANS[0] : ANS[4]]); }
    const v = think(s); assert.ok(v.guess, 'no guess'); assert.ok(v.posterior.slice(0, 2).some(([n]) => n === name) || traits === CHARS.find((c) => c[0] === v.guess![0])![1], `${name} vs ${v.guess![0]}`);
  }
  const s: AkiState = { deck: 'all', hist: [['video', 1], ['hero', 1]], rejected: [] }; const before = think(s).confidence; s.hist.pop(); assert.notEqual(think(s).confidence, before); // undo changes state
});
test('anicatch: pity raises odds; battle always terminates', () => {
  assert.ok(catchChance(4, 10) > catchChance(4, 0)); assert.ok(catchChance(0, 99) <= 0.95); assert.ok(SPECIES.length >= 40); assert.equal(SPECIES[rollSpecies(Math.random, 4)].r, 4);
  const s = startBattle([0, 1, 2], [20, 30, 39]); let n = 0; while (s.winner === null && n++ < 500) act(s, (['atk', 'spc', 'grd'] as const)[n % 3]); assert.notEqual(s.winner, null);
});
test('AI: unset env returns explicit setup notice and never calls the network', async () => {
  for (const k of ['AI_API_URL', 'AI_API_KEY', 'AI_MODEL']) delete process.env[k];
  const r = await callAI('s', 'u', (() => { throw new Error('network must not be touched'); }) as any); assert.deepEqual(r, { ok: false, notice: AI_SETUP_NOTICE });
});
test('AI: configured path calls the endpoint with bearer key from env', async () => {
  Object.assign(process.env, { AI_API_URL: 'http://x/y', AI_API_KEY: 'k123', AI_MODEL: 'm' }); let seen: any;
  const r = await callAI('s', 'u', (async (u: any, o: any) => { seen = { u, o }; return { ok: true, json: async () => ({ choices: [{ message: { content: 'hi' } }] }) }; }) as any);
  assert.deepEqual(r, { ok: true, text: 'hi' }); assert.equal(seen.o.headers.authorization, 'Bearer k123');
  for (const k of ['AI_API_URL', 'AI_API_KEY', 'AI_MODEL']) delete process.env[k];
});
test('music: status is honest when audio backend is absent', async () => { delete process.env.AUDIO_STREAM_URL; const s = await audioStatus(); assert.equal(s.ready, false); assert.equal(s.prov, false); });
test('games + store', () => { assert.equal(rpsResult('rock', 'scissors'), 'win'); assert.equal(rpsResult('rock', 'paper'), 'lose'); assert.equal(rpsResult('rock', 'rock'), 'tie'); const s = new Store(null); s.upd('c', 'k', () => ({ n: 0 }), (v) => { v.n++; }); assert.equal(s.get<any>('c', 'k').n, 1); });
