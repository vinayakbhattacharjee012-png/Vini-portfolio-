import { ActionRowBuilder, AuditLogEvent as A, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits as P, type Guild, type GuildMember } from 'discord.js';
import type { Deps, Handler, Module } from '../core/types.js';
import { DANGEROUS_PERMS, isDangerous } from '../core/hierarchy.js';
import { card, eph, gcfg, setGcfg } from './util.js';

export interface SecCfg { on: boolean; limits: Record<string, { limit: number; windowSec: number }>; trusted: string[]; quarantine?: string; approvedBots: string[]; lock?: Record<string, boolean | null>; incidents: { ts: number; guard: string; by: string; note: string }[]; verify?: { role: string; channel: string } }
export const GUARDS: Record<string, number> = { channelDelete: A.ChannelDelete, channelCreate: A.ChannelCreate, roleDelete: A.RoleDelete, roleCreate: A.RoleCreate, webhook: A.WebhookCreate, ban: A.MemberBanAdd, kick: A.MemberKick };
const fresh = (): SecCfg => ({ on: false, trusted: [], approvedBots: [], incidents: [], limits: Object.fromEntries(Object.keys(GUARDS).map((g) => [g, { limit: g.endsWith('Create') ? 5 : 3, windowSec: 10 }])) });
export const cfgOf = (s: Deps['store'], gid: string) => gcfg<SecCfg>(s, gid, 'security', fresh());

/** Sliding window: push `now`, drop expired, return count in window. Pure → unit-tested. */
export function slide(arr: number[], now: number, windowMs: number): number { while (arr.length && arr[0] <= now - windowMs) arr.shift(); arr.push(now); return arr.length; }

export const H: Record<string, Handler> = {
  async enable(c) { const g = cfgOf(c.store, c.guild.id); g.on = !!c.a.enabled; setGcfg(c.store, c.guild.id, 'security', g); return `🛡️ Anti-nuke ${g.on ? 'ENABLED' : 'DISABLED'}.`; },
  async threshold(c) {
    const g = cfgOf(c.store, c.guild.id), k = String(c.a.guard); if (!GUARDS[k]) return `Guards: ${Object.keys(GUARDS).join(', ')}`;
    g.limits[k] = { limit: Math.max(1, Number(c.a.limit)), windowSec: Math.max(1, Number(c.a.window_sec)) }; setGcfg(c.store, c.guild.id, 'security', g); return `✅ ${k}: ${g.limits[k].limit} per ${g.limits[k].windowSec}s.`;
  },
  async trust(c) {
    const id = c.a.user?.id ?? c.a.role?.id; if (!id) return 'Provide a user or a role.';
    const g = cfgOf(c.store, c.guild.id); g.trusted = c.a.remove ? g.trusted.filter((x) => x !== id) : [...new Set([...g.trusted, id])]; setGcfg(c.store, c.guild.id, 'security', g);
    return `✅ ${c.a.remove ? 'Removed' : 'Trusted'} <@${c.a.user ? '' : '&'}${id}>.`;
  },
  async status(c) { const g = cfgOf(c.store, c.guild.id); return { embeds: [card('Security', `**Anti-nuke:** ${g.on ? 'on' : 'off'}\n**Quarantine role:** ${g.quarantine ? `<@&${g.quarantine}>` : 'not set (dangerous roles will be stripped instead)'}\n**Trusted:** ${g.trusted.length}\n**Approved bots:** ${g.approvedBots.length}\n${Object.entries(g.limits).map(([k, v]) => `• ${k}: ${v.limit}/${v.windowSec}s`).join('\n')}\n**Lockdown:** ${g.lock ? 'ACTIVE' : 'no'}`)] }; },
  async quarantine(c) {
    const r = c.a.role; if (r.permissions.bitfield & ~0n && isDangerous(r)) return '⛔ The quarantine role must not have dangerous permissions.';
    const g = cfgOf(c.store, c.guild.id); g.quarantine = r.id; setGcfg(c.store, c.guild.id, 'security', g); return `✅ Quarantine role set to ${r}.`;
  },
  async lockdown(c) {
    if (!c.me.permissions.has(P.ManageChannels)) return 'I need Manage Channels.';
    const g = cfgOf(c.store, c.guild.id); if (g.lock) return 'Already in lockdown. Use `/security recover`.';
    const chans = [...c.guild.channels.cache.filter((x) => x.type === ChannelType.GuildText).values()].slice(0, 150);
    if (!(await c.confirm(`Lock **${chans.length}** text channels for @everyone?`))) return;
    g.lock = {}; const ev = c.guild.roles.everyone;
    for (const ch of chans) { const cur = (ch as any).permissionOverwrites.cache.get(ev.id)?.deny.has(P.SendMessages) ? false : (ch as any).permissionOverwrites.cache.get(ev.id)?.allow.has(P.SendMessages) ? true : null; g.lock[ch.id] = cur; await (ch as any).permissionOverwrites.edit(ev, { SendMessages: false }, { reason: `lockdown by ${c.actor.user.tag}` }).catch(() => {}); }
    setGcfg(c.store, c.guild.id, 'security', g); return `🚨 Lockdown active on ${chans.length} channels.`;
  },
  async recover(c) {
    const g = cfgOf(c.store, c.guild.id); if (!g.lock) return 'No active lockdown.';
    if (!(await c.confirm('End lockdown and restore previous channel permissions?'))) return;
    for (const [id, prev] of Object.entries(g.lock)) await (c.guild.channels.cache.get(id) as any)?.permissionOverwrites.edit(c.guild.roles.everyone, { SendMessages: prev }, { reason: 'lockdown recovery' }).catch(() => {});
    delete g.lock; setGcfg(c.store, c.guild.id, 'security', g); return '✅ Lockdown ended; permissions restored.';
  },
  async verify(c) {
    const r = c.a.role; if (isDangerous(r) || c.me.roles.highest.position <= r.position) return '⛔ Verification role is dangerous or above my highest role.';
    const g = cfgOf(c.store, c.guild.id); g.verify = { role: r.id, channel: c.a.channel.id }; setGcfg(c.store, c.guild.id, 'security', g);
    await c.a.channel.send({ embeds: [card('✅ Verify', 'Press the button to gain access.')], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('security:verify').setLabel('Verify').setStyle(ButtonStyle.Success))] });
    return eph('✅ Verification gate posted.');
  },
  async incidents(c) { const g = cfgOf(c.store, c.guild.id); return { embeds: [card('Security incidents', g.incidents.slice(-10).reverse().map((x) => `<t:${Math.floor(x.ts / 1000)}:R> **${x.guard}** by <@${x.by}> — ${x.note}`).join('\n') || 'None.')] }; },
  async approvebot(c) { const g = cfgOf(c.store, c.guild.id); g.approvedBots = [...new Set([...g.approvedBots, String(c.a.botid)])]; setGcfg(c.store, c.guild.id, 'security', g); return '✅ Bot approved for addition.'; },
};

export const component: Module['component'] = async (i, deps) => {
  const g = cfgOf(deps.store, i.guildId); const r = g.verify && i.guild.roles.cache.get(g.verify.role);
  if (!r || isDangerous(r) || i.guild.members.me.roles.highest.position <= r.position) return void i.reply(eph('Verification is misconfigured.'));
  await i.member.roles.add(r, 'verified'); i.reply(eph('✅ Verified!'));
};

async function incident(d: Deps, guild: Guild, guard: string, by: string, note: string) {
  const g = cfgOf(d.store, guild.id); g.incidents.push({ ts: Date.now(), guard, by, note }); if (g.incidents.length > 100) g.incidents.shift(); setGcfg(d.store, guild.id, 'security', g);
  console.log(JSON.stringify({ incident: { guild: guild.id, guard, by, note } }));
  const ch = d.store.get<any>('cfg:cfg', guild.id)?.logChannel; const c: any = ch && guild.channels.cache.get(ch);
  if (c?.isSendable()) void c.send({ content: `🚨 **${guard}** by <@${by}> — ${note}`, allowedMentions: { parse: [] } }).catch(() => {});
}
/** Contain an executor without ever acting above the bot's hierarchy. */
async function contain(d: Deps, guild: Guild, m: GuildMember, guard: string) {
  const g = cfgOf(d.store, guild.id), me = guild.members.me!;
  if (m.id === guild.ownerId || me.roles.highest.position <= m.roles.highest.position) return incident(d, guild, guard, m.id, 'threshold exceeded; CANNOT contain (owner or above bot role)');
  const strip = m.roles.cache.filter((r) => !r.managed && r.id !== guild.id && (r.permissions.bitfield & DANGEROUS_PERMS) !== 0n && r.position < me.roles.highest.position);
  await m.roles.remove(strip, `anti-nuke: ${guard}`).catch(() => {});
  if (g.quarantine) await m.roles.add(g.quarantine, `anti-nuke: ${guard}`).catch(() => {});
  await incident(d, guild, guard, m.id, `contained; stripped ${strip.size} dangerous role(s)${g.quarantine ? ' + quarantined' : ''}`);
}

const win = new Map<string, number[]>();
export const hook: Module['hook'] = (d) => {
  const watch = async (guild: Guild, guard: string) => {
    const g = cfgOf(d.store, guild.id); if (!g.on || !guild.members.me?.permissions.has(P.ViewAuditLog)) return;
    const e = (await guild.fetchAuditLogs({ type: GUARDS[guard] as any, limit: 1 }).catch(() => null))?.entries.first();
    if (!e?.executorId || Date.now() - e.createdTimestamp > 5000 || e.executorId === d.client.user!.id) return;
    const m = await guild.members.fetch(e.executorId).catch(() => null); if (!m) return;
    if (g.trusted.includes(m.id) || m.roles.cache.some((r) => g.trusted.includes(r.id))) return;
    const L = g.limits[guard], arr = win.get(`${guild.id}:${m.id}:${guard}`) ?? []; win.set(`${guild.id}:${m.id}:${guard}`, arr);
    if (slide(arr, Date.now(), L.windowSec * 1000) > L.limit) { arr.length = 0; await contain(d, guild, m, guard); }
  };
  const c = d.client;
  c.on('channelDelete', (x) => 'guild' in x && void watch(x.guild, 'channelDelete'));
  c.on('channelCreate', (x) => void watch(x.guild, 'channelCreate'));
  c.on('roleDelete', (r) => void watch(r.guild, 'roleDelete'));
  c.on('roleCreate', (r) => void watch(r.guild, 'roleCreate'));
  c.on('webhooksUpdate', (ch) => 'guild' in ch && void watch(ch.guild, 'webhook'));
  c.on('guildBanAdd', (b) => void watch(b.guild, 'ban'));
  c.on('guildMemberRemove', (m) => void watch(m.guild, 'kick'));
  c.on('guildMemberAdd', async (m) => {
    const g = cfgOf(d.store, m.guild.id); if (!g.on || !m.user.bot || g.approvedBots.includes(m.id)) return;
    const log = (await m.guild.fetchAuditLogs({ type: A.BotAdd, limit: 1 }).catch(() => null))?.entries.first();
    const adder = log?.executorId && (await m.guild.members.fetch(log.executorId).catch(() => null));
    if (adder && (g.trusted.includes(adder.id) || adder.id === m.guild.ownerId)) return; // trusted adders may add bots
    await m.kick('anti-nuke: unapproved bot').catch(() => {});
    await incident(d, m.guild, 'botAdd', adder ? adder.id : m.id, `unapproved bot ${m.user.tag} kicked`);
  });
};
