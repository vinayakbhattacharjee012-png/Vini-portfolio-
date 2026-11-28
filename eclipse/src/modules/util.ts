import { EmbedBuilder, MessageFlags, type GuildMember, type PermissionResolvable, type User } from 'discord.js';
import { checkTarget } from '../core/hierarchy.js';
import type { HCtx } from '../core/types.js';
import type { Store } from '../storage/store.js';

export const eph = (content: string) => ({ content, flags: MessageFlags.Ephemeral } as const);
export const card = (title: string, desc = '', color = 0x5865f2) => new EmbedBuilder().setTitle(title).setDescription(desc.slice(0, 4000)).setColor(color);
export const fmtDur = (ms: number) => { const m = Math.round(ms / 60000); return m >= 1440 ? `${(m / 1440).toFixed(m % 1440 ? 1 : 0)}d` : m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0)}h` : `${m}m`; };
export const reasonOf = (c: HCtx) => String(c.a.reason ?? 'No reason given').slice(0, 400);
export const auditReason = (c: HCtx) => `${reasonOf(c)} | by ${c.actor.user.tag}`.slice(0, 512);
export const rnd = (n: number) => Math.floor(Math.random() * n);
export const pick = <T,>(a: readonly T[]) => a[rnd(a.length)];

export const gcfg = <T = any>(s: Store, gid: string, key: string, def: T): T => (s.get<any>(`cfg:${key}`, gid) ?? def);
export const setGcfg = (s: Store, gid: string, key: string, v: unknown) => s.set(`cfg:${key}`, gid, v);

/** Bot permission pre-check so failures read as guidance, not API errors. */
export const botNeeds = (c: HCtx, p: PermissionResolvable) => (c.me.permissions.has(p) ? null : `I am missing the **${String(p)}** permission.`);

/** Resolve a target user to a member and run the hierarchy check. member=null means "not in server". */
export async function target(c: HCtx, u: User): Promise<{ member: GuildMember | null; err?: string }> {
  const member = await c.member(u.id);
  if (!member) return { member: null };
  const err = checkTarget(c.guild, c.actor, member);
  return err ? { member, err } : { member };
}

export interface Case { n: number; type: string; userId: string; modId: string; reason: string; ts: number }
export function addCase(s: Store, gid: string, type: string, userId: string, modId: string, reason: string): Case {
  const n = s.upd<{ n: number }>('caseCtr', gid, () => ({ n: 0 }), (v) => { v.n++; }).n;
  return s.set<Case>('cases', `${gid}:${n}`, { n, type, userId, modId, reason, ts: Date.now() });
}
export const userCases = (s: Store, gid: string, uid: string) => s.entries<Case>('cases', `${gid}:`).map(([, v]) => v).filter((x) => x.userId === uid);

/** Money/XP helpers shared by economy + games. Integer math only. */
export interface Wallet { coins: number; lastDaily: number; lastWork: number; xp: number; msgTs: number; items: Record<string, number>; equipped?: string; bio?: string; color?: string }
export const wallet = (s: Store, gid: string, uid: string): Wallet => s.get<Wallet>('wallet', `${gid}:${uid}`) ?? { coins: 0, lastDaily: 0, lastWork: 0, xp: 0, msgTs: 0, items: {} };
export const saveWallet = (s: Store, gid: string, uid: string, w: Wallet) => s.set('wallet', `${gid}:${uid}`, w);
export const levelOf = (xp: number) => Math.floor(Math.sqrt(xp / 50));
export const bumpScore = (s: Store, gid: string, game: string, uid: string, by = 1) => s.upd<Record<string, number>>('scores', `${gid}:${game}`, () => ({}), (v) => { v[uid] = (v[uid] ?? 0) + by; });
