import type { Client } from 'discord.js';
import type { Store } from '../storage/store.js';

export interface AuditRec { ts: number; guildId: string; userId: string; feature: string; phase: 'intent' | 'ok' | 'fail' | 'deny'; detail?: string }

/** Structured audit trail: stdout JSON line + capped per-guild list + optional log channel. */
export function audit(store: Store, client: Client | null, rec: Omit<AuditRec, 'ts'>) {
  const full: AuditRec = { ts: Date.now(), ...rec };
  console.log(JSON.stringify({ audit: full }));
  store.upd<AuditRec[]>('audit', rec.guildId, () => [], (l) => { l.push(full); if (l.length > 500) l.splice(0, l.length - 500); });
  const ch = store.get<{ logChannel?: string }>('cfg:cfg', rec.guildId)?.logChannel;
  const c = ch && client?.channels.cache.get(ch);
  if (c && c.isSendable() && rec.phase !== 'intent')
    void c.send({ content: `\`${rec.phase}\` **${rec.feature}** by <@${rec.userId}>${rec.detail ? ` — ${rec.detail.slice(0, 300)}` : ''}`, allowedMentions: { parse: [] } }).catch(() => {});
}
