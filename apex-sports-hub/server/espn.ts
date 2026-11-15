import type { Envelope, League, Match, MatchStatus, Side, StandingRow } from '../src/lib/types.ts';
import { getJson } from './http.ts';

const BASE = 'https://site.api.espn.com/apis';

/** ESPN path segment for each league. Leagues without one are served by Gemini. */
const ESPN_PATH: Record<string, string> = {
  'eng.1': 'soccer/eng.1',
  'esp.1': 'soccer/esp.1',
  'uefa.champions': 'soccer/uefa.champions',
  'ind.1': 'soccer/ind.1',
  ipl: 'cricket/8048',
};

export function pathFor(league: League) {
  const p = ESPN_PATH[league.id];
  if (!p) throw new Error('no ESPN feed');
  return p;
}

function status(state: string | undefined): MatchStatus {
  if (state === 'in') return 'live';
  if (state === 'post') return 'finished';
  return 'scheduled';
}

function side(c: any, cricket: boolean): Side {
  const t = c?.team ?? {};
  const s: Side = {
    name: t.displayName ?? t.name ?? 'TBD',
    short: t.abbreviation ?? t.shortDisplayName ?? '',
    logo: t.logo ?? t.logos?.[0]?.href,
    score: c?.score === undefined || c?.score === '' ? undefined : String(c.score),
    winner: c?.winner === true,
  };
  if (cricket) {
    // ESPN cricket sends "187/6" in score and overs in linescores
    const ls = c?.linescores?.[c.linescores.length - 1];
    if (ls?.overs !== undefined) s.detail = `${ls.overs} ov`;
  }
  return s;
}

export async function espnScoreboard(league: League): Promise<Envelope<Match[]>> {
  const cricket = league.sport === 'cricket';
  const json = await getJson(`${BASE}/site/v2/sports/${pathFor(league)}/scoreboard`);
  const events: any[] = json?.events ?? [];
  const data: Match[] = events.map((ev) => {
    const comp = ev.competitions?.[0] ?? {};
    const cs: any[] = comp.competitors ?? [];
    const home = cs.find((c) => c.homeAway === 'home') ?? cs[0];
    const away = cs.find((c) => c.homeAway === 'away') ?? cs[1];
    const st = ev.status ?? comp.status ?? {};
    const s = status(st.type?.state);
    return {
      id: String(ev.id),
      league: league.id,
      status: s,
      clock: s === 'live' ? st.displayClock || st.type?.shortDetail : st.type?.shortDetail,
      start: ev.date,
      venue: comp.venue?.fullName,
      home: side(home, cricket),
      away: side(away, cricket),
      note: comp.status?.summary ?? ev.competitions?.[0]?.notes?.[0]?.headline,
    };
  });
  return { data, source: 'espn', fetchedAt: new Date().toISOString() };
}

export async function espnStandings(league: League): Promise<Envelope<StandingRow[]>> {
  if (league.sport === 'cricket') throw new Error('no ESPN cricket table');
  const json = await getJson(`${BASE}/v2/sports/${pathFor(league)}/standings`);
  // League tables live in children[0]; UCL league phase uses the same shape.
  const groups: any[] = json?.children ?? (json?.standings ? [json] : []);
  const entries: any[] = groups.flatMap((g) => g?.standings?.entries ?? []);
  if (!entries.length) throw new Error('empty table');
  const stat = (e: any, ...names: string[]) => {
    const s = e.stats?.find((x: any) => names.includes(x.name) || names.includes(x.type));
    return Number(s?.value ?? 0);
  };
  const data: StandingRow[] = entries
    .map((e) => ({
      rank: stat(e, 'rank') || 0,
      team: e.team?.displayName ?? e.team?.name,
      short: e.team?.abbreviation,
      logo: e.team?.logos?.[0]?.href,
      played: stat(e, 'gamesPlayed'),
      won: stat(e, 'wins'),
      drawn: stat(e, 'ties'),
      lost: stat(e, 'losses'),
      gd: stat(e, 'pointDifferential'),
      points: stat(e, 'points'),
    }))
    .sort((a, b) => (a.rank && b.rank ? a.rank - b.rank : b.points - a.points || (b.gd ?? 0) - (a.gd ?? 0)))
    .map((r, i) => ({ ...r, rank: r.rank || i + 1 }));
  return { data, source: 'espn', fetchedAt: new Date().toISOString() };
}
