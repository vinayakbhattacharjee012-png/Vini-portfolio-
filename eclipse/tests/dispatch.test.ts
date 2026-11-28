import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { direct, exec, findEntry } from '../src/core/dispatch.js';
import { Limiter } from '../src/core/limiter.js';
import { catalog } from '../src/registry/defs.js';
import { Store } from '../src/storage/store.js';

const mk = (perms: boolean) => {
  const store = new Store(null), calls: string[] = [];
  const me = { id: 'bot', roles: { highest: { position: 10 } }, permissions: { has: () => true } };
  const guild: any = { id: 'g1', ownerId: 'o', members: { me, fetchMe: async () => me, fetch: async () => null }, client: {} };
  const actor: any = { id: 'u1', user: { tag: 'u#1' }, roles: { highest: { position: 5 } }, permissions: { has: () => perms } };
  const deps: any = { client: Object.assign(new EventEmitter(), { channels: { cache: new Map() } }), store, limiter: new Limiter() };
  return { store, deps, guild, actor, calls };
};
const base = (root: string, name: string) => catalog.base(root, name)!;

test('missing permission is denied and audited; handler never runs', async () => {
  const { deps, guild, actor, store } = mk(false);
  const r = await exec(deps, { guild, actor, channel: null }, direct(base('mod', 'kick')), { user: { id: 't' } });
  assert.match(String(r), /lack the required permission/); assert.equal(store.get<any[]>('audit', 'g1')![0].phase, 'deny');
});
test('disabled module is blocked', async () => {
  const { deps, guild, actor, store } = mk(true); store.set('cfg:cfg', 'g1', { disabled: ['games'] });
  assert.match(String(await exec(deps, { guild, actor, channel: null }, direct(base('game', 'dice')), {})), /disabled/);
});
test('per-user cooldown applies; consequential action writes intent before result', async () => {
  const { deps, guild, actor, store } = mk(true);
  const e = direct(base('game', 'dice')); assert.match(String(await exec(deps, { guild, actor, channel: null }, e, {})), /🎲/);
  assert.match(String(await exec(deps, { guild, actor, channel: null }, e, {})), /Cooldown/);
  const k = direct(base('mod', 'unmute')); await exec(deps, { guild, actor, channel: null }, k, { user: { id: 't' } });
  const phases = store.get<any[]>('audit', 'g1')!.map((x) => x.phase); assert.equal(phases[0], 'intent'); assert.ok(['ok', 'fail'].includes(phases[1]));
});
test('presets resolve by id/name and cannot nest run', async () => {
  const e = findEntry('tempban hours=24 reason=raid days=1')!; assert.equal(e.vars.hours, 24); assert.equal(findEntry(String(e.id))!.id, e.id);
  const { deps, guild, actor } = mk(true), run = catalog.entry(catalog.offsets[catalog.baseIndex(base('eclipse', 'run'))])!;
  assert.match(String(await exec(deps, { guild, actor, channel: null, depth: 1 }, run, {})), /cannot be nested/);
});
