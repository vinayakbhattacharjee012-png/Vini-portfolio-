import { useState, type FormEvent } from 'react';
import { Bot, Send, Users, Whistle, MapPin, Activity, MessageSquareText, Info } from 'lucide-react';
import { useApi } from '../lib/api.ts';
import { cx } from '../lib/format.ts';
import type { Citation } from '../lib/types.ts';
import { Empty, LiveBadge, Skeleton } from './ui.tsx';

// Mirrors server/match.ts
export interface MatchCentreData {
  venue?: string;
  city?: string;
  attendance?: number;
  officials: { name: string; role?: string }[];
  lineups: { team: string; formation?: string; players: { name: string; jersey?: string; position?: string; starter: boolean; subbedIn?: boolean; subbedOut?: boolean }[] }[];
  keyEvents: { clock: string; type: string; text: string; team?: string }[];
  commentary: { time: string; text: string }[];
  stats: { label: string; home: string; away: string }[];
  teams: [string, string];
}

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="px-5 py-4">
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

export function MatchCentre({ leagueId, matchId, live }: { leagueId: string; matchId: string; live: boolean }) {
  const isLive = !/^(sample-|g-)/.test(matchId);
  const { data, loading, error } = useApi<MatchCentreData>(isLive ? `/api/match?league=${leagueId}&id=${matchId}` : null, 60_000);
  const d = data?.data;

  if (!isLive)
    return (
      <Empty icon={<Info className="size-6" />} title="Match centre unavailable" body="Sample and AI-found fixtures have no live feed. Real ESPN matches get lineups, commentary and officials here." />
    );

  return (
    <div className="divide-y divide-white/5 border-y border-white/5">
      <div className="flex items-center justify-between px-5 py-3 text-[11px] text-slate-500">
        <span>Match centre · refreshes every minute</span>
        {live && <LiveBadge label="LIVE" />}
      </div>

      {loading && (
        <div className="space-y-3 p-5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20" />
        </div>
      )}
      {error && !d && <p className="px-5 py-4 text-xs text-rose-300">Couldn't load match centre: {error}</p>}

      {d && (
        <>
          <Section icon={<MapPin className="size-3.5" />} title="Venue & officials">
            <p className="text-sm text-slate-200">{d.venue ?? 'Venue TBC'}{d.city ? `, ${d.city}` : ''}</p>
            {d.attendance !== undefined && <p className="mt-1 text-xs tabular-nums text-slate-500">Attendance {d.attendance.toLocaleString()}</p>}
            {d.officials.length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {d.officials.map((o) => (
                  <li key={o.name + o.role} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/10">
                    <Whistle className="size-3.5 text-amber-300" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-200">{o.name}</p>
                      <p className="truncate text-[10px] text-slate-500">{o.role ?? 'Official'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {d.stats.length > 0 && (
            <Section icon={<Activity className="size-3.5" />} title="Team stats">
              <table className="w-full text-xs tabular-nums">
                <tbody>
                  {d.stats.map((s) => (
                    <tr key={s.label} className="border-b border-white/[0.03]">
                      <td className="py-1.5 text-right font-semibold text-slate-200">{s.home}</td>
                      <td className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wide text-slate-500">{s.label}</td>
                      <td className="py-1.5 text-left font-semibold text-slate-200">{s.away}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {d.keyEvents.length > 0 && (
            <Section icon={<Activity className="size-3.5" />} title="Key events">
              <ol className="space-y-2">
                {d.keyEvents.map((e, i) => (
                  <li key={i} className="flex gap-3 text-xs">
                    <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-live">{e.clock}</span>
                    <span className="text-slate-300">
                      <span className="font-medium text-slate-100">{e.type}</span>
                      {e.text && <span className="text-slate-500"> · {e.text}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {d.lineups.length > 0 && (
            <Section icon={<Users className="size-3.5" />} title="Lineups">
              <div className="grid grid-cols-2 gap-4">
                {d.lineups.map((t) => (
                  <div key={t.team} className="min-w-0">
                    <p className="mb-2 truncate text-xs font-semibold text-slate-200">
                      {t.team} {t.formation && <span className="font-normal text-slate-500">· {t.formation}</span>}
                    </p>
                    <ul className="space-y-1">
                      {t.players
                        .filter((p) => p.starter)
                        .map((p) => (
                          <li key={p.name} className={cx('flex items-center gap-2 text-[11px]', p.subbedOut && 'text-slate-500')}>
                            <span className="w-5 text-right tabular-nums text-slate-500">{p.jersey}</span>
                            <span className="truncate text-slate-200">{p.name}</span>
                            {p.subbedOut && <span className="text-rose-300">▼</span>}
                          </li>
                        ))}
                    </ul>
                    {t.players.some((p) => !p.starter) && (
                      <p className="mt-2 text-[10px] text-slate-500">Bench: {t.players.filter((p) => !p.starter).map((p) => p.name).join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {d.commentary.length > 0 && (
            <Section icon={<MessageSquareText className="size-3.5" />} title="Live commentary">
              <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                {d.commentary.slice(0, 40).map((c, i) => (
                  <li key={i} className="flex gap-3 text-xs leading-relaxed">
                    <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-slate-500">{c.time}</span>
                    <span className="text-slate-300">{c.text}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section icon={<Activity className="size-3.5" />} title="Heat maps & interceptions">
            <p className="text-xs leading-relaxed text-slate-500">
              Heat maps, pass networks and interception counts come from paid tracking providers (such as Opta or StatsBomb). The free feeds don't include them, so they aren't shown here rather than guessed.
            </p>
          </Section>
        </>
      )}

      <AskAssistant leagueId={leagueId} matchId={matchId} context={d} />
    </div>
  );
}

function AskAssistant({ leagueId, matchId, context }: { leagueId: string; matchId: string; context?: MatchCentreData }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ q: string; text: string; citations?: Citation[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const suggestions = ['Who is the referee and how are they known?', 'Summarise the tactics so far', 'Who are the key players to watch?'];

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const summary = context
      ? [
          `Teams: ${context.teams.join(' vs ')}`,
          context.venue && `Venue: ${context.venue}`,
          context.officials.length && `Officials: ${context.officials.map((o) => `${o.name} (${o.role ?? 'official'})`).join(', ')}`,
          context.stats.length && `Stats: ${context.stats.map((s) => `${s.label} ${s.home}-${s.away}`).join('; ')}`,
          context.keyEvents.length && `Key events: ${context.keyEvents.slice(-8).map((e) => `${e.clock} ${e.type} ${e.text}`).join('; ')}`,
          context.lineups.length && `Lineups: ${context.lineups.map((t) => `${t.team}: ${t.players.filter((p) => p.starter).map((p) => p.name).join(', ')}`).join(' | ')}`,
        ]
          .filter(Boolean)
          .join('\n')
      : '';
    try {
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, league: leagueId, matchId, context: summary }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setAnswer({ q: question, text: body.answer, citations: body.citations });
      setQ('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
  };

  return (
    <div className="px-5 py-4">
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        <Bot className="size-3.5 text-violet-300" /> Ask Apex AI
      </h3>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={300}
          placeholder="Ask about this match…"
          aria-label="Ask about this match"
          className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-100 ring-1 ring-white/10 placeholder:text-slate-500 focus:ring-violet-400/50 focus:outline-none"
        />
        <button disabled={busy || !q.trim()} className="grid place-items-center rounded-xl bg-violet-500/20 px-3 text-violet-200 ring-1 ring-violet-400/30 transition hover:bg-violet-500/30 disabled:opacity-40" aria-label="Send question">
          <Send className="size-3.5" />
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} onClick={() => ask(s)} disabled={busy} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-white/10 transition hover:text-slate-200 disabled:opacity-40">
            {s}
          </button>
        ))}
      </div>
      {busy && <p className="mt-3 animate-pulse text-xs text-violet-300">Searching live sources…</p>}
      {err && <p className="mt-3 text-xs text-rose-300">{err}</p>}
      {answer && (
        <div className="mt-3 rounded-xl bg-violet-500/5 p-3 ring-1 ring-violet-400/20">
          <p className="text-[11px] text-slate-500">Q: {answer.q}</p>
          <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-line text-slate-200">{answer.text}</p>
          {!!answer.citations?.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {answer.citations.map((c) => (
                <a key={c.uri} href={c.uri} target="_blank" rel="noreferrer" className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-200">
                  {c.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
