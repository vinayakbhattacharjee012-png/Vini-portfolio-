import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, LayoutGrid, ListOrdered, Newspaper, Radio, RefreshCw, Search, Trophy, Zap } from 'lucide-react';
import { LEAGUES, leagueById, type Envelope, type Match, type NewsItem, type Sport, type StandingRow } from './lib/types.ts';
import { useApi, useNow } from './lib/api.ts';
import { cx } from './lib/format.ts';
import { LiveCard, MatchList } from './components/Matches.tsx';
import { Standings } from './components/Standings.tsx';
import { News } from './components/News.tsx';
import { Drawer, MatchDetail, TeamDetail } from './components/Drawer.tsx';
import { LiveBadge, Panel, SourceBadge } from './components/ui.tsx';

type View = 'matches' | 'table' | 'news';

const readHash = () => {
  const [sport, league] = location.hash.slice(1).split('/');
  const l = leagueById(league ?? '');
  if (l) return { sport: l.sport, league: l.id };
  const s: Sport = sport === 'cricket' ? 'cricket' : 'football';
  return { sport: s, league: LEAGUES.find((x) => x.sport === s)!.id };
};

const pollScores = (d?: Envelope<Match[]>) => (d?.data.some((m) => m.status === 'live') ? 30_000 : 120_000);

export default function App() {
  const [{ sport, league }, setSel] = useState(readHash);
  const [view, setView] = useState<View>('matches');
  const [match, setMatch] = useState<Match | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const now = useNow(5000);

  const lg = leagueById(league)!;
  const cricket = sport === 'cricket';

  useEffect(() => {
    history.replaceState(null, '', `#${sport}/${league}`);
  }, [sport, league]);

  const scores = useApi<Match[]>(`/api/scoreboard?league=${league}`, pollScores);
  const table = useApi<StandingRow[]>(lg.hasTable ? `/api/standings?league=${league}` : null, 10 * 60_000);
  const news = useApi<NewsItem[]>(`/api/news?sport=${sport}`, 5 * 60_000);
  const [gemini, setGemini] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => setGemini(Boolean(h.gemini)))
      .catch(() => setGemini(null));
  }, []);

  const live = useMemo(() => scores.data?.data.filter((m) => m.status === 'live') ?? [], [scores.data]);

  // keep an open match drawer in sync with polled scores
  const openMatch = match ? (scores.data?.data.find((m) => m.id === match.id) ?? match) : null;

  const pickSport = (s: Sport) => setSel({ sport: s, league: LEAGUES.find((l) => l.sport === s)!.id });
  const closeAll = useCallback(() => {
    setMatch(null);
    setTeam(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const matchesPanel = (
    <Panel
      title="Matches"
      icon={<Activity className="size-4 text-live" />}
      right={
        <>
          <SourceBadge source={scores.data?.source} at={scores.data?.fetchedAt} now={now} note={scores.data?.note} />
          <button onClick={scores.refresh} className="rounded-md p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200" aria-label="Refresh scores">
            <RefreshCw className={cx('size-3.5', scores.refreshing && 'animate-spin')} />
          </button>
        </>
      }
    >
      <MatchList matches={scores.data?.data} loading={scores.loading} cricket={cricket} onOpen={setMatch} />
      {scores.error && !scores.data && <p className="px-4 pb-4 text-xs text-rose-300">Couldn't load matches: {scores.error}</p>}
    </Panel>
  );

  const tablePanel = (
    <Panel title={cricket ? 'Points table' : 'Standings'} icon={<Trophy className="size-4 text-amber-300" />} right={<SourceBadge source={table.data?.source} at={table.data?.fetchedAt} now={now} note={table.data?.note} />}>
      <Standings rows={lg.hasTable ? table.data?.data : []} loading={lg.hasTable && table.loading} cricket={cricket} onTeam={setTeam} compact={view !== 'table'} />
    </Panel>
  );

  const newsPanel = (
    <Panel title="Breaking" icon={<Newspaper className="size-4 text-violet-300" />} right={<SourceBadge source={news.data?.source} at={news.data?.fetchedAt} now={now} note={news.data?.note} />}>
      <News items={news.data?.data} citations={news.data?.citations} loading={news.loading} />
    </Panel>
  );

  return (
    <div className="min-h-dvh bg-obsidian bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.10),transparent)] pb-24 lg:pb-10">
      {/* ── top bar ── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-obsidian/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <a href="#" className="flex items-center gap-2" aria-label="Apex Sports Hub">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-live to-emerald-700 shadow-lg shadow-live/20">
              <Zap className="size-4 fill-white text-white" />
            </span>
            <span className="hidden text-sm font-bold tracking-tight sm:block">
              Apex <span className="text-slate-400">Sports Hub</span>
            </span>
          </a>

          <div className="ml-1 flex rounded-xl bg-white/5 p-1 ring-1 ring-white/10" role="tablist" aria-label="Sport">
            {(['football', 'cricket'] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={sport === s}
                onClick={() => pickSport(s)}
                className={cx('rounded-lg px-3 py-1 text-xs font-semibold capitalize transition', sport === s ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white')}
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="relative ml-auto w-full max-w-60"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) setTeam(query.trim());
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams"
              aria-label="Search teams"
              className="w-full rounded-xl bg-white/5 py-2 pr-8 pl-8 text-xs text-slate-100 ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-live/50 focus:outline-none"
            />
            <kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-white/10 px-1 text-[10px] text-slate-500 sm:block">/</kbd>
          </form>
        </div>

        {/* league rail */}
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Competitions">
          {LEAGUES.filter((l) => l.sport === sport).map((l) => (
            <button
              key={l.id}
              onClick={() => setSel({ sport, league: l.id })}
              className={cx(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 transition',
                league === l.id ? 'bg-live/15 text-live ring-live/40' : 'bg-white/[0.03] text-slate-400 ring-white/10 hover:text-slate-200',
              )}
            >
              <span className="sm:hidden">{l.short}</span>
              <span className="hidden sm:inline">{l.name}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6">
        {/* hero */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{cricket ? 'Cricket' : 'Football'}</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{lg.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {live.length > 0 ? <LiveBadge label={`${live.length} LIVE`} /> : <span className="inline-flex items-center gap-1.5"><Radio className="size-3.5" /> No live matches</span>}
            {gemini === false && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/30" title="Set GEMINI_API_KEY on the server to enable Search-grounded news and cricket coverage">
                AI grounding off
              </span>
            )}
          </div>
        </div>

        {scores.data?.source === 'sample' && (
          <p className="mb-5 rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 ring-1 ring-amber-500/30">
            Showing sample data: the live feeds for {lg.name} couldn't be reached{gemini ? '' : ' and Gemini grounding is off'}. Scores below are not real.
          </p>
        )}

        {live.length > 0 && (
          <section aria-label="Live now" className="mb-6">
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {live.map((m) => (
                <LiveCard key={m.id} m={m} leagueName={lg.name} onOpen={setMatch} />
              ))}
            </div>
          </section>
        )}

        {/* desktop: 3-column broadcast grid · mobile: one panel at a time */}
        <div className="hidden gap-5 lg:grid lg:grid-cols-12">
          <div className="lg:col-span-7">{matchesPanel}</div>
          <div className="space-y-5 lg:col-span-5">
            {tablePanel}
            {newsPanel}
          </div>
        </div>
        <div className="lg:hidden">{view === 'matches' ? matchesPanel : view === 'table' ? tablePanel : newsPanel}</div>
      </main>

      {/* mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-obsidian/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Sections">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {(
            [
              ['matches', 'Matches', LayoutGrid],
              ['table', 'Table', ListOrdered],
              ['news', 'News', Newspaper],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id)} className={cx('relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium', view === id ? 'text-live' : 'text-slate-500')}>
              <Icon className="size-5" />
              {label}
              {id === 'matches' && live.length > 0 && <span className="absolute top-2 right-[calc(50%-18px)] size-2 rounded-full bg-live ring-2 ring-obsidian" />}
            </button>
          ))}
        </div>
      </nav>

      <Drawer open={Boolean(openMatch || team)} onClose={closeAll} label={team ? `${team} profile` : 'Match details'}>
        {team ? (
          <TeamDetail key={team} name={team} now={now} onClose={closeAll} onBack={openMatch ? () => setTeam(null) : undefined} />
        ) : openMatch ? (
          <MatchDetail m={openMatch} leagueName={lg.name} onClose={closeAll} onTeam={setTeam} />
        ) : null}
      </Drawer>

      <footer className="mx-auto max-w-7xl px-4 pt-10 text-center text-[11px] text-slate-600">
        Data: ESPN public scoreboards · TheSportsDB · Gemini with Google Search grounding. Not affiliated with any league.
      </footer>
    </div>
  );
}
