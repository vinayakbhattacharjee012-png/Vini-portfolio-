import type { Envelope, League, StandingRow, TeamProfile } from '../src/lib/types.ts';
import { getJson } from './http.ts';

// "3" is TheSportsDB's public test key: free, no sign-up, rate-limited.
const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

/** European football seasons run Aug–May: Nov 2026 → "2026-2027". */
function footballSeason(d = new Date()) {
  const y = d.getUTCFullYear();
  return d.getUTCMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export async function tsdbStandings(league: League): Promise<Envelope<StandingRow[]>> {
  if (!league.tsdbId) throw new Error('no TheSportsDB id');
  const json = await getJson(`${BASE}/lookuptable.php?l=${league.tsdbId}&s=${footballSeason()}`);
  const rows: any[] = json?.table ?? [];
  if (!rows.length) throw new Error('empty table');
  const n = (v: unknown) => Number(v ?? 0);
  return {
    data: rows.map((r) => ({
      rank: n(r.intRank),
      team: r.strTeam,
      logo: r.strBadge ?? r.strTeamBadge,
      played: n(r.intPlayed),
      won: n(r.intWin),
      drawn: n(r.intDraw),
      lost: n(r.intLoss),
      gd: n(r.intGoalDifference),
      points: n(r.intPoints),
    })),
    source: 'thesportsdb',
    fetchedAt: new Date().toISOString(),
  };
}

export async function tsdbTeam(name: string): Promise<Envelope<TeamProfile>> {
  const json = await getJson(`${BASE}/searchteams.php?t=${encodeURIComponent(name)}`);
  const t = json?.teams?.[0];
  if (!t) throw new Error('team not found');
  let players: TeamProfile['players'] = [];
  try {
    const pj = await getJson(`${BASE}/lookup_all_players.php?id=${t.idTeam}`);
    players = (pj?.player ?? []).slice(0, 30).map((p: any) => ({
      name: p.strPlayer,
      position: p.strPosition,
      thumb: p.strCutout ?? p.strThumb ?? undefined,
      number: p.strNumber ?? undefined,
    }));
  } catch {
    /* squad lists are limited on the free key; the profile still renders */
  }
  return {
    data: {
      name: t.strTeam,
      badge: t.strBadge ?? t.strTeamBadge,
      banner: t.strBanner ?? t.strFanart1 ?? undefined,
      stadium: t.strStadium,
      founded: t.intFormedYear,
      league: t.strLeague,
      country: t.strCountry,
      description: t.strDescriptionEN,
      website: t.strWebsite ? `https://${String(t.strWebsite).replace(/^https?:\/\//, '')}` : undefined,
      players,
    },
    source: 'thesportsdb',
    fetchedAt: new Date().toISOString(),
  };
}
