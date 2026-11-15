import { GoogleGenAI } from '@google/genai';
import type { Citation, Envelope, League, Match, NewsItem, Sport, StandingRow } from '../src/lib/types.ts';

let client: GoogleGenAI | null = null;
const model = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const geminiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

function ai() {
  if (!geminiEnabled()) throw new Error('GEMINI_API_KEY not set');
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** Grounding can't be combined with a response schema, so we ask for JSON and extract it. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf(']'), body.lastIndexOf('}'));
  if (start < 0 || end < start) throw new Error('no JSON in model reply');
  return JSON.parse(body.slice(start, end + 1));
}

async function grounded<T>(prompt: string): Promise<{ data: T; citations: Citation[] }> {
  const today = new Date().toUTCString();
  const res = await ai().models.generateContent({
    model: model(),
    contents: `Current date/time: ${today}.\n${prompt}\n\nUse Google Search for up-to-the-minute facts. Never invent results: if you cannot verify something, leave it out. Reply with JSON only, no prose.`,
    config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
  });
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const c of chunks) {
    const uri = c.web?.uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      citations.push({ uri, title: c.web?.title ?? new URL(uri).hostname });
    }
  }
  return { data: extractJson(res.text ?? '') as T, citations: citations.slice(0, 8) };
}

const env = <T>(data: T, citations: Citation[]): Envelope<T> => ({
  data,
  citations,
  source: 'gemini',
  fetchedAt: new Date().toISOString(),
});

const SCOPE: Record<string, string> = {
  ipl: 'the Indian Premier League (IPL) — or, out of season, the most recent/upcoming IPL fixtures and news',
  t20i: "men's and women's T20 International cricket matches",
  icc: 'ICC tournaments (World Cup, Champions Trophy, T20 World Cup, World Test Championship)',
};
const scopeOf = (l: League) => SCOPE[l.id] ?? `${l.name} football`;

export async function geminiScoreboard(league: League): Promise<Envelope<Match[]>> {
  const cricket = league.sport === 'cricket';
  const { data, citations } = await grounded<any[]>(
    `List matches in ${scopeOf(league)}: every match live right now, results from the last 3 days, and fixtures in the next 7 days (max 16).
Return a JSON array of objects:
{"id": string, "status": "live"|"scheduled"|"finished", "clock": string (${cricket ? 'e.g. "14.3 ov" or "Stumps"' : `e.g. "67'", "HT", "FT"`}), "start": ISO 8601 UTC, "venue": string,
 "home": {"name": string, "short": 3-4 letter code, "score": string|null${cricket ? ', "detail": overs like "20 ov"' : ''}},
 "away": {same}, "note": short result/status line or null}`,
  );
  if (!Array.isArray(data)) throw new Error('bad shape');
  const matches: Match[] = data.map((m, i) => ({
    id: String(m.id ?? `g-${league.id}-${i}`),
    league: league.id,
    status: ['live', 'scheduled', 'finished'].includes(m.status) ? m.status : 'scheduled',
    clock: m.clock ?? undefined,
    start: m.start ?? new Date().toISOString(),
    venue: m.venue ?? undefined,
    home: { name: m.home?.name ?? 'TBD', short: m.home?.short ?? '', score: m.home?.score ?? undefined, detail: m.home?.detail ?? undefined },
    away: { name: m.away?.name ?? 'TBD', short: m.away?.short ?? '', score: m.away?.score ?? undefined, detail: m.away?.detail ?? undefined },
    note: m.note ?? undefined,
  }));
  return env(matches, citations);
}

export async function geminiStandings(league: League): Promise<Envelope<StandingRow[]>> {
  const cricket = league.sport === 'cricket';
  const { data, citations } = await grounded<any[]>(
    `Give the current (or most recent) ${cricket ? 'points table' : 'league table'} for ${scopeOf(league)}.
Return a JSON array ordered by position: {"rank": number, "team": string, "short": string, "played": number, "won": number, "drawn": number${cricket ? ' (no-results)' : ''}, "lost": number, ${cricket ? '"nrr": string like "+0.842"' : '"gd": number'}, "points": number}`,
  );
  if (!Array.isArray(data) || !data.length) throw new Error('bad shape');
  return env(
    data.map((r, i) => ({
      rank: Number(r.rank ?? i + 1),
      team: String(r.team),
      short: r.short,
      played: Number(r.played ?? 0),
      won: Number(r.won ?? 0),
      drawn: Number(r.drawn ?? 0),
      lost: Number(r.lost ?? 0),
      gd: r.gd === undefined ? undefined : Number(r.gd),
      nrr: r.nrr ?? undefined,
      points: Number(r.points ?? 0),
    })),
    citations,
  );
}

export async function geminiNews(sport: Sport): Promise<Envelope<NewsItem[]>> {
  const scope =
    sport === 'cricket'
      ? 'cricket: IPL (auctions, retentions, squads), T20Is and ICC tournaments'
      : 'football: Premier League, La Liga, UEFA Champions League and the Indian Super League';
  const { data, citations } = await grounded<any[]>(
    `Find the 8 most important breaking stories from the last 48 hours in ${scope} — transfers, injuries, squad/roster changes, big results.
Return a JSON array: {"headline": string (max 90 chars), "summary": one sentence, "tag": "Transfer"|"Injury"|"Result"|"Squad"|"Preview"|"News", "league": short league name, "url": source article URL or null}`,
  );
  if (!Array.isArray(data)) throw new Error('bad shape');
  return env(
    data.slice(0, 10).map((n) => ({
      headline: String(n.headline),
      summary: String(n.summary ?? ''),
      tag: n.tag ?? 'News',
      league: n.league ?? undefined,
      url: typeof n.url === 'string' && n.url.startsWith('http') ? n.url : undefined,
    })),
    citations,
  );
}
