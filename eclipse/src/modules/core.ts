import { PermissionFlagsBits as P } from 'discord.js';
import { MODULE_NAMES } from '../core/modules.js';
import { catalog } from '../registry/defs.js';
import type { HCtx, Handler } from '../core/types.js';
import { DEFAULTS, type AmCfg } from './automod.js';
import { cfgOf as secCfg } from './security.js';
import { card, eph, gcfg, setGcfg } from './util.js';

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
interface Bundle { desc: string; modules: string[]; apply?: (c: HCtx) => string }
export const BUNDLES: Record<string, Bundle> = {
  'automod-strict': { desc: 'Turn on every automod rule with tight thresholds', modules: ['automod'], apply: (c) => { const a: AmCfg = structuredClone(DEFAULTS); for (const r of Object.values(a.rules)) r.on = true; a.rules.spam.limit = 4; a.rules.mentions.limit = 4; a.rules.caps.limit = 60; a.esc = { timeout: 2, kick: 4, ban: 6 }; setGcfg(c.store, c.guild.id, 'automod', a); return 'All 8 automod rules ON (strict), escalation 2/4/6.'; } },
  'automod-relaxed': { desc: 'Only spam, invites and mass-mention rules, lenient thresholds', modules: ['automod'], apply: (c) => { const a: AmCfg = structuredClone(DEFAULTS); for (const k of ['spam', 'invites', 'mentions']) a.rules[k].on = true; a.rules.spam.limit = 8; a.rules.mentions.limit = 8; a.esc = { timeout: 4, kick: 8, ban: 14 }; setGcfg(c.store, c.guild.id, 'automod', a); return 'Spam/invites/mentions ON (relaxed).'; } },
  'security-paranoid': { desc: 'Anti-nuke ON, every guard limit 2 per 10s', modules: ['security'], apply: (c) => { const s = secCfg(c.store, c.guild.id); s.on = true; for (const g of Object.values(s.limits)) { g.limit = 2; g.windowSec = 10; } setGcfg(c.store, c.guild.id, 'security', s); return 'Anti-nuke ON; all guards 2/10s.'; } },
  'moderation-pack': { desc: 'Ban/kick/timeout/warn presets by reason × duration', modules: ['moderation'] },
  'economy-pack': { desc: 'Bet/transfer/slots presets for every amount', modules: ['economy'] },
  'game-pack': { desc: 'Toss, dice, trivia, Akinator, AniCatch presets', modules: ['games', 'akinator', 'anicatch'] },
};
const count = (mods: string[]) => catalog.bases.filter((b) => mods.includes(b.module)).reduce((n, b) => n + b.size, 0);

export const H: Record<string, Handler> = {
  async search(c) {
    const r = catalog.search(String(c.a.query), 15);
    return eph(r.length ? `Found ${r.length}:\n${r.map((e) => `\`${e.id}\` ${e.name}${e.base.risk ? ' ⚠️' : ''}`).join('\n')}\nRun with \`/eclipse run feature:<id>\`.` : 'No matches.');
  },
  async stats() {
    const s = catalog.stats();
    return { embeds: [card('Registry index', `**${s.total.toLocaleString()}** indexed entries from **${s.bases}** lazy handlers\n\n${Object.entries(s.perModule).map(([m, n]) => `• ${m}: ${n.toLocaleString()}`).join('\n')}\n\nIndex memory: ~${((catalog.offsets.byteLength + 4096) / 1024).toFixed(1)} KB (entries are derived, not stored).`)] };
  },
  async health(c) {
    const m = process.memoryUsage(), cl = c.client, cache = { guilds: cl.guilds.cache.size, channels: cl.channels.cache.size, users: cl.users.cache.size, members: cl.guilds.cache.reduce((n, g) => n + g.members.cache.size, 0) };
    const want: [bigint, string][] = [[P.ManageRoles, 'ManageRoles'], [P.ManageChannels, 'ManageChannels'], [P.BanMembers, 'BanMembers'], [P.KickMembers, 'KickMembers'], [P.ModerateMembers, 'ModerateMembers'], [P.ManageMessages, 'ManageMessages'], [P.ViewAuditLog, 'ViewAuditLog'], [P.CreateInstantInvite, 'CreateInstantInvite']];
    const miss = want.filter(([p]) => !c.me.permissions.has(p)).map(([, n]) => n), top = c.me.roles.highest;
    const cfg = gcfg<any>(c.store, c.guild.id, 'cfg', {});
    return { embeds: [card('Eclipse health', `**WS latency:** ${cl.ws.ping}ms · **Shard:** ${c.guild.shardId}/${cl.ws.shards.size} · **Guilds:** ${cache.guilds}\n**Memory:** rss ${mb(m.rss)} · heap ${mb(m.heapUsed)}\n**Cache:** ${cache.channels} channels · ${cache.users} users · ${cache.members} members\n**Registry:** ${catalog.size.toLocaleString()} entries / ${catalog.bases.length} handlers\n**Bot top role:** ${top} (pos ${top.position}/${c.guild.roles.cache.size - 1})\n**Missing permissions:** ${miss.join(', ') || 'none'}\n**Log channel:** ${cfg.logChannel ? `<#${cfg.logChannel}>` : '⚠️ not set (`/admin logchannel`)'}\n**Disabled modules:** ${cfg.disabled?.join(', ') || 'none'}`)] };
  },
  async module(c) {
    const n = String(c.a.name); if (n === 'core' || !MODULE_NAMES.includes(n)) return `Modules: ${MODULE_NAMES.filter((x) => x !== 'core').join(', ')}`;
    const cfg = gcfg<any>(c.store, c.guild.id, 'cfg', {}), off = new Set<string>(cfg.disabled ?? []); c.a.enabled ? off.delete(n) : off.add(n);
    setGcfg(c.store, c.guild.id, 'cfg', { ...cfg, disabled: [...off] }); return `${c.a.enabled ? '✅ Enabled' : '⛔ Disabled'} module **${n}**.`;
  },
  async bundle(c) {
    const n = c.a.name && String(c.a.name);
    if (!n) return { embeds: [card('Bundles', Object.entries(BUNDLES).map(([k, b]) => `**${k}** — ${b.desc} · expands to **${count(b.modules).toLocaleString()}** entries${b.apply ? ' · applicable' : ''}`).join('\n'))] };
    const b = BUNDLES[n]; if (!b) return 'Unknown bundle.'; if (!c.a.apply) return `**${n}**: ${b.desc} (${count(b.modules).toLocaleString()} entries). ${b.apply ? 'Add `apply:true` to apply.' : 'Preset-only pack: use `/eclipse search` to find entries.'}`;
    if (!b.apply) return 'This pack has no config to apply; its presets are runnable via `/eclipse run`.'; if (!(await c.confirm(`Apply bundle **${n}**? It overwrites current ${b.modules[0]} settings.`))) return;
    return `✅ ${b.apply(c)}`;
  },
};
