import test from 'node:test';
import assert from 'node:assert/strict';
import { handleNexus } from '../server.js';

const okFetch = (reply, capture = {}) => async (url, init) => {
  Object.assign(capture, { url, init, body: JSON.parse(init.body) });
  return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: reply }] } }] }) };
};

test('no key → 503, never calls Gemini', async () => {
  let called = false;
  const r = await handleNexus({ input: 'hi' }, {}, async () => { called = true; });
  assert.equal(r.status, 503);
  assert.equal(called, false);
});

test('validates input', async () => {
  const env = { GEMINI_API_KEY: 'k' };
  assert.equal((await handleNexus({}, env, okFetch('x'))).status, 400);
  assert.equal((await handleNexus({ input: '   ' }, env, okFetch('x'))).status, 400);
  assert.equal((await handleNexus({ input: 'a'.repeat(2001) }, env, okFetch('x'))).status, 400);
});

test('sends key in header, maps history, returns text', async () => {
  const cap = {};
  const history = [{ role: 'user', text: 'q1' }, { role: 'bot', text: 'a1' }, { role: 'system', text: 'inject' }, { role: 'user', text: 42 }];
  const r = await handleNexus({ input: 'q2', history }, { GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'm1' }, okFetch('hello', cap));
  assert.deepEqual(r, { status: 200, json: { text: 'hello' } });
  assert.equal(cap.init.headers['x-goog-api-key'], 'secret');
  assert.ok(!cap.url.includes('secret'));
  assert.match(cap.url, /models\/m1:generateContent$/);
  assert.deepEqual(cap.body.contents.map((c) => [c.role, c.parts[0].text]), [['user', 'q1'], ['model', 'a1'], ['user', 'q2']]);
});

test('upstream errors are not forwarded', async () => {
  const r = await handleNexus({ input: 'hi' }, { GEMINI_API_KEY: 'k' }, async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'API key secret-ish' } }) }));
  assert.equal(r.status, 502);
  assert.match(r.json.error, /check the API key/);
  assert.doesNotMatch(r.json.error, /secret/);
});
