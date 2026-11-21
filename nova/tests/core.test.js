import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../js/calc.js';
import { ask, searchNotes } from '../js/assistant.js';
import { findApp } from '../js/registry.js';

test('calculator precedence, unary, power, functions', () => {
  assert.equal(evaluate('2 + 3 * 4'), 14);
  assert.equal(evaluate('(2 + 3) * 4'), 20);
  assert.equal(evaluate('-2^2'), -4);
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('10 % 4'), 2);
  assert.equal(evaluate('sqrt(16) + abs(-3)'), 7);
  assert.equal(evaluate('6 × 7 ÷ 2'), 21);
  assert.equal(evaluate('2**-1'), 0.5);
  assert.ok(Math.abs(evaluate('pi') - Math.PI) < 1e-12);
  for (const bad of ['', '1/0', '2 +', 'alert(1)', '(1', '1)', '3 $ 4', 'constructor']) assert.throws(() => evaluate(bad), bad);
});

test('findApp', () => {
  assert.equal(findApp('notes').id, 'notes');
  assert.equal(findApp('the file explorer').id, 'files');
  assert.equal(findApp('system monitor').id, 'monitor');
  assert.equal(findApp('banana'), null);
});

const ctx = {
  notes: [{ id: 'a', title: 'Welcome', body: 'Hello NOVA' }, { id: 'b', title: 'Launch plan', body: 'ship the dock' }],
  system: { uptime: '1m', openWindows: 1, storage: '1 KB', online: true, battery: 'simulated' },
  now: new Date(2026, 0, 1),
};
const run = (t) => ask(t, ctx);

test('assistant commands', async () => {
  assert.deepEqual((await run('open notes')).effects, [{ type: 'open', app: 'notes' }]);
  assert.deepEqual((await run('Open Files')).effects, [{ type: 'open', app: 'files' }]);
  assert.match((await run('open banana')).text, /couldn't find/);
  assert.deepEqual((await run('close calculator')).effects, [{ type: 'close', app: 'calculator' }]);
  assert.match((await run('show system status')).text, /Uptime: 1m/);
  assert.match((await run('help')).text, /local demo mode/i);

  const n = await run('create a note Groceries: milk, eggs');
  assert.deepEqual(n.effects, [{ type: 'createNote', title: 'Groceries', body: 'milk, eggs' }]);
  assert.equal((await run('new note buy milk')).effects[0].title, 'buy milk');

  assert.match((await run('calculate (2+3)*4')).text, /= 20$/);
  assert.match((await run('what is 2^10')).text, /= 1,024/);
  assert.match((await run('12 / 4')).text, /= 3/);
  assert.match((await run('calculate 1/0')).text, /Division by zero/);
  assert.match((await run("what's up")).text, /local demo assistant/);

  const s = await run('search my notes for launch');
  assert.match(s.text, /1 note matches/);
  assert.deepEqual(s.actions[0].effect, { type: 'open', app: 'notes', payload: { noteId: 'b' } });
  assert.match((await run('search my notes zebra')).text, /No notes match/);
  assert.equal(searchNotes(ctx.notes, 'NOVA hello').length, 1);
});

test('ask() drops unknown effects from providers', async () => {
  const evil = async () => ({ text: 'x', effects: [{ type: 'eval', code: '1' }, { type: 'open', app: 'nope' }, { type: 'open', app: 'notes' }], actions: [{ label: 'a', effect: { type: 'navigate' } }] });
  const r = await ask('x', ctx, evil);
  assert.deepEqual(r.effects, [{ type: 'open', app: 'notes' }]);
  assert.deepEqual(r.actions, []);
});

test('hybridProvider: commands stay local, the rest go to the server', async () => {
  const { hybridProvider } = await import('../js/assistant.js');
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ text: 'model says hi' }) }; };
  try {
    const p = hybridProvider('api/nexus');
    const hctx = { ...ctx, history: [{ role: 'user', text: 'earlier', actions: [] }] };
    assert.deepEqual((await ask('open notes', hctx, p)).effects, [{ type: 'open', app: 'notes' }]);
    assert.equal(calls.length, 0);
    assert.equal((await ask('write me a haiku', hctx, p)).text, 'model says hi');
    assert.deepEqual(calls[0], { input: 'write me a haiku', history: [{ role: 'user', text: 'earlier' }] });
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: 'Too many requests' }) });
    assert.match((await ask('another question', hctx, p)).text, /unavailable right now \(Too many requests\)/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
