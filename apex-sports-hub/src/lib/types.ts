export type Sport = 'football' | 'cricket';
export type MatchStatus = 'live' | 'scheduled' | 'finished';
export type Source = 'espn' | 'thesportsdb' | 'gemini' | 'sample';

export interface League {
  id: string;
  sport: Sport;
  name: string;
  short: string;
  /** TheSportsDB league id, used as a standings fallback */
  tsdbId?: string;
  hasTable: boolean;
}

export interface Side {
  name: string;
  short: string;
  logo?: string;
  score?: string;
  /** cricket overs, e.g. "18.4 ov" */
  detail?: string;
  winner?: boolean;
}

export interface Match {
  id: string;
  league: string;
  status: MatchStatus;
  /** "67'", "HT", "FT", "14.3 ov", or kickoff label */
  clock?: string;
  start: string;
  venue?: string;
  home: Side;
  away: Side;
  note?: string;
}

export interface StandingRow {
  rank: number;
  team: string;
  short?: string;
  logo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd?: number;
  nrr?: string;
  points: number;
}

export interface NewsItem {
  headline: string;
  summary: string;
  tag: 'Transfer' | 'Injury' | 'Result' | 'Squad' | 'Preview' | 'News';
  league?: string;
  url?: string;
}

export interface TeamProfile {
  name: string;
  badge?: string;
  banner?: string;
  stadium?: string;
  founded?: string;
  league?: string;
  country?: string;
  description?: string;
  website?: string;
  players: { name: string; position?: string; thumb?: string; number?: string }[];
}

export interface Citation { title: string; uri: string }

export interface Envelope<T> {
  data: T;
  source: Source;
  fetchedAt: string;
  citations?: Citation[];
  note?: string;
}

export const LEAGUES: League[] = [
  { id: 'eng.1', sport: 'football', name: 'Premier League', short: 'EPL', tsdbId: '4328', hasTable: true },
  { id: 'esp.1', sport: 'football', name: 'La Liga', short: 'LaLiga', tsdbId: '4335', hasTable: true },
  { id: 'uefa.champions', sport: 'football', name: 'Champions League', short: 'UCL', tsdbId: '4480', hasTable: true },
  { id: 'ind.1', sport: 'football', name: 'Indian Super League', short: 'ISL', hasTable: true },
  { id: 'ipl', sport: 'cricket', name: 'Indian Premier League', short: 'IPL', hasTable: true },
  { id: 't20i', sport: 'cricket', name: 'T20 Internationals', short: 'T20I', hasTable: false },
  { id: 'icc', sport: 'cricket', name: 'ICC Tournaments', short: 'ICC', hasTable: true },
];

export const leagueById = (id: string) => LEAGUES.find((l) => l.id === id);
