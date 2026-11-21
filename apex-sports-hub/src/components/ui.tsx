import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Database, Sparkles } from 'lucide-react';
import type { Source } from '../lib/types.ts';
import { ago, cx, initials } from '../lib/format.ts';

export function LiveBadge({ label = 'LIVE', className }: { label?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-live ring-1 ring-live/30', className)}>
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-live" />
      </span>
      {label}
    </span>
  );
}

export function Crest({ src, name, size = 28 }: { src?: string; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken)
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 font-bold text-slate-300 ring-1 ring-white/10"
        aria-hidden
      >
        {initials(name) || '?'}
      </span>
    );
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      style={{ width: size, height: size }}
      className="shrink-0 object-contain drop-shadow"
    />
  );
}

/** Score digit that flashes emerald whenever its value changes. */
export function Score({ value, className }: { value?: string; className?: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (prev.current !== undefined && value !== prev.current) setFlash((f) => f + 1);
    prev.current = value;
  }, [value]);
  return (
    <span key={flash} className={cx('inline-block tabular-nums', flash > 0 && 'animate-score-flash', className)}>
      {value ?? '–'}
    </span>
  );
}

const SOURCE_LABEL: Record<Source, string> = {
  espn: 'ESPN',
  thesportsdb: 'TheSportsDB',
  gemini: 'Gemini · Search',
  sample: 'Sample',
};

export function SourceBadge({ source, at, now, note }: { source?: Source; at?: string; now: number; note?: string }) {
  if (!source) return null;
  const Icon = source === 'gemini' ? Sparkles : Database;
  return (
    <span
      title={note}
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ring-1',
        source === 'sample' ? 'bg-amber-500/10 text-amber-300 ring-amber-500/30' : source === 'gemini' ? 'bg-violet-500/10 text-violet-300 ring-violet-500/30' : 'bg-white/5 text-slate-400 ring-white/10',
      )}
    >
      <Icon className="size-3" aria-hidden />
      {SOURCE_LABEL[source]}
      {at && <span className="text-slate-500">· {ago(at, now)}</span>}
    </span>
  );
}

export function Panel({ title, icon, right, children, className }: { title: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('glass overflow-hidden', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-200">
          {icon}
          {title}
        </h2>
        <div className="flex items-center gap-2">{right}</div>
      </header>
      {children}
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-white/5', className)} />;
}

export function Empty({ icon, title, body }: { icon: ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-slate-600">{icon}</div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {body && <p className="max-w-xs text-xs text-slate-500">{body}</p>}
    </div>
  );
}
