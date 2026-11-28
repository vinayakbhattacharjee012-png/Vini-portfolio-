import { randomUUID } from 'node:crypto';
import { loadModule } from './modules.js';
import type { Deps } from './types.js';

export interface Job { id: string; at: number; kind: string; module: string; guildId: string; data: any }
export const schedule = (deps: Deps, j: Omit<Job, 'id'>) => { const id = randomUUID(); deps.store.set('jobs', id, { id, ...j }); return id; };

/** Polls persisted jobs (survive restarts). Job is deleted before running: at-most-once. */
export function startScheduler(deps: Deps, everyMs = 15_000) {
  const tick = async () => {
    const now = Date.now();
    for (const [id, j] of deps.store.entries<Job>('jobs')) {
      if (j.at > now) continue;
      deps.store.del('jobs', id);
      try { await (await loadModule(j.module)).jobs?.[j.kind]?.(j, deps); } catch (e) { console.error('[job]', j.kind, e); }
    }
  };
  const t = setInterval(() => void tick(), everyMs); t.unref(); return tick;
}
