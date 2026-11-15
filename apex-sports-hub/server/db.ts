import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Match } from '../src/lib/types.ts';

// DATA_DIR should point at a persistent disk in production. Without one, data resets on redeploy.
const dir = process.env.DATA_DIR ?? join(process.cwd(), 'data');
mkdirSync(dir, { recursive: true });
export const db = new DatabaseSync(join(dir, 'apex.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT NOT NULL,
    league TEXT NOT NULL,
    start TEXT NOT NULL,
    status TEXT NOT NULL,
    home TEXT NOT NULL,
    away TEXT NOT NULL,
    home_short TEXT,
    away_short TEXT,
    home_score TEXT,
    away_score TEXT,
    home_logo TEXT,
    away_logo TEXT,
    clock TEXT,
    venue TEXT,
    note TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (league, id)
  );
  CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home);
  CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away);
  CREATE INDEX IF NOT EXISTS idx_matches_start ON matches(start);
  CREATE TABLE IF NOT EXISTS sync_log (
    league TEXT NOT NULL,
    job TEXT NOT NULL,
    ran_at TEXT NOT NULL,
    ok INTEGER NOT NULL,
    detail TEXT,
    PRIMARY KEY (league, job)
  );
`);

const upsert = db.prepare(`
  INSERT INTO matches (id, league, start, status, home, away, home_short, away_short, home_score, away_score, home_logo, away_logo, clock, venue, note, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(league, id) DO UPDATE SET
    start=excluded.start, status=excluded.status, home=excluded.home, away=excluded.away,
    home_short=excluded.home_short, away_short=excluded.away_short,
    home_score=excluded.home_score, away_score=excluded.away_score,
    home_logo=excluded.home_logo, away_logo=excluded.away_logo,
    clock=excluded.clock, venue=excluded.venue, note=excluded.note, updated_at=excluded.updated_at
`);

/** Upsert matches. Only real feed matches are stored (never sample or AI-generated ones). */
export function saveMatches(league: string, matches: Match[]) {
  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    for (const m of matches) {
      upsert.run(
        m.id, league, m.start, m.status, m.home.name, m.away.name, m.home.short ?? null, m.away.short ?? null,
        m.home.score ?? null, m.away.score ?? null, m.home.logo ?? null, m.away.logo ?? null,
        m.clock ?? null, m.venue ?? null, m.note ?? null, now,
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return matches.length;
}

export interface StoredMatch {
  id: string; league: string; start: string; status: 'live' | 'scheduled' | 'finished';
  home: string; away: string; homeShort: string | null; awayShort: string | null;
  homeScore: string | null; awayScore: string | null; homeLogo: string | null; awayLogo: string | null;
  clock: string | null; venue: string | null; note: string | null;
}

const rowToMatch = (r: any): StoredMatch => ({
  id: r.id, league: r.league, start: r.start, status: r.status, home: r.home, away: r.away,
  homeShort: r.home_short, awayShort: r.away_short, homeScore: r.home_score, awayScore: r.away_score,
  homeLogo: r.home_logo, awayLogo: r.away_logo, clock: r.clock, venue: r.venue, note: r.note,
});

export function resultsFor(opts: { league?: string; team?: string; limit?: number; finishedOnly?: boolean }): StoredMatch[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.league) { where.push('league = ?'); args.push(opts.league); }
  if (opts.team) { where.push('(home = ? OR away = ?)'); args.push(opts.team, opts.team); }
  if (opts.finishedOnly) where.push("status = 'finished'");
  const sql = `SELECT * FROM matches ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY start DESC LIMIT ?`;
  args.push(opts.limit ?? 50);
  return (db.prepare(sql).all(...args) as any[]).map(rowToMatch);
}

export function teamNames(q: string, limit = 8): string[] {
  return (db.prepare('SELECT DISTINCT name FROM (SELECT home AS name FROM matches UNION SELECT away FROM matches) WHERE name LIKE ? LIMIT ?')
    .all(`%${q}%`, limit) as { name: string }[]).map((r) => r.name);
}

export function recordFor(team: string) {
  const rows = db.prepare(`
    SELECT home, away, home_score, away_score, league, start FROM matches
    WHERE status = 'finished' AND (home = ? OR away = ?) ORDER BY start DESC LIMIT 5
  `).all(team, team) as any[];
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  const form: ('W' | 'D' | 'L')[] = [];
  for (const r of rows) {
    const home = r.home === team;
    const us = Number(home ? r.home_score : r.away_score);
    const them = Number(home ? r.away_score : r.home_score);
    if (Number.isNaN(us) || Number.isNaN(them)) continue;
    gf += us; ga += them;
    const res = us > them ? 'W' : us < them ? 'L' : 'D';
    form.push(res);
    if (res === 'W') w++; else if (res === 'D') d++; else l++;
  }
  return { form, w, d, l, gf, ga };
}

export function syncStatus() {
  return db.prepare('SELECT league, job, ran_at, ok, detail FROM sync_log ORDER BY ran_at DESC LIMIT 50').all();
}

export function logSync(league: string, job: string, ok: boolean, detail: string) {
  db.prepare('INSERT INTO sync_log (league, job, ran_at, ok, detail) VALUES (?, ?, ?, ?, ?) ON CONFLICT(league, job) DO UPDATE SET ran_at=excluded.ran_at, ok=excluded.ok, detail=excluded.detail')
    .run(league, job, new Date().toISOString(), ok ? 1 : 0, detail.slice(0, 300));
}

export function matchCount() {
  return (db.prepare('SELECT COUNT(*) AS n FROM matches').get() as { n: number }).n;
}
