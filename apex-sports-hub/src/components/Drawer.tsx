import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, Clock, ExternalLink, MapPin, Shield, Users, X } from 'lucide-react';
import type { Match, TeamProfile } from '../lib/types.ts';
import { useApi } from '../lib/api.ts';
import { cx, kickoff } from '../lib/format.ts';
import { Crest, Empty, LiveBadge, Score, Skeleton, SourceBadge } from './ui.tsx';
import { MatchCentre } from './MatchCentre.tsx';

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

export function TeamDetail({ name, onClose, onBack, now }: { name: string; onClose: () => void; onBack?: () => void; now: number }) {
  const { data, loading, error } = useApi<TeamProfile>(`/api/team?name=${encodeURIComponent(name)}`);
  const t = data?.data;
  return (
    <>
      <CloseBar onClose={onClose} onBack={onBack} title="Team profile" />
      {loading ? (
        <div className="space-y-4 p-5">
          <Skeleton className="h-32" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      ) : error || !t ? (
        <Empty icon={<Shield className="size-8" />} title={`No profile found for ${name}`} body="TheSportsDB's free tier may be rate-limited. Try again in a minute." />
      ) : (
        <>
          <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
            {t.banner && <img src={t.banner} alt="" className="size-full object-cover opacity-40" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
          </div>
          <div className="relative -mt-12 px-5">
            <Crest src={t.badge} name={t.name} size={80} />
            <h2 className="mt-3 text-2xl font-bold tracking-tight">{t.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {t.league && <span>{t.league}</span>}
              {t.country && <span>· {t.country}</span>}
              <SourceBadge source={data?.source} at={data?.fetchedAt} now={now} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {t.stadium && (
                <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                  <dt className="text-slate-500">Ground</dt>
                  <dd className="mt-0.5 font-medium text-slate-200">{t.stadium}</dd>
                </div>
              )}
              {t.founded && (
                <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                  <dt className="text-slate-500">Founded</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-slate-200">{t.founded}</dd>
                </div>
              )}
            </dl>
            {t.description && <p className="mt-4 line-clamp-6 text-sm leading-relaxed text-slate-400">{t.description}</p>}
            {t.website && (
              <a href={t.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-live hover:underline">
                Official site <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <div className="px-5 pt-6 pb-8">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <Users className="size-3.5" /> Squad
            </h3>
            {t.players.length ? (
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
              <p className="text-xs text-slate-500">Squad list isn't available on TheSportsDB's free tier for this team.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
