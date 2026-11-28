import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Client, type Guild, type GuildMember, type GuildTextBasedChannel } from 'discord.js';
import { catalog } from '../registry/defs.js';
import { Catalog, type Base, type Entry } from '../registry/catalog.js';
import { audit } from './audit.js';
import { loadModule } from './modules.js';
import type { Deps, HCtx, Reply } from './types.js';

export interface ExecCtx { guild: Guild; actor: GuildMember; channel: GuildTextBasedChannel | null; interaction?: any; confirmed?: boolean; depth?: number }
type RunOpts = { user?: string; role?: string; channel?: string; text?: string; number?: number; flag?: boolean };

const NO_NEST = new Set(['core.eclipse.run', 'ai.workflow.run']);
export const guildCfg = (deps: Deps, gid: string) => deps.store.get<any>('cfg:cfg', gid) ?? {};

/** Entry with no preset vars: used for direct slash invocation where the user supplies every option. */
export const direct = (b: Base): Entry => ({ ...catalog.entryOf(b, 0), vars: {}, name: `${b.module}.${b.name}`, path: `${b.root}/${b.name}` });

/** Map generic run options (or stored workflow ids) onto a base's option specs; preset vars win. */
export async function resolveRun(guild: Guild, b: Base, vars: Entry['vars'], o: RunOpts) {
  const a: Record<string, any> = {};
  for (const s of b.opts) {
    if (s.n in vars) { a[s.n] = vars[s.n]; continue; }
    if (s.t === 'u' && o.user) a[s.n] = await guild.client.users.fetch(o.user).catch(() => undefined);
    else if (s.t === 'r' && o.role) a[s.n] = guild.roles.cache.get(o.role) ?? (await guild.roles.fetch(o.role).catch(() => undefined));
    else if (s.t === 'c' && o.channel) a[s.n] = guild.channels.cache.get(o.channel);
    else if (s.t === 's') a[s.n] = o.text;
    else if (s.t === 'i' || s.t === 'n') a[s.n] = o.number;
    else if (s.t === 'b') a[s.n] = o.flag;
  }
  return a;
}

/** The single path every feature runs through: toggle → perms → cooldown → audit(intent) → handler → audit(result). */
export async function exec(deps: Deps, x: ExecCtx, entry: Entry, a: Record<string, any>): Promise<Reply> {
  const { guild, actor } = x, gid = guild.id, uid = actor.id, key = entry.handlerKey;
  if ((x.depth ?? 0) > 0 && NO_NEST.has(key)) return '⛔ That entry cannot be nested.';
  if (entry.module !== 'core' && guildCfg(deps, gid).disabled?.includes(entry.module)) return `⛔ Module \`${entry.module}\` is disabled on this server.`;
  if (entry.perms && !actor.permissions.has(entry.perms)) { audit(deps.store, deps.client, { guildId: gid, userId: uid, feature: entry.name, phase: 'deny', detail: 'missing permission' }); return '⛔ You lack the required permission for this action.'; }
  const wait = deps.limiter.cooldown(`u:${gid}:${uid}:${key}`, entry.cooldownMs);
  if (wait) return `⏳ Cooldown: try again in ${(wait / 1000).toFixed(1)}s.`;
  if (entry.base.risk && !deps.limiter.bucket(`g:${gid}`, 20, 10_000)) return '⏳ This server is running consequential actions too fast. Slow down.';
  if (entry.base.risk) audit(deps.store, deps.client, { guildId: gid, userId: uid, feature: entry.name, phase: 'intent', detail: JSON.stringify(Object.fromEntries(Object.entries(a).map(([k, v]) => [k, (v as any)?.id ?? v]))).slice(0, 400) });
  const me = guild.members.me ?? (await guild.members.fetchMe());
  const c: HCtx = {
    client: deps.client, guild, actor, me, store: deps.store, channel: x.channel, entry, a,
    member: (id) => guild.members.fetch(id).catch(() => null),
    confirm: (t) => (x.confirmed || !x.interaction ? Promise.resolve(!!x.confirmed) : confirmUI(x.interaction, t)),
  };
  try {
    const H = (await loadModule(entry.module)).H, h = H[entry.base.root + '.' + entry.base.name] ?? H[entry.base.name];
    if (!h) return `⚠️ No handler for \`${key}\`.`;
    const r = await h(c);
    if (entry.base.risk) audit(deps.store, deps.client, { guildId: gid, userId: uid, feature: entry.name, phase: 'ok' });
    return r;
  } catch (e) {
    console.error(`[${key}]`, e);
    audit(deps.store, deps.client, { guildId: gid, userId: uid, feature: entry.name, phase: 'fail', detail: String((e as Error).message) });
    return `⚠️ \`${key}\` failed: ${(e as Error).message.slice(0, 200)}`;
  }
}

async function confirmUI(i: any, text: string): Promise<boolean> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('cf:ok').setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('cf:no').setLabel('Cancel').setStyle(ButtonStyle.Secondary));
  const payload = { content: `⚠️ ${text}`, components: [row] };
  const msg = i.deferred || i.replied ? await i.editReply(payload) : (await i.reply({ ...payload, withResponse: true })).resource.message;
  try {
    const b = await msg.awaitMessageComponent({ filter: (x: any) => x.user.id === i.user.id && x.customId.startsWith('cf:'), time: 30_000 });
    await b.update({ content: b.customId === 'cf:ok' ? '✅ Confirmed.' : '❌ Cancelled.', components: [] });
    return b.customId === 'cf:ok';
  } catch { await i.editReply({ content: '⌛ Confirmation timed out; nothing was done.', components: [] }).catch(() => {}); return false; }
}

/** Send a handler Reply on an interaction (auto-defer after 2s so nothing times out). */
export async function respond(i: any, r: Reply) {
  if (!r) return;
  const o = typeof r === 'string' ? { content: r } : r;
  if (o.modal) return i.showModal(o.modal);
  if (i.deferred || i.replied) { const { flags, ...rest } = o as any; return i.editReply({ components: [], ...rest }); }
  return i.reply(o);
}
export function autoDefer(i: any, ephemeral = false) {
  const t = setTimeout(() => { if (!i.deferred && !i.replied) i.deferReply({ flags: ephemeral ? 64 : undefined }).catch(() => {}); }, 2000);
  return () => clearTimeout(t);
}

/** Entry-lookup for `eclipse run`/workflows: numeric id or free-text search. */
export function findEntry(q: string): Entry | undefined {
  return /^\d+$/.test(q) ? catalog.entry(Number(q)) : catalog.search(q, 1)[0];
}
export { Catalog };
export type { Client };
