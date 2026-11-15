import { useMemo, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';
import type { Citation, NewsItem, NewsTag } from '../lib/types.ts';
import { ago, cx } from '../lib/format.ts';
import { Empty, Skeleton } from './ui.tsx';

const TAG: Record<NewsTag, string> = {
  Transfer: 'text-violet-300 bg-violet-500/10 ring-violet-500/25',
  Injury: 'text-rose-300 bg-rose-500/10 ring-rose-500/25',
  Squad: 'text-sky-300 bg-sky-500/10 ring-sky-500/25',
  'Match News': 'text-live bg-live/10 ring-live/25',
};

const TAGS: NewsTag[] = ['Transfer', 'Injury', 'Squad', 'Match News'];

export function News({ items, citations, loading, now }: { items?: NewsItem[]; citations?: Citation[]; loading: boolean; now: number }) {
  const [filter, setFilter] = useState<'All' | NewsTag>('All');
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: items?.length ?? 0 };
    for (const t of TAGS) c[t] = items?.filter((n) => n.tag === t).length ?? 0;
    return c;
  }, [items]);
  const shown = (items ?? []).filter((n) => filter === 'All' || n.tag === filter);

  if (loading)
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  if (!items?.length) return <Empty icon={<Newspaper className="size-8" />} title="No stories right now" body="Use Refresh to check again." />;

  return (
    <div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-white/5 px-3 py-2" role="tablist" aria-label="Filter news">
        {(['All', ...TAGS] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={filter === t}
            onClick={() => setFilter(t)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ring-1 transition',
              filter === t ? 'bg-white/10 text-white ring-white/20' : 'text-slate-400 ring-white/10 hover:text-slate-200',
            )}
          >
            {t}
            <span className="tabular-nums text-slate-500">{counts[t]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty icon={<Newspaper className="size-8" />} title={`No ${filter.toLowerCase()} stories right now`} />
      ) : (
        <ul className="divide-y divide-white/5">
          {shown.map((n, i) => {
            const Wrap = n.url ? 'a' : 'div';
            return (
              <li key={`${n.headline}-${i}`}>
                <Wrap
                  {...(n.url ? { href: n.url, target: '_blank', rel: 'noreferrer' } : {})}
                  className={cx('group flex gap-3 px-4 py-3', n.url && 'transition hover:bg-white/[0.04]')}
                >
                  {n.image && (
                    <img src={n.image} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-white/10" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={cx('rounded px-1.5 py-px text-[10px] font-semibold ring-1', TAG[n.tag])}>{n.tag}</span>
                      {n.league && <span className="text-[10px] uppercase tracking-wider text-slate-500">{n.league}</span>}
                      {n.published && <span className="text-[10px] text-slate-600">{ago(n.published, now)}</span>}
                    </div>
                    <p className="text-sm leading-snug font-medium text-slate-100 group-hover:text-white">
                      {n.headline}
                      {n.url && <ExternalLink className="ml-1 inline size-3 text-slate-500" />}
                    </p>
                    {n.summary && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{n.summary}</p>}
                  </div>
                </Wrap>
              </li>
            );
          })}
        </ul>
      )}

      {!!citations?.length && (
        <div className="border-t border-white/5 px-4 py-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sources</p>
          <div className="flex flex-wrap gap-1.5">
            {citations.map((c) => (
              <a key={c.uri} href={c.uri} target="_blank" rel="noreferrer" className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-white/10 transition hover:text-slate-200">
                {c.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
