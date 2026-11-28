import { ChannelType, MessageFlags, PermissionFlagsBits as P, type GuildTextBasedChannel } from 'discord.js';
import type { Handler, Module } from '../core/types.js';
import { schedule } from '../core/scheduler.js';
import { addCase, auditReason, botNeeds, card, fmtDur, reasonOf, target, userCases } from './util.js';

const days = (a: any) => Math.min(7, Math.max(0, Number(a.days ?? 0)));

async function removal(c: Parameters<Handler>[0], kind: 'ban' | 'kick' | 'softban' | 'tempban') {
  const need = botNeeds(c, kind === 'kick' ? P.KickMembers : P.BanMembers); if (need) return need;
  const u = c.a.user, t = await target(c, u); if (t.err) return `⛔ ${t.err}`;
  if (kind === 'kick' && !t.member) return 'That user is not in the server.';
  const reason = auditReason(c), ds = days(c.a) * 86400;
  if (kind === 'kick') await t.member!.kick(reason);
  else {
    await c.guild.members.ban(u, { deleteMessageSeconds: kind === 'softban' ? Math.max(86400, ds) : ds, reason });
    if (kind === 'softban') await c.guild.members.unban(u, reason);
    if (kind === 'tempban') {
      const h = Math.min(720, Math.max(1, Number(c.a.hours ?? 24)));
      schedule({ client: c.client, store: c.store } as any, { at: Date.now() + h * 3600_000, kind: 'unban', module: 'moderation', guildId: c.guild.id, data: { userId: u.id } });
      c.a.reason = `${reasonOf(c)} (tempban ${h}h)`;
    }
  }
  const k = addCase(c.store, c.guild.id, kind, u.id, c.actor.id, reasonOf(c));
  return { embeds: [card(`Case #${k.n} · ${kind}`, `**User:** ${u.tag} (${u.id})\n**Reason:** ${k.reason}`, 0xed4245)] };
}

export const H: Record<string, Handler> = {
  ban: (c) => removal(c, 'ban'), kick: (c) => removal(c, 'kick'), softban: (c) => removal(c, 'softban'), tempban: (c) => removal(c, 'tempban'),
  async unban(c) {
    const need = botNeeds(c, P.BanMembers); if (need) return need;
    const id = String(c.a.userid).trim(); if (!/^\d{15,22}$/.test(id)) return 'Provide a valid user ID.';
    await c.guild.members.unban(id, auditReason(c));
    const k = addCase(c.store, c.guild.id, 'unban', id, c.actor.id, reasonOf(c));
    return `✅ Unbanned \`${id}\` (case #${k.n}).`;
  },
  async timeout(c) {
    const need = botNeeds(c, P.ModerateMembers); if (need) return need;
    const t = await target(c, c.a.user); if (t.err) return `⛔ ${t.err}`; if (!t.member) return 'That user is not in the server.';
    const min = Math.min(40320, Math.max(1, Number(c.a.minutes ?? 10)));
    await t.member.timeout(min * 60_000, auditReason(c));
    const k = addCase(c.store, c.guild.id, 'timeout', t.member.id, c.actor.id, `${reasonOf(c)} (${fmtDur(min * 60_000)})`);
    return `🔇 Timed out ${t.member} for ${fmtDur(min * 60_000)} (case #${k.n}).`;
  },
  async unmute(c) {
    const t = await target(c, c.a.user); if (t.err) return `⛔ ${t.err}`; if (!t.member) return 'That user is not in the server.';
    await t.member.timeout(null, auditReason(c)); addCase(c.store, c.guild.id, 'unmute', t.member.id, c.actor.id, reasonOf(c));
    return `🔊 Removed timeout from ${t.member}.`;
  },
  async warn(c) {
    const t = await target(c, c.a.user); if (t.err) return `⛔ ${t.err}`;
    const sev = Math.min(5, Math.max(1, Number(c.a.severity ?? 1)));
    const k = addCase(c.store, c.guild.id, `warn(s${sev})`, c.a.user.id, c.actor.id, reasonOf(c));
    const total = userCases(c.store, c.guild.id, c.a.user.id).filter((x) => x.type.startsWith('warn')).length;
    return { embeds: [card(`Case #${k.n} · warn`, `${c.a.user} warned (severity ${sev}). **Total warnings:** ${total}\n**Reason:** ${k.reason}`, 0xfee75c)], allowedMentions: { parse: [] } };
  },
  async cases(c) {
    const l = userCases(c.store, c.guild.id, c.a.user.id).slice(-15).reverse();
    return { embeds: [card(`Cases for ${c.a.user.tag}`, l.map((k) => `**#${k.n}** ${k.type} — ${k.reason} (<t:${Math.floor(k.ts / 1000)}:R>)`).join('\n') || 'No cases.')], flags: MessageFlags.Ephemeral };
  },
  async case(c) {
    const k = c.store.get<any>('cases', `${c.guild.id}:${c.a.id}`);
    return k ? { embeds: [card(`Case #${k.n} · ${k.type}`, `**User:** <@${k.userId}>\n**Mod:** <@${k.modId}>\n**Reason:** ${k.reason}\n<t:${Math.floor(k.ts / 1000)}:F>`)], allowedMentions: { parse: [] } } : 'No such case.';
  },
  async purge(c) {
    const need = botNeeds(c, P.ManageMessages); if (need) return need;
    const ch = c.channel as GuildTextBasedChannel | null; if (!ch || !('bulkDelete' in ch)) return 'Use this in a text channel.';
    const f = String(c.a.filter ?? 'all'), uid = c.a.user?.id;
    const msgs = (await ch.messages.fetch({ limit: 100 })).filter((m) => (!uid || m.author.id === uid) &&
      (f === 'all' || (f === 'bots' && m.author.bot) || (f === 'humans' && !m.author.bot) || (f === 'links' && /https?:\/\//i.test(m.content)) || (f === 'attachments' && m.attachments.size > 0) || (f === 'embeds' && m.embeds.length > 0)));
    const del = await ch.bulkDelete([...msgs.values()].slice(0, Math.min(100, Math.max(1, Number(c.a.amount)))), true);
    addCase(c.store, c.guild.id, 'purge', uid ?? '-', c.actor.id, `${del.size} msgs (${f})`);
    return { content: `🧹 Deleted ${del.size} messages (messages older than 14 days are skipped by Discord).`, flags: MessageFlags.Ephemeral };
  },
  async slowmode(c) {
    const need = botNeeds(c, P.ManageChannels); if (need) return need;
    const ch: any = c.a.channel ?? c.channel; if (!ch?.setRateLimitPerUser) return 'Pick a text channel.';
    await ch.setRateLimitPerUser(Math.min(21600, Number(c.a.seconds)), auditReason(c)); return `🐌 Slowmode in ${ch} set to ${c.a.seconds}s.`;
  },
  lock: (c) => setLock(c, false), unlock: (c) => setLock(c, true),
};
async function setLock(c: Parameters<Handler>[0], open: boolean) {
  const need = botNeeds(c, P.ManageChannels); if (need) return need;
  const ch: any = c.a.channel ?? c.channel; if (ch?.type !== ChannelType.GuildText) return 'Pick a text channel.';
  await ch.permissionOverwrites.edit(c.guild.roles.everyone, { SendMessages: open ? null : false }, { reason: auditReason(c) });
  return open ? `🔓 ${ch} unlocked.` : `🔒 ${ch} locked.`;
}

export const jobs: NonNullable<Module['jobs']> = {
  async unban(j, d) { const g = d.client.guilds.cache.get(j.guildId); await g?.members.unban(j.data.userId, 'tempban expired').catch(() => {}); },
};
