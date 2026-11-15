import { LEAGUES, type League, type Match } from '../src/lib/types.ts';
import { espnScoreboardRange } from './espn.ts';
import { logSync, saveMatches } from './db.ts';

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const DAY = 86_400_000;
const ESPN_LEAGUES = LEAGUES.filter((l) => l.sport === 'football' || l.id === 'ipl');

/** Pull a date window from ESPN and store every match. Returns the number stored. */
async function pullWindow(league: League, from: Date, to: Date): Promise<number> {
  const matches: Match[] = await espnScoreboardRange(league, `${ymd(from)}-${ymd(to)}`);
  return saveMatches(league.id, matches);
}

/** Pull the whole season in 30-day chunks, so previous matches are all stored. */
export async function backfill(league: League, fromDays = 400) {
  let total = 0;
  const end = new Date();
  for (let start = fromDays; start > 0; start -= 30) {
    const from = new Date(end.getTime() - start * DAY);
    const to = new Date(Math.min(end.getTime(), from.getTime() + 30 * DAY));
    try {
      total += await pullWindow(league, from, to);
    } catch (e) {
      logSync(league.id, 'backfill', false, (e as Error).message);
      return total;
    }
  }
  logSync(league.id, 'backfill', true, `${total} matches stored`);
  return total;
}

/** Keep recent results and near fixtures fresh: last 3 days and next 3 days. */
export async function refresh(league: League) {
  const now = Date.now();
  try {
    const n = await pullWindow(league, new Date(now - 3 * DAY), new Date(now + 3 * DAY));
    logSync(league.id, 'refresh', true, `${n} matches`);
  } catch (e) {
    logSync(league.id, 'refresh', false, (e as Error).message);
  }
}

let started = false;
/** Start the background jobs once: backfill on boot, refresh every 10 minutes. */
export function startIngest() {
  if (started || process.env.INGEST === 'off') return;
  started = true;
  (async () => {
    for (const l of ESPN_LEAGUES) await backfill(l);
    setInterval(async () => {
      for (const l of ESPN_LEAGUES) await refresh(l);
    }, 10 * 60_000);
  })();
}

export { ESPN_LEAGUES };
