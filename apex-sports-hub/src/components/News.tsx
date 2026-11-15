import { ExternalLink, Newspaper } from 'lucide-react';
import type { Citation, NewsItem } from '../lib/types.ts';
import { cx } from '../lib/format.ts';
import { Empty, Skeleton } from './ui.tsx';

const TAG: Record<NewsItem['tag'], string> = {
  Transfer: 'text-violet-300 bg-violet-500/10 ring-violet-500/25',
  Injury: 'text-rose-300 bg-rose-500/10 ring-rose-500/25',
  Result: 'text-live bg-live/10 ring-live/25',
  Squad: 'text-sky-300 bg-sky-500/10 ring-sky-500/25',
  Preview: 'text-amber-300 bg-amber-500/10 ring-amber-500/25',
  News: 'text-slate-300 bg-white/5 ring-white/10',
};

export function News({ items, citations, loading }: { items?: NewsItem[]; citations?: Citation[]; loading: boolean }) {
  if (loading)
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  if (!items?.length) return <Empty icon={<Newspaper className="size-8" />} title="No stories yet" />;
  return (
    <div>
      <ul className="divide-y divide-white/5">
        {items.map((n, i) => {
          const Wrap = n.url ? 'a' : 'div';
          return (
            <li key={i}>
              <Wrap
                {...(n.url ? { href: n.url, target: '_blank', rel: 'noreferrer' } : {})}
                className={cx('group block px-4 py-3', n.url && 'transition hover:bg-white/[0.04]')}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={cx('rounded px-1.5 py-px text-[10px] font-semibold ring-1', TAG[n.tag] ?? TAG.News)}>{n.tag}</span>
                  {n.league && <span className="text-[10px] uppercase tracking-wider text-slate-500">{n.league}</span>}
                </div>
                <p className="text-sm leading-snug font-medium text-slate-100 group-hover:text-white">
                  {n.headline}
                  {n.url && <ExternalLink className="ml-1 inline size-3 text-slate-500" />}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{n.summary}</p>
              </Wrap>
            </li>
          );
        })}
      </ul>
      {!!citations?.length && (
        <div className="border-t border-white/5 px-4 py-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Grounded in</p>
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
