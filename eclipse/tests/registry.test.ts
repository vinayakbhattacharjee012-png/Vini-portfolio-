import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCommands } from '../src/core/commands.js';
import { MODULE_NAMES, loadModule } from '../src/core/modules.js';
import { catalog } from '../src/registry/defs.js';

test('registry indexes 50,000+ entries', () => { assert.ok(catalog.size >= 50_000, `size=${catalog.size}`); });
test('entry ids round-trip and expose catalog fields', () => {
  for (const id of [0, 1, 777, 25_000, catalog.size - 1]) { const e = catalog.entry(id)!; assert.equal(e.id, id); for (const k of ['module', 'name', 'path', 'perms', 'cooldownMs', 'handlerKey'] as const) assert.ok(k in e); }
  assert.equal(catalog.entry(catalog.size), undefined); assert.equal(catalog.entry(-1), undefined);
});
test('handlerKeys are unique and every module is loadable', () => {
  const keys = catalog.bases.map((b) => b.handlerKey); assert.equal(new Set(keys).size, keys.length);
  for (const b of catalog.bases) assert.ok(MODULE_NAMES.includes(b.module), b.module);
});
test('every catalog base resolves to a real lazy handler', async () => {
  for (const m of MODULE_NAMES) {
    const mod = await loadModule(m);
    for (const b of catalog.bases.filter((x) => x.module === m && x.handlerKey !== 'core.eclipse.run')) assert.equal(typeof (mod.H[`${b.root}.${b.name}`] ?? mod.H[b.name]), 'function', `missing handler ${b.handlerKey}`);
  }
});
test('search finds preset variants', () => {
  const r = catalog.search('tempban hours=24 reason=raid'); assert.ok(r.length > 0); assert.ok(r[0].name.includes('hours=24'));
});
test('slash payload stays within Discord limits', () => {
  const cmds = buildCommands(); assert.ok(cmds.length <= 100, `${cmds.length} top-level`);
  for (const c of cmds) {
    assert.ok(JSON.stringify(c).length < 6000, `${c.name} payload too big`); assert.ok(!c.options || c.options.length <= 25, c.name);
    assert.match(c.name, c.type ? /^.{1,32}$/ : /^[a-z0-9_-]{1,32}$/);
    for (const s of c.options ?? []) for (const list of [s.options ?? [], [s]]) { const req = list.map((o: any) => !!o.required); assert.deepEqual(req, [...req].sort((a, b) => Number(b) - Number(a)), `${c.name}: required options must come first`); }
  }
});
test('cold index build is fast and lean', () => { const t = performance.now(); catalog.search('ban', 25); assert.ok(performance.now() - t < 200); assert.ok(catalog.offsets.byteLength < 4096); });
