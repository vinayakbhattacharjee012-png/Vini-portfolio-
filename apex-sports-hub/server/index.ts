import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leagueById, type Envelope, type Sport } from '../src/lib/types.ts';
import { espnScoreboard, espnStandings } from './espn.ts';
import { tsdbStandings, tsdbTeam } from './thesportsdb.ts';
import { geminiAnswer, geminiEnabled, geminiNews, geminiScoreboard, geminiStandings } from './gemini.ts';
import { espnMatchCentre } from './match.ts';
import { matchCount, recordFor, resultsFor, syncStatus, teamNames } from './db.ts';
import { startIngest } from './ingest.ts';
import { espnNews } from './news.ts';
import { sampleNews, sampleScoreboard, sampleStandings } from './sample.ts';

try {
  process.loadEnvFile(); // reads .env if present
} catch {
  /* no .env: fine */
}

const PORT = Number(process.env.PORT ?? 8787);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

// ---------- tiny TTL cache with stale fallback ----------
type Entry = { at: number; value: Envelope<unknown> };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<Envelope<unknown>>>();

type Step<T> = { name: string; run: () => Promise<Envelope<T>> };

/**
 * Try each source in order. A fresh cache hit is served directly; a failure in every
 * source serves the last good value (marked stale) before giving up.
 */
async function cached<T>(key: string, ttlMs: number, steps: Step<T>[]): Promise<Envelope<T>> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Envelope<T>;
  const running = inflight.get(key);
  if (running) return running as Promise<Envelope<T>>;

  const p = (async () => {
    const errors: string[] = [];
    for (const step of steps) {
      try {
        const value = await step.run();
        cache.set(key, { at: Date.now(), value });
        if (errors.length) value.note = [value.note, `Fell back after: ${errors.join('; ')}`].filter(Boolean).join(' · ');
        return value;
      } catch (e) {
        errors.push(`${step.name} ${(e as Error).message}`);
      }
    }
    if (hit) return { ...hit.value, note: `Showing last good data (${errors.join('; ')})` } as Envelope<T>;
    throw new Error(errors.join('; '));
  })();
  inflight.set(key, p as Promise<Envelope<unknown>>);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

const now = () => new Date().toISOString();

// ---------- routes ----------
async function api(url: URL): Promise<unknown> {
  const q = (k: string) => url.searchParams.get(k) ?? '';
  switch (url.pathname) {
    case '/api/health':
      return { ok: true, gemini: geminiEnabled(), time: now() };

    case '/api/scoreboard': {
      const league = leagueById(q('league'));
      if (!league) throw new HttpError(400, 'Unknown league');
      return cached(`sb:${league.id}`, 20_000, [
        { name: 'ESPN', run: () => espnScoreboard(league) },
        ...(geminiEnabled() ? [{ name: 'Gemini', run: () => geminiScoreboard(league) }] : []),
        { name: 'sample', run: async () => sampleScoreboard(league) },
      ]);
    }

    case '/api/standings': {
      const league = leagueById(q('league'));
      if (!league) throw new HttpError(400, 'Unknown league');
      return cached(`st:${league.id}`, 10 * 60_000, [
        { name: 'ESPN', run: () => espnStandings(league) },
        { name: 'TheSportsDB', run: () => tsdbStandings(league) },
        ...(geminiEnabled() ? [{ name: 'Gemini', run: () => geminiStandings(league) }] : []),
        { name: 'sample', run: async () => sampleStandings(league) },
      ]);
    }

    case '/api/news': {
      const sport = (q('sport') === 'cricket' ? 'cricket' : 'football') as Sport;
      return cached(`news:${sport}`, 2 * 60_000, [
        { name: 'ESPN', run: () => espnNews(sport) },
        ...(geminiEnabled() ? [{ name: 'Gemini', run: () => geminiNews(sport) }] : []),
        { name: 'sample', run: async () => sampleNews(sport) },
      ]);
    }

    case '/api/match': {
      const league = leagueById(q('league'));
      const id = q('id');
      if (!league || !/^\d+$/.test(id)) throw new HttpError(400, 'Need a league and a live match id');
      return cached(`mc:${league.id}:${id}`, 45_000, [{ name: 'ESPN', run: () => espnMatchCentre(league, id) }]);
    }

    case '/api/results': {
      const league = q('league') || undefined;
      const days = Math.min(Number(q('days') || 365), 730);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const rows = resultsFor({ league, limit: Number(q('limit') || 200), finishedOnly: q('finished') !== '0' }).filter((r) => r.start >= since);
      return { data: rows, source: 'db', fetchedAt: new Date().toISOString(), total: matchCount() };
    }

    case '/api/teams/search': {
      return { data: teamNames(q('q'), 8) };
    }

    case '/api/club': {
      const name = q('name').trim();
      if (!name) throw new HttpError(400, 'Missing club name');
      const past = resultsFor({ team: name, limit: 60, finishedOnly: true });
      const upcoming = resultsFor({ team: name, limit: 10 }).filter((r) => r.status !== 'finished').reverse();
      const profile = await cached(`team:${name.toLowerCase()}`, 60 * 60_000, [{ name: 'TheSportsDB', run: () => tsdbTeam(name) }]).catch(() => null);
      return {
        data: { name, record: recordFor(name), past, upcoming, profile: profile?.data ?? null },
        source: 'db',
        fetchedAt: new Date().toISOString(),
        note: profile ? undefined : 'Club profile unavailable from TheSportsDB right now; results are from the stored archive.',
      };
    }

    case '/api/db/status': {
      return { matches: matchCount(), sync: syncStatus(), persistent: Boolean(process.env.DATA_DIR) };
    }

    case '/api/team': {
      const name = q('name').trim();
      if (!name) throw new HttpError(400, 'Missing team name');
      return cached(`team:${name.toLowerCase()}`, 60 * 60_000, [{ name: 'TheSportsDB', run: () => tsdbTeam(name) }]);
    }
  }
  throw new HttpError(404, 'Not found');
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

async function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, safe);
  if (!file.startsWith(DIST)) file = join(DIST, 'index.html');
  try {
    if (!(await stat(file)).isFile()) throw new Error();
  } catch {
    file = join(DIST, 'index.html'); // SPA fallback
  }
  try {
    const body = await readFile(file);
    const immutable = file.includes(`${join(DIST, 'assets')}`);
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404).end('Run `npm run build` first.');
  }
}

const askCache = new Map<string, { at: number; value: unknown }>();
const lastAsk = new Map<string, number>();

async function readBody(req: IncomingMessage): Promise<string> {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 4000) throw new HttpError(413, 'Question too long');
  }
  return raw;
}

async function ask(req: IncomingMessage): Promise<unknown> {
  if (!geminiEnabled()) throw new HttpError(503, 'AI assistant is off: set GEMINI_API_KEY on the server.');
  const ip = req.socket.remoteAddress ?? 'anon';
  if (Date.now() - (lastAsk.get(ip) ?? 0) < 3000) throw new HttpError(429, 'Slow down a little: one question every few seconds.');
  lastAsk.set(ip, Date.now());
  const { question, league, matchId, context } = JSON.parse(await readBody(req)) as Record<string, string>;
  const q = String(question ?? '').trim().slice(0, 300);
  if (!q) throw new HttpError(400, 'Empty question');
  const key = `${league}|${matchId}|${q.toLowerCase()}`;
  const hit = askCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const value = await geminiAnswer(q, String(context ?? '').slice(0, 3000)).catch((e: Error) => {
    throw new HttpError(502, `Assistant unavailable: ${e.message}`);
  });
  askCache.set(key, { at: Date.now(), value });
  return value;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);
  try {
    const body = url.pathname === '/api/ask' && req.method === 'POST' ? await ask(req) : await api(url);
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 502;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
}).listen(PORT, () => {
  startIngest();
  console.log(`Apex API on http://localhost:${PORT} · Gemini grounding ${geminiEnabled() ? 'ON' : 'OFF (set GEMINI_API_KEY)'}`);
});
