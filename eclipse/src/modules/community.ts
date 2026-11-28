import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder, type GuildMember, type Message } from 'discord.js';
import type { Handler, Module } from '../core/types.js';
import { schedule } from '../core/scheduler.js';
import { checkRole, isDangerous } from '../core/hierarchy.js';
import { card, eph, gcfg, setGcfg } from './util.js';

const ts = (d?: Date | number | null) => (d ? `<t:${Math.floor(+d / 1000)}:R>` : 'n/a');
const roleIds = (s: string) => [...new Set([...s.matchAll(/<@&(\d+)>/g)].map((m) => m[1]))].slice(0, 25);

export const H: Record<string, Handler> = {
  async server(c) {
    const g = c.guild; await g.members.fetch().catch(() => {});
    return { embeds: [card(g.name, `**Owner:** <@${g.ownerId}>\n**Members:** ${g.memberCount}\n**Channels:** ${g.channels.cache.size} · **Roles:** ${g.roles.cache.size}\n**Boost tier:** ${g.premiumTier} (${g.premiumSubscriptionCount ?? 0})\n**Created:** ${ts(g.createdAt)}`).setThumbnail(g.iconURL())] };
  },
  async user(c) {
    const u = c.a.user ?? c.actor.user, m = await c.member(u.id);
    return { embeds: [card(u.tag, `**ID:** ${u.id}\n**Created:** ${ts(u.createdAt)}\n**Joined:** ${ts(m?.joinedAt)}\n**Top role:** ${m?.roles.highest ?? 'n/a'}\n**Roles:** ${m ? m.roles.cache.size - 1 : 0}`).setThumbnail(u.displayAvatarURL({ size: 256 }))], allowedMentions: { parse: [] } };
  },
  async role(c) { const r = c.a.role; return { embeds: [card(r.name, `**ID:** ${r.id}\n**Members:** ${r.members.size}\n**Position:** ${r.position}\n**Color:** ${r.hexColor}\n**Mentionable:** ${r.mentionable}\n**Dangerous perms:** ${isDangerous(r) ? 'yes' : 'no'}`, r.color || 0x5865f2)] }; },
  async avatar(c) { const u = c.a.user ?? c.actor.user; return { embeds: [card(`${u.tag}`).setImage(u.displayAvatarURL({ size: 1024 }))] }; },
  async afk(c) { c.store.set('afk', `${c.guild.id}:${c.actor.id}`, { reason: String(c.a.reason ?? 'AFK').slice(0, 200), ts: Date.now(), hits: [] }); return eph('💤 You are now AFK. I will summarise mentions when you return.'); },
  async poll(c) {
    const opts = String(c.a.options).split('|').map((s) => s.trim()).filter(Boolean).slice(0, 5);
    if (opts.length < 2) return 'Give 2–5 options separated by `|`.';
    const min = Math.min(10080, Math.max(1, Number(c.a.minutes ?? 60))), end = Date.now() + min * 60_000;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(opts.map((o, i) => new ButtonBuilder().setCustomId(`community:poll:${i}`).setLabel(o.slice(0, 70)).setStyle(ButtonStyle.Primary)));
    const ch: any = c.channel; const msg = await ch.send({ embeds: [card(`📊 ${String(c.a.question).slice(0, 200)}`, `${opts.map((o) => `• ${o} — 0`).join('\n')}\nEnds <t:${Math.floor(end / 1000)}:R>`)], components: [row] });
    c.store.set('poll', msg.id, { opts, votes: {}, q: String(c.a.question), end });
    schedule({ client: c.client, store: c.store } as any, { at: end, kind: 'pollend', module: 'community', guildId: c.guild.id, data: { ch: ch.id, id: msg.id } });
    return eph('Poll posted.');
  },
  buttons: (c) => panel(c, false), select: (c) => panel(c, true),
  async set(c) { // starboard.set | welcome.set share the key `set`; split by root
    if (c.entry.base.root === 'starboard') { setGcfg(c.store, c.guild.id, 'star', { ch: c.a.channel.id, n: Number(c.a.threshold ?? 3), emoji: String(c.a.emoji ?? '⭐') }); return '✅ Starboard configured.'; }
    const w = gcfg<any>(c.store, c.guild.id, 'welcome', {}); w[String(c.a.kind)] = { ch: c.a.channel.id, msg: String(c.a.message ?? defaults[String(c.a.kind)]).slice(0, 500) };
    setGcfg(c.store, c.guild.id, 'welcome', w); return `✅ ${c.a.kind} card configured.`;
  },
  async test(c) { const w = gcfg<any>(c.store, c.guild.id, 'welcome', {})[String(c.a.kind)]; return w ? { embeds: [welcomeCard(c.actor, String(c.a.kind), w.msg)] } : 'Not configured. Use `/welcome set`.'; },
};
const defaults: Record<string, string> = { welcome: 'Welcome {user} to **{server}**! You are member #{count}.', leave: '{user} left **{server}**.', boost: '💜 {user} boosted **{server}**!' };
const welcomeCard = (m: GuildMember, kind: string, tpl: string) => card(kind === 'welcome' ? '👋 Welcome' : kind === 'leave' ? '👋 Goodbye' : '💜 New boost', tpl.replaceAll('{user}', m.user.tag).replaceAll('{server}', m.guild.name).replaceAll('{count}', String(m.guild.memberCount))).setThumbnail(m.user.displayAvatarURL());

async function panel(c: Parameters<Handler>[0], select: boolean) {
  const ids = roleIds(String(c.a.roles)); if (!ids.length) return 'Mention the roles to include, e.g. `@Red @Blue`.';
  const roles = ids.map((id) => c.guild.roles.cache.get(id)).filter((r) => !!r);
  for (const r of roles) { const e = checkRole(c.guild, c.actor, r!) ?? (isDangerous(r!) ? `${r!.name} has dangerous permissions; refusing to put it on a self-service panel.` : null); if (e) return `⛔ ${r!.name}: ${e}`; }
  const ch: any = c.a.channel ?? c.channel;
  const comp = select
    ? [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('community:rps').setPlaceholder('Pick roles').setMinValues(0).setMaxValues(roles.length).addOptions(roles.map((r) => ({ label: r!.name.slice(0, 100), value: r!.id }))))]
    : Array.from({ length: Math.ceil(Math.min(roles.length, 25) / 5) }, (_, k) => new ActionRowBuilder<ButtonBuilder>().addComponents(roles.slice(k * 5, k * 5 + 5).map((r) => new ButtonBuilder().setCustomId(`community:rp:${r!.id}`).setLabel(r!.name.slice(0, 70)).setStyle(ButtonStyle.Secondary))));
  await ch.send({ embeds: [card(String(c.a.title).slice(0, 200), 'Pick a role below to toggle it.')], components: comp });
  return eph('✅ Panel posted.');
}

async function toggle(i: any, roleId: string, add?: boolean) {
  const role = i.guild.roles.cache.get(roleId), me = i.guild.members.me;
  const err = !role ? 'Role no longer exists.' : isDangerous(role) ? 'That role is not self-assignable.' : checkRole(i.guild, i.member, { id: role.id, position: 0, managed: role.managed }) && me.roles.highest.position <= role.position ? 'I cannot assign that role.' : null;
  if (err) return err;
  const has = i.member.roles.cache.has(roleId), want = add ?? !has;
  if (want && !has) await i.member.roles.add(roleId, 'role panel'); else if (!want && has) await i.member.roles.remove(roleId, 'role panel');
  return `${want ? '✅ Added' : '➖ Removed'} **${role.name}**.`;
}

export const component: Module['component'] = async (i, deps) => {
  const [, kind, arg] = i.customId.split(':');
  if (kind === 'rp') return void i.reply(eph(await toggle(i, arg)));
  if (kind === 'rps') {
    const opts: string[] = i.component.options.map((o: any) => o.value);
    const out: string[] = []; for (const id of opts) out.push(await toggle(i, id, i.values.includes(id)));
    return void i.reply(eph(out.join('\n') || 'No change.'));
  }
  if (kind === 'poll') {
    const st = deps.store, p = st.get('poll', i.message.id); if (!p || Date.now() > p.end) return void i.reply(eph('This poll has ended.'));
    p.votes[i.user.id] = Number(arg); st.set('poll', i.message.id, p);
    const tally = p.opts.map((_: string, k: number) => Object.values(p.votes).filter((v) => v === k).length);
    await i.update({ embeds: [card(`📊 ${p.q}`, `${p.opts.map((o: string, k: number) => `• ${o} — ${tally[k]}`).join('\n')}\nEnds <t:${Math.floor(p.end / 1000)}:R>`)] });
  }
};

export const jobs: Module['jobs'] = {
  async pollend(j, d) {
    const p = d.store.get<any>('poll', j.data.id); const ch: any = d.client.channels.cache.get(j.data.ch); if (!p || !ch) return;
    const msg = await ch.messages.fetch(j.data.id).catch(() => null); if (!msg) return;
    const tally = p.opts.map((_: string, k: number) => Object.values(p.votes).filter((v) => v === k).length);
    await msg.edit({ embeds: [card(`📊 ${p.q} — final`, p.opts.map((o: string, k: number) => `• ${o} — **${tally[k]}**`).join('\n'))], components: [] });
    d.store.del('poll', j.data.id);
  },
};

export const hook: Module['hook'] = (d) => {
  d.client.on('messageCreate', async (m: Message) => {
    if (!m.inGuild() || m.author.bot) return;
    const mine = d.store.get<any>('afk', `${m.guildId}:${m.author.id}`);
    if (mine) {
      d.store.del('afk', `${m.guildId}:${m.author.id}`);
      const hits = mine.hits.slice(-10).map((h: any) => `• <@${h.by}>: ${h.text} ([jump](${h.url}))`).join('\n');
      void m.reply({ content: `👋 Welcome back! AFK since <t:${Math.floor(mine.ts / 1000)}:R>. **${mine.hits.length}** mentions.${hits ? '\n' + hits : ''}`, allowedMentions: { parse: [] } });
    }
    for (const u of m.mentions.users.values()) {
      const a = d.store.get<any>('afk', `${m.guildId}:${u.id}`); if (!a || u.id === m.author.id) continue;
      a.hits.push({ by: m.author.id, text: m.content.slice(0, 80), url: m.url }); if (a.hits.length > 50) a.hits.shift(); d.store.set('afk', `${m.guildId}:${u.id}`, a);
      void m.reply({ content: `💤 **${u.username}** is AFK: ${a.reason}`, allowedMentions: { parse: [] } });
    }
  });
  const sendCard = (m: GuildMember, kind: string) => { const w = gcfg<any>(d.store, m.guild.id, 'welcome', {})[kind]; const ch: any = w && m.guild.channels.cache.get(w.ch); if (ch?.isSendable()) void ch.send({ embeds: [welcomeCard(m, kind, w.msg)] }); };
  d.client.on('guildMemberAdd', (m) => sendCard(m, 'welcome'));
  d.client.on('guildMemberRemove', (m) => sendCard(m as GuildMember, 'leave'));
  d.client.on('guildMemberUpdate', (o, n) => { if (!o.premiumSince && n.premiumSince) sendCard(n, 'boost'); });
  d.client.on('messageReactionAdd', async (r) => {
    const m = r.partial ? await r.fetch().catch(() => null) : r; const msg = m?.message.partial ? await m.message.fetch().catch(() => null) : m?.message;
    if (!m || !msg?.inGuild()) return;
    const s = gcfg<any>(d.store, msg.guildId, 'star', null); if (!s || (m.emoji.name ?? m.emoji.toString()) !== s.emoji || m.count < s.n) return;
    if (d.store.get('starred', `${msg.guildId}:${msg.id}`) || msg.channelId === s.ch) return;
    d.store.set('starred', `${msg.guildId}:${msg.id}`, 1);
    const ch: any = msg.guild.channels.cache.get(s.ch); if (!ch?.isSendable()) return;
    void ch.send({ embeds: [card(`${s.emoji} ${m.count}`, `${msg.content.slice(0, 1500)}\n\n[Jump](${msg.url})`).setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })], allowedMentions: { parse: [] } });
  });
};
void ChannelType;
