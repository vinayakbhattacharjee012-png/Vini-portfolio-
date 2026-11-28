import { ChannelType, InviteType, PermissionFlagsBits as P, type GuildChannel } from 'discord.js';
import type { Handler } from '../core/types.js';
import { checkRole, isDangerous } from '../core/hierarchy.js';
import { auditReason, botNeeds, card, eph, setGcfg } from './util.js';

export const H: Record<string, Handler> = {
  async 'admin.bulkrole'(c) {
    const need = botNeeds(c, P.ManageRoles); if (need) return need;
    const r = c.a.role, err = checkRole(c.guild, c.actor, r); if (err) return `⛔ ${err}`;
    const add = c.a.action === 'add'; if (!['add', 'remove'].includes(String(c.a.action))) return 'action must be add|remove';
    if (add && isDangerous(r)) return '⛔ Refusing to mass-grant a role with dangerous permissions.';
    await c.guild.members.fetch(); const f = String(c.a.filter ?? 'humans');
    const ms = [...c.guild.members.cache.values()].filter((m) => (f === 'all' || (f === 'bots') === m.user.bot) && m.roles.cache.has(r.id) !== add && m.roles.highest.position < c.me.roles.highest.position).slice(0, 1000);
    if (!(await c.confirm(`${add ? 'Add' : 'Remove'} **${r.name}** ${add ? 'to' : 'from'} **${ms.length}** members?`))) return;
    let ok = 0; for (const m of ms) { await (add ? m.roles.add(r, auditReason(c)) : m.roles.remove(r, auditReason(c))).then(() => ok++).catch(() => {}); }
    return `✅ ${ok}/${ms.length} members updated.`;
  },
  async 'admin.bulkchannel'(c) {
    const need = botNeeds(c, P.ManageChannels); if (need) return need;
    const pre = String(c.a.prefix).toLowerCase(); if (pre.length < 3) return 'Prefix must be at least 3 characters.';
    const chs = [...c.guild.channels.cache.filter((x) => x.name.toLowerCase().startsWith(pre) && x.type !== ChannelType.GuildCategory).values()].slice(0, 50);
    if (!chs.length) return 'No channels match.';
    if (!(await c.confirm(`DELETE ${chs.length} channels: ${chs.slice(0, 8).map((x) => `#${x.name}`).join(', ')}${chs.length > 8 ? '…' : ''}? This cannot be undone.`))) return;
    for (const x of chs) await x.delete(auditReason(c)).catch(() => {}); return `🗑️ Deleted ${chs.length} channels.`;
  },
  async 'admin.permaudit'(c) {
    const rows = c.guild.roles.cache.filter((r) => isDangerous(r) && r.id !== c.guild.id).map((r) => `${r} — ${r.permissions.has(P.Administrator) ? '**ADMIN**' : 'elevated'} · ${r.members.size} members${r.position >= c.me.roles.highest.position ? ' · above bot' : ''}`);
    const ev = c.guild.roles.everyone.permissions, warn = [P.Administrator, P.MentionEveryone, P.ManageRoles, P.ManageChannels].filter((p) => ev.has(p));
    return { embeds: [card('Permission audit', `${rows.join('\n') || 'No elevated roles.'}\n\n${warn.length ? '🚨 @everyone has dangerous permissions!' : '✅ @everyone is clean.'}`)], allowedMentions: { parse: [] } };
  },
  async 'admin.backup'(c) {
    const snap = { ts: Date.now(), roles: c.guild.roles.cache.filter((r) => !r.managed && r.id !== c.guild.id).map((r) => ({ name: r.name, color: r.color, perms: String(r.permissions.bitfield), pos: r.position, hoist: r.hoist })),
      channels: c.guild.channels.cache.map((x) => ({ name: x.name, type: x.type, parent: x.parent?.name ?? null, pos: (x as GuildChannel).position })) };
    const n = c.store.upd<{ n: number }>('backupCtr', c.guild.id, () => ({ n: 0 }), (v) => { v.n++; }).n; c.store.set('backup', `${c.guild.id}:${n}`, snap);
    return `💾 Snapshot **#${n}**: ${snap.roles.length} roles, ${snap.channels.length} channels. (Restore is intentionally not automated; use \`/admin backupdiff\`.)`;
  },
  async 'admin.backups'(c) { return { embeds: [card('Snapshots', c.store.entries<any>('backup', `${c.guild.id}:`).map(([k, v]) => `#${k.split(':')[1]} — <t:${Math.floor(v.ts / 1000)}:R> (${v.roles.length}r/${v.channels.length}c)`).join('\n') || 'None.')] }; },
  async 'admin.backupdiff'(c) {
    const s = c.store.get<any>('backup', `${c.guild.id}:${c.a.id}`); if (!s) return 'No such snapshot.';
    const names = new Set(c.guild.roles.cache.map((r) => r.name)), chn = new Set(c.guild.channels.cache.map((x) => x.name));
    const lr = s.roles.filter((r: any) => !names.has(r.name)).map((r: any) => r.name), lc = s.channels.filter((x: any) => !chn.has(x.name)).map((x: any) => x.name);
    return { embeds: [card(`Diff vs #${c.a.id}`, `**Missing roles (${lr.length}):** ${lr.slice(0, 20).join(', ') || '—'}\n**Missing channels (${lc.length}):** ${lc.slice(0, 20).join(', ') || '—'}`)] };
  },
  async 'admin.logchannel'(c) { setGcfg(c.store, c.guild.id, 'cfg', { ...(c.store.get<any>('cfg:cfg', c.guild.id) ?? {}), logChannel: c.a.channel.id }); return `✅ Audit/incident logs → ${c.a.channel}.`; },

  /** Role-granting / targeted invites via discord.js 14.28 `roles` + `targetUser` (needs the matching guild features; API errors are surfaced). */
  async 'invite.create'(c) {
    const need = botNeeds(c, P.CreateInstantInvite); if (need) return need;
    const ch: any = c.a.channel ?? c.channel; if (!ch?.createInvite) return 'Pick a text/voice channel.';
    const role = c.a.role, tu = c.a.target_user;
    if (role) { const e = checkRole(c.guild, c.actor, role) ?? (isDangerous(role) ? 'Role has dangerous permissions; it cannot be granted by invite.' : null) ; if (e) return `⛔ ${e}`; if (!c.actor.permissions.has(P.ManageRoles)) return '⛔ Role-granting invites need you to have Manage Roles.'; }
    if (tu && !c.actor.permissions.has(P.ManageGuild)) return '⛔ Restricting an invite to a user needs Manage Server.';
    try {
      const inv = await ch.createInvite({ maxUses: Number(c.a.max_uses ?? (tu ? 1 : 0)), maxAge: Number(c.a.hours ?? 24) * 3600, unique: true, reason: auditReason(c), ...(role ? { roles: [role.id] } : {}), ...(tu ? { targetUser: tu.id } : {}) });
      return eph(`🔗 ${inv.url}${role ? `\nGrants ${role.name}` : ''}${tu ? `\nOnly for ${tu.tag}` : ''}`);
    } catch (e) { return eph(`⚠️ Discord rejected this invite (${(e as Error).message}). Role/target-user invites need API support enabled for this server/bot.`); }
  },
};
void InviteType;
