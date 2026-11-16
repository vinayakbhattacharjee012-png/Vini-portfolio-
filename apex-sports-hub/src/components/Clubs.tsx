import { Shield } from 'lucide-react';
import { useApi } from '../lib/api.ts';
import { Crest, Empty, Skeleton } from './ui.tsx';

export interface ClubRow { name: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }

/** Clubs with stored results in this competition. Tap any row for the full club profile. */
export function Clubs({ league, onClub }: { league: string; onClub: (name: string) => void }) {
  const { data, loading, error } = useApi<ClubRow[]>(`/api/clubs?league=${league}`, 10 * 60_000);
  const rows = data?.data ?? [];

  if (loading) return <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>;
  if (error || !rows.length)
    return (
      <Empty
        icon={<Shield className="size-8" />}
        title="No stored results yet"
        body="The archive is still filling from the public feeds. It updates automatically, so check back shortly."
      />
    );

  const th = 'px-1.5 py-2 text-right font-medium';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500">
          <tr className="border-b border-white/5">
            <th className="w-8 py-2 pl-4 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">Club</th>
            <th className={th}>P</th>
            <th className={th}>W</th>
            <th className={th}>D</th>
            <th className={th}>L</th>
            <th className={th}>GF</th>
            <th className={th}>GA</th>
            <th className="py-2 pr-4 pl-1.5 text-right font-semibold text-slate-300">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} onClick={() => onClub(r.name)} className="cursor-pointer border-b border-white/[0.03] transition hover:bg-white/[0.04]">
              <td className="py-2 pl-4 text-slate-500">{i + 1}</td>
              <td className="py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Crest name={r.name} size={18} />
                  <span className="truncate font-medium text-slate-200">{r.name}</span>
                </div>
              </td>
              <td className="px-1.5 py-2 text-right text-slate-400">{r.played}</td>
              <td className="px-1.5 py-2 text-right text-slate-400">{r.won}</td>
              <td className="px-1.5 py-2 text-right text-slate-400">{r.drawn}</td>
              <td className="px-1.5 py-2 text-right text-slate-400">{r.lost}</td>
              <td className="px-1.5 py-2 text-right text-slate-400">{r.gf}</td>
              <td className="px-1.5 py-2 text-right text-slate-400">{r.ga}</td>
              <td className="py-2 pr-4 pl-1.5 text-right font-bold text-white">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
