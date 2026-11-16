import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Radio } from 'lucide-react';
import type { Match, MatchStatus } from '../lib/types.ts';
import { cx, kickoff } from '../lib/format.ts';
import { Crest, Empty, LiveBadge, Score, Skeleton } from './ui.tsx';

function StatusCell({ m }: { m: Match }) {
  if (m.status === 'live')
    return (
      <div className="flex flex-col items-center gap-1">
        <LiveBadge label="LIVE" />
        <span className="text-xs font-semibold tabular-nums text-live">{m.clock}</span>
      </div>
    );
  if (m.status === 'finished') return <span className="text-xs font-semibold tabular-nums text-slate-500">{m.clock && m.clock.length <= 6 ? m.clock : 'FT'}</span>;
  const k = kickoff(m.start);
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-200">{k.time}</span>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{k.day}</span>
    </div>
  );
}

function TeamLine({ m, side, cricket }: { m: Match; side: 'home' | 'away'; cricket: boolean }) {
  const t = m[side];
  const other = m[side === 'home' ? 'away' : 'home'];
  const lost = m.status === 'finished' && (other.winner || (!cricket && Number(other.score) > Number(t.score)));
  return (
    <div className={cx('flex items-center gap-3', lost && 'opacity-55')}>
      <Crest src={t.logo} name={t.name} size={24} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{t.name}</span>
      {t.detail && <span className="text-[11px] tabular-nums text-slate-500">{t.detail}</span>}
      <Score value={m.status === 'scheduled' ? undefined : t.score} className={cx('min-w-8 text-right text-base font-bold', m.status === 'live' ? 'text-white' : 'text-slate-300', m.status === 'scheduled' && 'text-slate-600')} />
    </div>
  );
}

export function MatchRow({ m, cricket, onOpen }: { m: Match; cricket: boolean; onOpen: (m: Match) => void }) {
  return (
    <button
      onClick={() => onOpen(m)}
      className={cx(
        'group grid w-full grid-cols-[72px_1fr_16px] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none',
        m.status === 'live' && 'bg-live/[0.03]',
      )}
    >
      <StatusCell m={m} />
      <div className="min-w-0 space-y-1.5">
        <TeamLine m={m} side="home" cricket={cricket} />
        <TeamLine m={m} side="away" cricket={cricket} />
        {m.note && <p className="truncate pt-0.5 text-[11px] text-slate-500">{m.note}</p>}
      </div>
      <ChevronRight className="size-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
    </button>
  );
}

/** Large broadcast card for the "Live now" strip. */
export function LiveCard({ m, leagueName, onOpen }: { m: Match; leagueName: string; onOpen: (m: Match) => void }) {
  return (
    <button
      onClick={() => onOpen(m)}
      className="glass relative w-[280px] shrink-0 snap-start overflow-hidden p-4 text-left transition hover:border-live/40 focus-visible:border-live/60 focus-visible:outline-none sm:w-[320px]"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-live/10 blur-3xl" />
      <div className="mb-4 flex items-center justify-between">
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">{leagueName}</span>
        <LiveBadge />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {(['home', 'away'] as const).map((s, i) => (
          <div key={s} className={cx('flex flex-col items-center gap-2 text-center', i === 1 && 'col-start-3')}>
            <Crest src={m[s].logo} name={m[s].name} size={44} />
            <span className="line-clamp-1 text-xs font-medium text-slate-300">{m[s].short || m[s].name}</span>
          </div>
        ))}
        <div className="col-start-2 row-start-1 flex flex-col items-center">
          <div className={cx('flex items-baseline gap-2 font-black tracking-tight', Math.max(m.home.score?.length ?? 0, m.away.score?.length ?? 0) > 3 ? 'text-xl' : 'text-3xl')}>
            <Score value={m.home.score} />
            <span className="text-slate-600">:</span>
            <Score value={m.away.score} />
          </div>
          <span className="mt-1 text-xs font-semibold tabular-nums text-live">{m.clock}</span>
        </div>
      </div>
      {m.note && <p className="mt-3 truncate text-center text-[11px] text-slate-400">{m.note}</p>}
    </button>
  );
}

const FILTERS: { id: 'all' | MatchStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'finished', label: 'Results' },
  { id: 'scheduled', label: 'Fixtures' },
];

export function MatchList({ matches, loading, cricket, onOpen }: { matches?: Match[]; loading: boolean; cricket: boolean; onOpen: (m: Match) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const counts = useMemo(() => {
    const c = { all: 0, live: 0, finished: 0, scheduled: 0 };
    for (const m of matches ?? []) {
      c.all++;
      c[m.status]++;
    }
    return c;
  }, [matches]);

  const groups = useMemo(() => {
    const order: Record<MatchStatus, number> = { live: 0, scheduled: 1, finished: 2 };
    const list = (matches ?? [])
      .filter((m) => filter === 'all' || m.status === filter)
      .sort((a, b) => order[a.status] - order[b.status] || (a.status === 'finished' ? Date.parse(b.start) - Date.parse(a.start) : Date.parse(a.start) - Date.parse(b.start)));
    const map = new Map<string, Match[]>();
    for (const m of list) {
      const key = m.status === 'live' ? 'Live now' : kickoff(m.start).day;
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [matches, filter]);

  return (
    <div>
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-white/5 px-3 py-2" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
              filter === f.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )}
          >
            {f.label}
            <span className={cx('rounded px-1 text-[10px] tabular-nums', f.id === 'live' && counts.live ? 'bg-live/20 text-live' : 'bg-white/5 text-slate-500')}>{counts[f.id]}</span>
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Empty
          icon={filter === 'live' ? <Radio className="size-8" /> : <CalendarDays className="size-8" />}
          title={filter === 'live' ? 'Nothing live right now' : 'No matches in this window'}
          body="The feed covers recent results and the next few days of fixtures."
        />
      ) : (
        groups.map(([day, list]) => (
          <div key={day}>
            <h3 className="sticky top-0 z-10 bg-slate-900/90 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 backdrop-blur">{day}</h3>
            <div className="divide-y divide-white/5">
              {list.map((m) => (
                <MatchRow key={m.id} m={m} cricket={cricket} onOpen={onOpen} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
