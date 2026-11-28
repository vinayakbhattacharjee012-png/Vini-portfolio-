import { PermissionFlagsBits as P, type Message } from 'discord.js';
import type { Deps, Handler, Module } from '../core/types.js';
import { addCase, card, gcfg, setGcfg, userCases } from './util.js';

export type Rule = 'spam' | 'duplicates' | 'mentions' | 'invites' | 'caps' | 'zalgo' | 'emoji' | 'profanity';
export interface AmCfg { rules: Record<string, { on: boolean; limit: number; action: string }>; words: string[]; esc: { timeout: number; kick: number; ban: number } }
export const DEFAULTS: AmCfg = {
  rules: { spam: { on: false, limit: 5, action: 'timeout' }, duplicates: { on: false, limit: 3, action: 'delete' }, mentions: { on: false, limit: 5, action: 'timeout' }, invites: { on: false, limit: 1, action: 'delete' },
    caps: { on: false, limit: 70, action: 'delete' }, zalgo: { on: false, limit: 6, action: 'delete' }, emoji: { on: false, limit: 10, action: 'delete' }, profanity: { on: false, limit: 1, action: 'delete' } },
  words: [], esc: { timeout: 3, kick: 6, ban: 10 },
};
const INVITE = /(discord\.gg|discord(?:app)?\.com\/invite)\/\w+/i;
// Small seed list of known phishing-lure patterns; extend per guild via profanity words.
const PHISH = /(dlscord|discorcl|disc0rd|discordnitro|steamcommunnity)\.\w{2,}|free[- ]nitro/i;
const EMOJI = /\p{Extended_Pictographic}|<a?:\w+:\d+>/gu;

/** Pure, deterministic evaluator: returns the first violated rule name or null. `hist` = recent messages by this user (newest last). */
export function evaluate(content: string, mentions: number, hist: { t: number; c: string }[], cfg: AmCfg, now = Date.now()): Rule | null {
  const on = (r: Rule) => cfg.rules[r]?.on, lim = (r: Rule) => cfg.rules[r].limit;
  if (on('spam') && hist.filter((h) => now - h.t < 5000).length + 1 > lim('spam')) return 'spam';
  if (on('duplicates')) { let n = 1; for (let k = hist.length - 1; k >= 0 && hist[k].c === content; k--) n++; if (n >= lim('duplicates') && content) return 'duplicates'; }
  if (on('mentions') && mentions >= lim('mentions')) return 'mentions';
  if (on('invites') && (INVITE.test(content) || PHISH.test(content))) return 'invites';
  if (on('caps')) { const l = content.replace(/[^a-z]/gi, ''); if (l.length >= 12 && (l.replace(/[^A-Z]/g, '').length / l.length) * 100 >= lim('caps')) return 'caps'; }
  if (on('zalgo') && (content.match(/[̀-ͯ]/g)?.length ?? 0) >= lim('zalgo')) return 'zalgo';
  if (on('emoji') && (content.match(EMOJI)?.length ?? 0) >= lim('emoji')) return 'emoji';
  if (on('profanity') && cfg.words.length) { const lc = content.toLowerCase(); if (cfg.words.some((w) => lc.includes(w))) return 'profanity'; }
  return null;
}
/** Strike → escalation tier. */
export const tier = (strikes: number, e: AmCfg['esc']) => (strikes >= e.ban ? 'ban' : strikes >= e.kick ? 'kick' : strikes >= e.timeout ? 'timeout' : 'none');

const cfgOf = (s: Deps['store'], gid: string): AmCfg => gcfg(s, gid, 'automod', structuredClone(DEFAULTS));
const hist = new Map<string, { t: number; c: string }[]>();

export const H: Record<string, Handler> = {
  async rule(c) {
    const name = String(c.a.rule); const cfg = cfgOf(c.store, c.guild.id);
    if (!cfg.rules[name]) return `Unknown rule. Use: ${Object.keys(cfg.rules).join(', ')}`;
    const r = cfg.rules[name]; if (c.a.enabled !== undefined) r.on = !!c.a.enabled; if (c.a.threshold) r.limit = Number(c.a.threshold);
    if (c.a.action) { if (!['delete', 'warn', 'timeout', 'kick'].includes(String(c.a.action))) return 'Action must be delete|warn|timeout|kick.'; r.action = String(c.a.action); }
    setGcfg(c.store, c.guild.id, 'automod', cfg); return `✅ \`${name}\`: ${r.on ? 'ON' : 'OFF'}, threshold ${r.limit}, action ${r.action}.`;
  },
  async status(c) {
    const cfg = cfgOf(c.store, c.guild.id);
    return { embeds: [card('Automod', Object.entries(cfg.rules).map(([k, r]) => `${r.on ? '🟢' : '⚫'} **${k}** limit ${r.limit} → ${r.action}`).join('\n') + `\n\nEscalation: timeout@${cfg.esc.timeout} kick@${cfg.esc.kick} ban@${cfg.esc.ban}\nWords: ${cfg.words.length}`)] };
  },
  async escalate(c) {
    const cfg = cfgOf(c.store, c.guild.id), [t, k, b] = [c.a.timeout_at, c.a.kick_at, c.a.ban_at].map(Number);
    if (!(t < k && k < b)) return 'Need timeout_at < kick_at < ban_at.';
    cfg.esc = { timeout: t, kick: k, ban: b }; setGcfg(c.store, c.guild.id, 'automod', cfg); return '✅ Escalation updated.';
  },
  async strikes(c) { return `${c.a.user} has **${userCases(c.store, c.guild.id, c.a.user.id).filter((x) => x.type === 'automod').length}** automod strikes.`; },
  async clearstrikes(c) {
    let n = 0; for (const [k, v] of c.store.entries<any>('cases', `${c.guild.id}:`)) if (v.userId === c.a.user.id && v.type === 'automod') { v.type = 'automod-cleared'; c.store.set('cases', k, v); n++; }
    return `✅ Cleared ${n} strikes.`;
  },
  async wordadd(c) { const cfg = cfgOf(c.store, c.guild.id); cfg.words = [...new Set([...cfg.words, String(c.a.word).toLowerCase().slice(0, 40)])].slice(0, 500); setGcfg(c.store, c.guild.id, 'automod', cfg); return '✅ Added.'; },
  async wordremove(c) { const cfg = cfgOf(c.store, c.guild.id); cfg.words = cfg.words.filter((w) => w !== String(c.a.word).toLowerCase()); setGcfg(c.store, c.guild.id, 'automod', cfg); return '✅ Removed.'; },
};

export const hook: Module['hook'] = (d) => {
  d.client.on('messageCreate', async (m: Message) => {
    if (!m.inGuild() || m.author.bot || !m.member || m.member.permissions.has(P.ManageMessages)) return; // staff are exempt
    const cfg = cfgOf(d.store, m.guildId); if (!Object.values(cfg.rules).some((r) => r.on)) return;
    if (d.store.get<any>('cfg:security', m.guildId)?.trusted?.includes(m.author.id)) return;
    const key = `${m.guildId}:${m.author.id}`, h = (hist.get(key) ?? []).filter((x) => Date.now() - x.t < 30_000);
    const rule = evaluate(m.content, m.mentions.users.size, h, cfg);
    h.push({ t: Date.now(), c: m.content }); hist.set(key, h);
    if (hist.size > 5000) hist.delete(hist.keys().next().value!);
    if (!rule) return;
    const action = cfg.rules[rule].action;
    await m.delete().catch(() => {});
    if (action === 'delete') return;
    addCase(d.store, m.guildId, 'automod', m.author.id, d.client.user!.id, `rule:${rule}`);
    const n = userCases(d.store, m.guildId, m.author.id).filter((x) => x.type === 'automod').length;
    const t = tier(n, cfg.esc), me = m.guild.members.me!;
    // Never act above the bot's own hierarchy.
    const ok = me.roles.highest.position > m.member.roles.highest.position && m.author.id !== m.guild.ownerId;
    if (ok) {
      if (t === 'ban' && me.permissions.has(P.BanMembers)) await m.member.ban({ reason: `automod: ${rule} (${n} strikes)` }).catch(() => {});
      else if (t === 'kick' && me.permissions.has(P.KickMembers)) await m.member.kick(`automod: ${rule}`).catch(() => {});
      else if ((t === 'timeout' || action === 'timeout') && me.permissions.has(P.ModerateMembers)) await m.member.timeout(10 * 60_000, `automod: ${rule}`).catch(() => {});
    }
    if ('send' in m.channel) void m.channel.send({ content: `⚠️ ${m.author}, that triggered automod (**${rule}**). Strikes: ${n}.`, allowedMentions: { users: [m.author.id] } }).then((x) => setTimeout(() => x.delete().catch(() => {}), 8000));
  });
};
