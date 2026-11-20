import type { Envelope, League } from '../src/lib/types.ts';
import { getJson } from './http.ts';
import { pathFor } from './espn.ts';

const BASE = 'https://site.api.espn.com/apis';

export interface Player { name: string; jersey?: string; position?: string; starter: boolean; subbedIn?: boolean; subbedOut?: boolean; team: string }
export interface KeyEvent { clock: string; type: string; text: string; team?: string }
export interface CommentaryLine { time: string; text: string }
export interface Stat { label: string; home: string; away: string }
export interface MatchCentre {
  venue?: string;
  city?: string;
  attendance?: number;
  officials: { name: string; role?: string }[];
  lineups: { team: string; formation?: string; players: Player[] }[];
  keyEvents: KeyEvent[];
  commentary: CommentaryLine[];
  stats: Stat[];
  teams: [string, string];
}

const str = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : String(v));

export async function espnMatchCentre(league: League, id: string): Promise<Envelope<MatchCentre>> {
  const json: any = await getJson(`${BASE}/site/v2/sports/${pathFor(league)}/summary?event=${encodeURIComponent(id)}`, 10_000);
  const info = json?.gameInfo ?? {};
  const comp = json?.header?.competitions?.[0] ?? {};
  const teams: any[] = comp.competitors ?? [];
  const home = teams.find((t) => t.homeAway === 'home') ?? teams[0];
  const away = teams.find((t) => t.homeAway === 'away') ?? teams[1];
  const nameOf = (t: any) => t?.team?.displayName ?? t?.team?.name ?? 'TBD';

  const lineups = (json?.rosters ?? []).map((r: any) => {
    const team = r.team?.displayName ?? '';
    return {
      team,
      formation: str(r.formation),
      players: (r.roster ?? []).map((p: any): Player => ({
        name: p.athlete?.displayName ?? 'Unknown',
        jersey: str(p.jersey),
        position: p.position?.abbreviation ?? p.position?.displayName,
        starter: Boolean(p.starter),
        subbedIn: Boolean(p.subbedIn),
        subbedOut: Boolean(p.subbedOut),
        team,
      })),
    };
  });

  // stats: pair the two teams' statistic rows by label
  const bt: any[] = json?.boxscore?.teams ?? [];
  const [a, b] = [bt[0], bt[1]];
  const stats: Stat[] = (a?.statistics ?? [])
    .map((s: any) => {
      const other = (b?.statistics ?? []).find((x: any) => x.label === s.label);
      return { label: s.label ?? s.name, home: str(s.displayValue) ?? '–', away: str(other?.displayValue) ?? '–' };
    })
    .filter((s: Stat) => s.label);

  const keyEvents: KeyEvent[] = (json?.keyEvents ?? []).map((e: any) => ({
    clock: e.clock?.displayValue ?? '',
    type: e.type?.text ?? '',
    text: e.text ?? e.shortText ?? '',
    team: e.team?.displayName,
  }));

  const commentary: CommentaryLine[] = (json?.commentary ?? [])
    .map((c: any) => ({ time: c.time?.displayValue ?? '', text: c.text ?? '' }))
    .filter((c: CommentaryLine) => c.text)
    .reverse(); // newest first

  const data: MatchCentre = {
    venue: info.venue?.fullName,
    city: info.venue?.address?.city,
    attendance: typeof info.attendance === 'number' ? info.attendance : undefined,
    officials: (info.officials ?? []).map((o: any) => ({ name: o.displayName ?? o.fullName, role: o.position?.displayName ?? o.position?.name })),
    lineups,
    keyEvents,
    commentary,
    stats,
    teams: [nameOf(home), nameOf(away)],
  };
  return { data, source: 'espn', fetchedAt: new Date().toISOString() };
}
