import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, FileUploadBuilder, LabelBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits as P, type Guild, type TextChannel } from 'discord.js';
import type { Deps, Handler, Module } from '../core/types.js';
import { schedule } from '../core/scheduler.js';
import { card, eph, levelOf, wallet } from './util.js';

const btn = (id: string, label: string, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const ticketOf = (s: Deps['store'], chId: string) => s.get<any>('ticket', chId);

async function transcript(ch: TextChannel) {
  const out: string[] = []; let before: string | undefined;
  for (let k = 0; k < 5; k++) { // up to 500 messages
    const b = await ch.messages.fetch({ limit: 100, before }); if (!b.size) break;
    for (const m of b.values()) out.push(`[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}${m.attachments.size ? ' ' + m.attachments.map((a) => a.url).join(' ') : ''}`);
    before = b.last()!.id;
  }
  return new AttachmentBuilder(Buffer.from(out.reverse().join('\n') || '(empty)'), { name: `transcript-${ch.name}.txt` });
}
async function closeTicket(d: Deps, guild: Guild, ch: TextChannel, by: string) {
  const t = ticketOf(d.store, ch.id), file = await transcript(ch);
  const logId = d.store.get<any>('cfg:cfg', guild.id)?.logChannel; const log: any = logId && guild.channels.cache.get(logId);
  if (log?.isSendable()) await log.send({ content: `🎫 Ticket **${ch.name}** (owner <@${t?.owner}>) closed by <@${by}>`, files: [file], allowedMentions: { parse: [] } });
  d.store.del('ticket', ch.id); await ch.delete(`ticket closed by ${by}`);
  return !!(log?.isSendable());
}

export const H: Record<string, Handler> = {
  async 'ticket.panel'(c) {
    const ch: any = c.a.channel ?? c.channel;
    await ch.send({ embeds: [card('🎫 ' + c.a.label, 'Press the button to open a private ticket.')], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(btn(`tickets:open:${c.a.support_role?.id ?? 0}:${c.a.category?.id ?? 0}`, `Open ${c.a.label}`, ButtonStyle.Primary))] });
    return eph('✅ Panel posted.');
  },
  async 'ticket.claim'(c) { const t = ticketOf(c.store, c.channel!.id); if (!t) return 'Not a ticket channel.'; t.claimed = c.actor.id; c.store.set('ticket', c.channel!.id, t); return `🙋 ${c.actor} claimed this ticket.`; },
  async 'ticket.close'(c) {
    if (!ticketOf(c.store, c.channel!.id)) return 'Not a ticket channel.'; if (!(await c.confirm('Close this ticket and save a transcript?'))) return;
    const saved = await closeTicket({ client: c.client, store: c.store } as any, c.guild, c.channel as TextChannel, c.actor.id); return saved ? undefined : 'Closed (no log channel set: transcript was not saved).';
  },
  async 'ticket.transcript'(c) { if (!ticketOf(c.store, c.channel!.id)) return 'Not a ticket channel.'; return { files: [await transcript(c.channel as TextChannel)] }; },
  async 'ticket.adduser'(c) {
    if (!ticketOf(c.store, c.channel!.id)) return 'Not a ticket channel.';
    await (c.channel as TextChannel).permissionOverwrites.edit(c.a.user.id, { ViewChannel: true, SendMessages: true }); return `✅ Added ${c.a.user}.`;
  },
  async 'giveaway.start'(c) {
    const min = Math.min(10080, Math.max(1, Number(c.a.minutes))), end = Date.now() + min * 60_000, ch: any = c.channel;
    const gw = { gid: c.guild.id, ch: ch.id, prize: String(c.a.prize).slice(0, 200), end, winners: Math.min(10, Math.max(1, Number(c.a.winners ?? 1))), role: c.a.role?.id, minLevel: Number(c.a.min_level ?? 0), entries: [] as string[], ended: false };
    const msg = await ch.send({ embeds: [gwCard(gw)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(btn('tickets:gw', '🎉 Enter', ButtonStyle.Success))] });
    c.store.set('giveaway', msg.id, gw); schedule({ client: c.client, store: c.store } as any, { at: end, kind: 'gwend', module: 'tickets', guildId: c.guild.id, data: { id: msg.id } });
    return eph('🎉 Giveaway started.');
  },
  async 'giveaway.end'(c) { const r = await finish({ client: c.client, store: c.store } as any, String(c.a.message_id), c.guild.id); return r ?? 'No active giveaway with that message ID.'; },
  async 'giveaway.reroll'(c) {
    const g = c.store.get<any>('giveaway', String(c.a.message_id)); if (!g || g.gid !== c.guild.id || !g.ended) return 'Giveaway not found or not ended yet.';
    const w = drawWinners(g.entries, Math.min(10, Number(c.a.winners ?? 1))); return w.length ? `🔁 New winner(s): ${w.map((x) => `<@${x}>`).join(', ')}` : 'No entries to draw from.';
  },
};
const gwCard = (g: any) => card(`🎉 ${g.prize}`, `Ends <t:${Math.floor(g.end / 1000)}:R> · **${g.winners}** winner(s) · **${g.entries.length}** entries${g.role ? `\nRequires <@&${g.role}>` : ''}${g.minLevel ? `\nRequires level ${g.minLevel}+` : ''}`);

/** Uniform unique draw (Fisher–Yates partial shuffle). */
export function drawWinners(entries: string[], n: number, r: () => number = Math.random): string[] {
  const a = [...new Set(entries)]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n);
}
async function finish(d: Deps, id: string, gid?: string) {
  const g = d.store.get<any>('giveaway', id); if (!g || g.ended || (gid && g.gid !== gid)) return null;
  g.ended = true; d.store.set('giveaway', id, g);
  const w = drawWinners(g.entries, g.winners), ch: any = d.client.channels.cache.get(g.ch), msg = await ch?.messages.fetch(id).catch(() => null);
  const text = w.length ? `🏆 ${w.map((x) => `<@${x}>`).join(', ')} won **${g.prize}**!` : `No valid entries for **${g.prize}**.`;
  await msg?.edit({ embeds: [card(`🎉 ${g.prize} — ended`, text)], components: [] }); await ch?.send({ content: text, allowedMentions: { users: w } });
  return text;
}
export const jobs: Module['jobs'] = { gwend: async (j, d) => void (await finish(d, j.data.id)) };

export const component: Module['component'] = async (i, d) => {
  const [, kind, role, cat] = i.customId.split(':');
  if (kind === 'gw') {
    const g = d.store.get<any>('giveaway', i.message.id); if (!g || g.ended || Date.now() > g.end) return void i.reply(eph('This giveaway has ended.'));
    if (g.role && !i.member.roles.cache.has(g.role)) return void i.reply(eph('You do not have the required role.'));
    if (g.minLevel && levelOf(wallet(d.store, g.gid, i.user.id).xp) < g.minLevel) return void i.reply(eph(`You need level ${g.minLevel}.`));
    if (g.entries.includes(i.user.id)) return void i.reply(eph('Already entered.'));
    g.entries.push(i.user.id); d.store.set('giveaway', i.message.id, g); return void i.update({ embeds: [gwCard(g)] });
  }
  if (kind === 'open' && i.isButton()) { // structured modal: text + select + image-only file upload
    return void i.showModal(new ModalBuilder().setCustomId(`tickets:modal:${role}:${cat}`).setTitle('Open a ticket').addLabelComponents(
      new LabelBuilder().setLabel('Subject').setTextInputComponent(new TextInputBuilder().setCustomId('subject').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
      new LabelBuilder().setLabel('Priority').setStringSelectMenuComponent(new StringSelectMenuBuilder().setCustomId('priority').addOptions(['low', 'normal', 'high'].map((v) => ({ label: v, value: v, default: v === 'normal' })))),
      new LabelBuilder().setLabel('Screenshot (optional, images only)').setFileUploadComponent(new FileUploadBuilder().setCustomId('shot').setFileTypes('image').setMinValues(0).setMaxValues(1).setRequired(false))));
  }
  if (kind === 'modal' && i.isModalSubmit()) {
    const subject = i.fields.getTextInputValue('subject'), prio = i.fields.getStringSelectValues('priority')[0] ?? 'normal', shot = i.fields.getUploadedFiles('shot', false)?.first();
    if (d.store.entries<any>('ticket').some(([, t]) => t.gid === i.guildId && t.owner === i.user.id)) return void i.reply(eph('You already have an open ticket.'));
    if (!i.guild.members.me.permissions.has(P.ManageChannels)) return void i.reply(eph('I need Manage Channels to open tickets.'));
    const ow: any[] = [{ id: i.guild.id, deny: [P.ViewChannel] }, { id: i.user.id, allow: [P.ViewChannel, P.SendMessages, P.AttachFiles] }, { id: i.client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ManageChannels] }];
    if (role !== '0' && i.guild.roles.cache.has(role)) ow.push({ id: role, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] });
    const ch = await i.guild.channels.create({ name: `ticket-${i.user.username}`.slice(0, 90), type: ChannelType.GuildText, parent: cat !== '0' && i.guild.channels.cache.has(cat) ? cat : undefined, permissionOverwrites: ow, reason: 'ticket opened' });
    d.store.set('ticket', ch.id, { gid: i.guildId, owner: i.user.id, role });
    await ch.send({ content: `${i.user}${role !== '0' ? ` <@&${role}>` : ''}`, embeds: [card(`Ticket: ${subject}`.slice(0, 256), `Priority: **${prio}**\nDescribe your issue; staff will reply here.`).setImage(shot?.contentType?.startsWith('image/') ? shot.url : null)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(btn('tickets:claim', 'Claim'), btn('tickets:close', 'Close', ButtonStyle.Danger))], allowedMentions: { users: [i.user.id], roles: role !== '0' ? [role] : [] } });
    return void i.reply(eph(`🎫 ${ch}`));
  }
  const t = ticketOf(d.store, i.channelId); if (!t) return void i.reply(eph('Not a ticket.'));
  const staff = i.member.permissions.has(P.ManageMessages);
  if (kind === 'claim') { if (!staff) return void i.reply(eph('Staff only.')); t.claimed = i.user.id; d.store.set('ticket', i.channelId, t); return void i.reply(`🙋 ${i.user} claimed this ticket.`); }
  if (kind === 'close') { if (!staff && i.user.id !== t.owner) return void i.reply(eph('Only staff or the opener can close.')); await i.reply(eph('Closing…')); await closeTicket(d, i.guild, i.channel, i.user.id); }
};
