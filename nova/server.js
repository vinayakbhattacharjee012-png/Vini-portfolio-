// NOVA OS server: serves the app and proxies NEXUS chat to Gemini (Google AI Studio).
// The API key lives only in this process's environment (GEMINI_API_KEY); the browser never sees it.
//   GEMINI_API_KEY  required for AI replies (without it NEXUS stays in local demo mode)
//   GEMINI_MODEL    optional, default below
//   PORT            set by Render
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_INPUT = 2000, MAX_HISTORY = 10, MAX_BODY = 32 * 1024;
const RATE = { windowMs: 60_000, max: 20 };

const SYSTEM = `You are NEXUS, the assistant built into NOVA OS, a browser desktop.
Be concise and helpful; plain text only, no markdown headings.
The desktop itself handles commands like "open notes", "create a note …", "calculate …" and "search my notes …" before you are asked,
so if the user wants one of those, tell them the exact command to type.`;

/** Turn a chat request into a Gemini call. Pure apart from `fetchImpl`, so it can be tested. */
export async function handleNexus(body, env, fetchImpl = fetch) {
  const key = env.GEMINI_API_KEY;
  if (!key) return { status: 503, json: { error: 'NEXUS AI is not configured on this server.' } };
  const input = typeof body?.input === 'string' ? body.input.trim() : '';
  if (!input || input.length > MAX_INPUT) return { status: 400, json: { error: `Message must be 1–${MAX_INPUT} characters.` } };
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'bot') && typeof m.text === 'string' && m.text)
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text.slice(0, MAX_INPUT) }] }));

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  let res;
  try {
    res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [...history, { role: 'user', parts: [{ text: input }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { status: 502, json: { error: 'Could not reach Gemini.' } };
  }
  // Never forward Google's error body: it can echo request details.
  if (!res.ok) return { status: 502, json: { error: `Gemini returned ${res.status}${res.status === 400 || res.status === 403 ? ' (check the API key and model name)' : res.status === 429 ? ' (quota or rate limit reached)' : ''}.` } };
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) return { status: 200, json: { text: data?.promptFeedback?.blockReason ? 'Gemini declined to answer that one.' : 'Gemini returned an empty reply.' } };
  return { status: 200, json: { text } };
}

// shortcut: in-memory per-IP limit, resets on restart and isn't shared across instances; use a shared store if you scale out.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE.max;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const PUBLIC = /^\/(index\.html|styles\.css|js\/[\w-]+\.js)$/; // only the app's own files, never server.js or package.json
const SECURITY = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN' };

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { ...SECURITY, 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new Error('too large');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function route(req, res) {
  const url = new URL(req.url, 'http://local');
  if (url.pathname === '/api/nexus/status') {
    return send(res, 200, { ai: !!process.env.GEMINI_API_KEY, provider: 'Gemini', model: process.env.GEMINI_MODEL || DEFAULT_MODEL });
  }
  if (url.pathname === '/api/nexus') {
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (limited(ip)) return send(res, 429, { error: 'Too many requests, slow down a little.' });
    let body;
    try { body = await readJson(req); } catch { return send(res, 400, { error: 'Invalid request.' }); }
    const out = await handleNexus(body, process.env);
    return send(res, out.status, out.json);
  }
  const path = url.pathname === '/' ? '/index.html' : normalize(url.pathname);
  if (req.method !== 'GET' || !PUBLIC.test(path)) return send(res, 404, 'Not found', 'text/plain');
  try {
    send(res, 200, await readFile(join(ROOT, path)), TYPES[extname(path)]);
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createServer((req, res) => route(req, res).catch(() => send(res, 500, { error: 'Server error' }))).listen(port, () => {
    console.log(`NOVA OS on :${port} · Gemini ${process.env.GEMINI_API_KEY ? 'configured' : 'NOT configured (local demo mode)'}`);
  });
}
