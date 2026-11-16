import { ListOrdered } from 'lucide-react';
import type { StandingRow } from '../lib/types.ts';
import { cx } from '../lib/format.ts';
import { Crest, Empty, Skeleton } from './ui.tsx';

/** Zone colouring: top-4 (CL), 5–6 (EL), bottom-3 (relegation). Cricket: top-4 playoffs. */
function zone(rank: number, total: number, cricket: boolean) {
  if (cricket) return rank <= 4 ? 'bg-live' : '';
  if (rank <= 4) return 'bg-live';
  if (rank <= 6) return 'bg-sky-400';
  if (total >= 18 && rank > total - 3) return 'bg-rose-500';
  return '';
}

export function Standings({ rows, loading, cricket, onTeam, compact }: { rows?: StandingRow[]; loading: boolean; cricket: boolean; onTeam: (name: string) => void; compact?: boolean }) {
  if (loading)
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>
    );
  if (!rows?.length) return <Empty icon={<ListOrdered className="size-8" />} title="No table for this competition" body="Knockout-only events and bilateral series don't have a points table." />;

  const visible = compact ? rows.slice(0, 10) : rows;
  const th = 'px-1.5 py-2 text-right font-medium';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500">
          <tr className="border-b border-white/5">
            <th className="w-8 py-2 pl-4 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">Team</th>
            <th className={th}>P</th>
            <th className={cx(th, compact && 'hidden sm:table-cell')}>W</th>
            <th className={cx(th, compact && 'hidden sm:table-cell')}>{cricket ? 'NR' : 'D'}</th>
            <th className={cx(th, compact && 'hidden sm:table-cell')}>L</th>
            <th className={th}>{cricket ? 'NRR' : 'GD'}</th>
            <th className="py-2 pr-4 pl-1.5 text-right font-semibold text-slate-300">Pts</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const z = zone(r.rank, rows.length, cricket);
            const diff = cricket ? r.nrr : r.gd === undefined ? '' : r.gd > 0 ? `+${r.gd}` : String(r.gd);
            return (
              <tr key={r.team} onClick={() => onTeam(r.team)} className="cursor-pointer border-b border-white/[0.03] transition hover:bg-white/[0.04]">
                <td className="relative py-2 pl-4 text-slate-400">
                  {z && <span className={cx('absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r', z)} />}
                  {r.rank}
                </td>
                <td className="py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Crest src={r.logo} name={r.team} size={18} />
                    <span className="truncate font-medium text-slate-200">{compact ? r.short || r.team : r.team}</span>
                  </div>
                </td>
                <td className="px-1.5 py-2 text-right text-slate-400">{r.played}</td>
                <td className={cx('px-1.5 py-2 text-right text-slate-400', compact && 'hidden sm:table-cell')}>{r.won}</td>
                <td className={cx('px-1.5 py-2 text-right text-slate-400', compact && 'hidden sm:table-cell')}>{r.drawn}</td>
                <td className={cx('px-1.5 py-2 text-right text-slate-400', compact && 'hidden sm:table-cell')}>{r.lost}</td>
                <td className={cx('px-1.5 py-2 text-right', diff?.startsWith('-') ? 'text-rose-300/80' : 'text-slate-400')}>{diff}</td>
                <td className="py-2 pr-4 pl-1.5 text-right font-bold text-white">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!cricket && rows.length >= 18 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-live" />Champions League</span>
          <span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-sky-400" />Europa League</span>
          <span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-rose-500" />Relegation</span>
        </div>
      )}
    </div>
  );
}
