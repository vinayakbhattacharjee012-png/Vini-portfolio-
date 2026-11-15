import type { Envelope, League, Match, NewsItem, Sport, StandingRow } from '../src/lib/types.ts';

/**
 * Offline sample data, used only when every live source fails (e.g. no network and no
 * Gemini key). The UI labels it "Sample" so it is never mistaken for real results.
 */
const TEAMS: Record<string, [string, string][]> = {
  'eng.1': [['Arsenal', 'ARS'], ['Liverpool', 'LIV'], ['Manchester City', 'MCI'], ['Chelsea', 'CHE'], ['Newcastle United', 'NEW'], ['Aston Villa', 'AVL'], ['Tottenham Hotspur', 'TOT'], ['Brighton', 'BHA']],
  'esp.1': [['Real Madrid', 'RMA'], ['Barcelona', 'BAR'], ['Atlético Madrid', 'ATM'], ['Athletic Club', 'ATH'], ['Villarreal', 'VIL'], ['Real Sociedad', 'RSO'], ['Real Betis', 'BET'], ['Sevilla', 'SEV']],
  'uefa.champions': [['Bayern Munich', 'BAY'], ['Paris Saint-Germain', 'PSG'], ['Inter Milan', 'INT'], ['Real Madrid', 'RMA'], ['Arsenal', 'ARS'], ['Barcelona', 'BAR'], ['Borussia Dortmund', 'BVB'], ['Benfica', 'BEN']],
  'ind.1': [['Mohun Bagan SG', 'MBSG'], ['Mumbai City', 'MCFC'], ['FC Goa', 'FCG'], ['Bengaluru FC', 'BFC'], ['Kerala Blasters', 'KBFC'], ['East Bengal', 'EBFC'], ['Jamshedpur', 'JFC'], ['Odisha FC', 'OFC']],
  ipl: [['Mumbai Indians', 'MI'], ['Chennai Super Kings', 'CSK'], ['Royal Challengers Bengaluru', 'RCB'], ['Kolkata Knight Riders', 'KKR'], ['Sunrisers Hyderabad', 'SRH'], ['Gujarat Titans', 'GT'], ['Rajasthan Royals', 'RR'], ['Delhi Capitals', 'DC']],
  t20i: [['India', 'IND'], ['Australia', 'AUS'], ['England', 'ENG'], ['South Africa', 'SA'], ['New Zealand', 'NZ'], ['Pakistan', 'PAK'], ['Sri Lanka', 'SL'], ['West Indies', 'WI']],
  icc: [['India', 'IND'], ['Australia', 'AUS'], ['England', 'ENG'], ['South Africa', 'SA'], ['New Zealand', 'NZ'], ['Pakistan', 'PAK'], ['Afghanistan', 'AFG'], ['Bangladesh', 'BAN']],
};

const hour = 3_600_000;
const NOTE = 'Sample data — live feeds unreachable. Set GEMINI_API_KEY or check network.';

export function sampleScoreboard(league: League): Envelope<Match[]> {
  const t = TEAMS[league.id] ?? TEAMS['eng.1'];
  const cricket = league.sport === 'cricket';
  const now = Date.now();
  const mk = (i: number, status: Match['status'], offsetH: number, hs?: string, as?: string, clock?: string, extra?: Partial<Match>): Match => ({
    id: `sample-${league.id}-${i}`,
    league: league.id,
    status,
    clock,
    start: new Date(now + offsetH * hour).toISOString(),
    home: { name: t[i * 2 % t.length][0], short: t[i * 2 % t.length][1], score: hs },
    away: { name: t[(i * 2 + 1) % t.length][0], short: t[(i * 2 + 1) % t.length][1], score: as },
    ...extra,
  });
  const data = cricket
    ? [
        mk(0, 'live', -2, '186/5', '102/3', '11.4 ov', { note: 'Need 85 runs in 50 balls' }),
        mk(1, 'finished', -26, '171/8', '174/4', 'Result', { note: 'Won by 6 wickets (9 balls left)' }),
        mk(2, 'scheduled', 20),
        mk(3, 'scheduled', 44),
      ].map((m) => (m.status === 'live' ? { ...m, home: { ...m.home, detail: '20 ov' }, away: { ...m.away, detail: '11.4 ov' } } : m))
    : [
        mk(0, 'live', -1.1, '2', '1', "67'"),
        mk(1, 'live', -0.8, '0', '0', 'HT'),
        mk(2, 'finished', -22, '3', '1', 'FT'),
        mk(3, 'scheduled', 26),
      ];
  return { data, source: 'sample', fetchedAt: new Date().toISOString(), note: NOTE };
}

export function sampleStandings(league: League): Envelope<StandingRow[]> {
  const t = TEAMS[league.id] ?? TEAMS['eng.1'];
  const cricket = league.sport === 'cricket';
  const data = t.map(([team, short], i) => {
    const played = cricket ? 10 : 12;
    const won = Math.max(0, 9 - i);
    const drawn = cricket ? 0 : i % 3;
    const lost = played - won - drawn;
    return {
      rank: i + 1, team, short, played, won, drawn, lost,
      gd: cricket ? undefined : 18 - i * 5,
      nrr: cricket ? `${i < 4 ? '+' : '-'}${(Math.abs(0.9 - i * 0.25)).toFixed(3)}` : undefined,
      points: cricket ? won * 2 : won * 3 + drawn,
    };
  });
  return { data, source: 'sample', fetchedAt: new Date().toISOString(), note: NOTE };
}

export function sampleNews(sport: Sport): Envelope<NewsItem[]> {
  const data: NewsItem[] = [
    { headline: 'AI news feed is off', summary: 'Add GEMINI_API_KEY on the server to stream Search-grounded transfer, injury and squad news here.', tag: 'News' },
    { headline: sport === 'cricket' ? 'Scores still update from ESPN' : 'Scores and tables still update from ESPN', summary: 'Public ESPN and TheSportsDB feeds need no keys and keep working without Gemini.', tag: 'News' },
  ];
  return { data, source: 'sample', fetchedAt: new Date().toISOString(), note: NOTE };
}
