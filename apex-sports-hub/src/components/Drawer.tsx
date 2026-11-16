import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Clock, ExternalLink, MapPin, Shield, X } from 'lucide-react';
import type { Match, TeamProfile } from '../lib/types.ts';
import { useApi } from '../lib/api.ts';
import { cx, kickoff } from '../lib/format.ts';
import { Crest, Empty, LiveBadge, Score, Skeleton, SourceBadge } from './ui.tsx';
import { AskAssistant, MatchCentre } from './MatchCentre.tsx';

export function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus();
    };
  }, [open, onClose]);
  return (
    <div className={cx('fixed inset-0 z-50', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div onClick={onClose} className={cx('absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} />
      <div
        ref={ref}
        role="dialog"
        aria-modal
        aria-label={label}
        tabIndex={-1}
        className={cx(
          'absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out outline-none',
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-3xl',
          open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-full sm:translate-y-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function CloseBar({ onClose, onBack, title }: { onClose: () => void; onBack?: () => void; title: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-slate-950/90 px-3 py-3 backdrop-blur">
      {onBack && (
        <button onClick={onBack} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Back to match">
          <ArrowLeft className="size-4" />
        </button>
      )}
      <span className="flex-1 truncate px-1 text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
      <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function MatchDetail({ m, leagueId, leagueName, onClose, onTeam }: { m: Match; leagueId: string; leagueName: string; onClose: () => void; onTeam: (n: string) => void }) {
  const k = kickoff(m.start);
  return (
    <>
      <CloseBar onClose={onClose} title={leagueName} />
      <div className="relative overflow-hidden px-5 pt-8 pb-6">
        <div className={cx('pointer-events-none absolute inset-x-0 -top-24 mx-auto size-64 rounded-full blur-3xl', m.status === 'live' ? 'bg-live/15' : 'bg-sky-500/10')} />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          {(['home', 'away'] as const).map((s) => (
            <button key={s} onClick={() => onTeam(m[s].name)} className={cx('group flex flex-col items-center gap-2 text-center', s === 'away' && 'col-start-3')}>
              <Crest src={m[s].logo} name={m[s].name} size={64} />
              <span className="text-sm font-semibold text-slate-100 group-hover:text-live">{m[s].name}</span>
              {m[s].detail && <span className="text-xs tabular-nums text-slate-500">{m[s].detail}</span>}
            </button>
          ))}
          <div className="col-start-2 row-start-1 flex flex-col items-center gap-2 pt-3">
            {m.status === 'scheduled' ? (
              <>
                <span className="text-3xl font-black tabular-nums">{k.time}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500">{k.day}</span>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2 text-4xl font-black">
                  <Score value={m.home.score} />
                  <span className="text-slate-600">–</span>
                  <Score value={m.away.score} />
                </div>
                {m.status === 'live' ? <LiveBadge label={m.clock ? `LIVE · ${m.clock}` : 'LIVE'} /> : <span className="text-xs font-semibold text-slate-500">Full time</span>}
              </>
            )}
          </div>
        </div>
        {m.note && <p className="relative mt-5 rounded-xl bg-white/5 px-3 py-2 text-center text-sm text-slate-300 ring-1 ring-white/10">{m.note}</p>}
      </div>
      <dl className="mx-5 mb-6 divide-y divide-white/5 rounded-2xl bg-white/[0.03] text-sm ring-1 ring-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Clock className="size-4 text-slate-500" />
          <dt className="sr-only">Kick-off</dt>
          <dd className="tabular-nums text-slate-300">{new Date(m.start).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</dd>
        </div>
        {m.venue && (
          <div className="flex items-center gap-3 px-4 py-3">
            <MapPin className="size-4 text-slate-500" />
            <dt className="sr-only">Venue</dt>
            <dd className="text-slate-300">{m.venue}</dd>
          </div>
        )}
      </dl>
      <div className="grid grid-cols-2 gap-2 px-5 pb-6">
        {(['home', 'away'] as const).map((s) => (
          <button key={s} onClick={() => onTeam(m[s].name)} className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white">
            <Shield className="size-3.5" />
            <span className="truncate">{m[s].short || m[s].name} profile</span>
          </button>
        ))}
      </div>
      <MatchCentre leagueId={leagueId} matchId={m.id} live={m.status === 'live'} />
    </>
  );
}

export interface StoredMatch {
  id: string; league: string; start: string; status: 'live' | 'scheduled' | 'finished';
  home: string; away: string; homeShort: string | null; awayShort: string | null;
  homeScore: string | null; awayScore: string | null; homeLogo: string | null; awayLogo: string | null;
  clock: string | null; venue: string | null; note: string | null;
}
interface ClubData {
  name: string;
  record: { form: ('W' | 'D' | 'L')[]; w: number; d: number; l: number; gf: number; ga: number };
  past: StoredMatch[];
  upcoming: StoredMatch[];
  profile: TeamProfile | null;
}

const FORM: Record<string, string> = {
  W: 'bg-live text-slate-950',
  D: 'bg-slate-500 text-white',
  L: 'bg-rose-500 text-white',
};

function ResultRow({ m, club }: { m: StoredMatch; club: string }) {
  const home = m.home === club;
  const us = home ? m.homeScore : m.awayScore;
  const them = home ? m.awayScore : m.homeScore;
  const won = Number(us) > Number(them);
  const lost = Number(us) < Number(them);
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-xs">
      <span className="w-14 shrink-0 tabular-nums text-slate-500">{new Date(m.start).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })}</span>
      <span className="min-w-0 flex-1 truncate text-slate-300">
        {home ? 'vs' : '@'} {home ? m.away : m.home}
      </span>
      <span className={cx('w-12 text-center font-bold tabular-nums', won ? 'text-live' : lost ? 'text-rose-300' : 'text-slate-400')}>
        {us ?? '–'}–{them ?? '–'}
      </span>
      <span className={cx('grid size-5 place-items-center rounded text-[10px] font-bold', won ? FORM.W : lost ? FORM.L : FORM.D)}>{won ? 'W' : lost ? 'L' : 'D'}</span>
    </li>
  );
}

export function TeamDetail({ name, onClose, onBack, now }: { name: string; onClose: () => void; onBack?: () => void; now: number }) {
  const { data, loading, error } = useApi<ClubData>(`/api/club?name=${encodeURIComponent(name)}`);
  const c = data?.data;
  const t = c?.profile;
  const [tab, setTab] = useState<'overview' | 'results' | 'squad' | 'ask'>('overview');
  const tabs: [typeof tab, string][] = [['overview', 'Overview'], ['results', 'Results'], ['squad', 'Squad'], ['ask', 'Ask AI']];

  const context = c
    ? [
        `Club: ${name}`,
        `Last ${c.record.form.length} form: ${c.record.form.join(' ') || 'none'}; W${c.record.w} D${c.record.d} L${c.record.l}, GF ${c.record.gf} GA ${c.record.ga}`,
        c.past.length && `Recent results: ${c.past.slice(0, 10).map((m) => `${new Date(m.start).toISOString().slice(0, 10)} ${m.home} ${m.homeScore ?? '-'}-${m.awayScore ?? '-'} ${m.away} (${m.league})`).join('; ')}`,
        c.upcoming.length && `Upcoming: ${c.upcoming.slice(0, 5).map((m) => `${m.start.slice(0, 10)} ${m.home} v ${m.away}`).join('; ')}`,
        t?.stadium && `Ground: ${t.stadium}`,
        t?.founded && `Founded: ${t.founded}`,
        t?.league && `League: ${t.league}`,
        t?.description && `About: ${t.description.slice(0, 800)}`,
        t?.players.length && `Squad: ${t.players.slice(0, 25).map((p) => p.name).join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <>
      <CloseBar onClose={onClose} onBack={onBack} title="Club profile" />
      {loading && !c ? (
        <div className="space-y-4 p-5">
          <Skeleton className="h-32" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      ) : error || !c ? (
        <Empty icon={<Shield className="size-8" />} title={`No data found for ${name}`} body="Check the spelling, or try again in a minute." />
      ) : (
        <>
          <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
            {t?.banner && <img src={t.banner} alt="" className="size-full object-cover opacity-40" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
          </div>
          <div className="relative -mt-12 px-5">
            <Crest src={t?.badge} name={c.name} size={80} />
            <h2 className="mt-3 text-2xl font-bold tracking-tight">{c.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {t?.league && <span>{t.league}</span>}
              {t?.country && <span>· {t.country}</span>}
              <SourceBadge source={data?.source} at={data?.fetchedAt} now={now} />
            </div>
            {c.record.form.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <Stat label="Form" value={<span className="flex justify-center gap-1">{c.record.form.map((r, i) => <span key={i} className={cx('grid size-5 place-items-center rounded text-[10px] font-bold', FORM[r])}>{r}</span>)}</span>} />
                <Stat label="W-D-L" value={`${c.record.w}-${c.record.d}-${c.record.l}`} />
                <Stat label="Scored" value={String(c.record.gf)} />
                <Stat label="Conceded" value={String(c.record.ga)} />
              </div>
            )}
          </div>

          <div className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-white/5 px-4 pb-2" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition', tab === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200')}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="px-5 pt-5 pb-8">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {t?.stadium && <Stat label="Ground" value={t.stadium} />}
                {t?.founded && <Stat label="Founded" value={t.founded} />}
              </dl>
              {t?.description && <p className="mt-4 text-sm leading-relaxed text-slate-400">{t.description}</p>}
              {t?.website && (
                <a href={t.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-live hover:underline">
                  Official site <ExternalLink className="size-3" />
                </a>
              )}
              {c.upcoming.length > 0 && (
                <>
                  <h3 className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Next fixtures</h3>
                  <ul className="divide-y divide-white/5 rounded-xl ring-1 ring-white/10">
                    {c.upcoming.slice(0, 5).map((m) => (
                      <li key={m.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="truncate text-slate-300">{m.home} v {m.away}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">{new Date(m.start).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {c.past.length === 0 && !c.upcoming.length && <p className="mt-4 text-xs text-slate-500">No stored matches for this club yet. The archive fills in from the feeds in the background.</p>}
            </div>
          )}

          {tab === 'results' && (
            <div className="pb-8">
              <p className="px-5 pt-4 pb-2 text-[11px] text-slate-500">{c.past.length} stored results · archive updates every 10 minutes</p>
              {c.past.length ? (
                <ul className="divide-y divide-white/5">
                  {c.past.map((m) => <ResultRow key={m.id} m={m} club={c.name} />)}
                </ul>
              ) : (
                <Empty icon={<Shield className="size-8" />} title="No results stored yet" body="The archive is still backfilling, or this club plays in a competition we don't track." />
              )}
            </div>
          )}

          {tab === 'squad' && (
            <div className="px-5 pt-5 pb-8">
              {t?.players.length ? (
                <ul className="grid grid-cols-2 gap-2">
                  {t.players.map((p) => (
                    <li key={p.name} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-2 ring-1 ring-white/10">
                      <Crest src={p.thumb} name={p.name} size={32} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-200">{p.name}</p>
                        <p className="truncate text-[10px] text-slate-500">
                          {p.number && <span className="tabular-nums">#{p.number} · </span>}
                          {p.position}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Squad list isn't available on TheSportsDB's free tier for this club.</p>
              )}
            </div>
          )}

          {tab === 'ask' && (
            <AskAssistant leagueId="" matchId="" scope={`Club profile: ${c.name}`} context={context} />
          )}
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-semibold tabular-nums text-slate-200">{value}</div>
    </div>
  );
}
