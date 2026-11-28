import { ApplicationCommandOptionType as T, ApplicationCommandType, ChannelType } from 'discord.js';
import { catalog } from '../registry/defs.js';
import type { Base, OptSpec } from '../registry/catalog.js';

const TYPE: Record<OptSpec['t'], number> = { s: T.String, i: T.Integer, n: T.Number, b: T.Boolean, u: T.User, r: T.Role, c: T.Channel, a: T.Attachment };
const ROOT_DESC: Record<string, string> = {
  mod: 'Moderation', automod: 'Auto-moderation', info: 'Server/user/role/avatar info', afk: 'AFK status', poll: 'Polls', panel: 'Role panels',
  starboard: 'Starboard', welcome: 'Welcome/leave/boost cards', security: 'Anti-nuke & security', economy: 'Economy', shop: 'Server shop', level: 'Levels & XP',
  profile: 'Profile cards', embed: 'Embed templates', ticket: 'Tickets', giveaway: 'Giveaways', admin: 'Admin utilities', invite: 'Invites', music: 'Music queue',
  ai: 'AI assistant', trigger: 'Smart triggers', remind: 'Reminders', workflow: 'Automations', game: 'Toss & arcade', akinator: 'Akinator', anicatch: 'AniCatch', eclipse: 'Eclipse core',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

const opt = (o: OptSpec) => ({
  type: TYPE[o.t], name: o.n, description: cap(o.n), required: o.req, ...(o.ac ? { autocomplete: true } : {}),
  ...(o.t === 'c' ? { channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.PublicThread] } : {}),
  ...(o.t === 'i' ? { min_value: 0 } : {}),
});
const opts = (b: Base) => [...b.opts].sort((a, c) => Number(c.req) - Number(a.req)).map(opt);

/** Slash JSON for every root + context menus. ≤ ~30 top-level commands regardless of registry size. */
export function buildCommands() {
  const roots = new Map<string, Base[]>();
  for (const b of catalog.bases) roots.set(b.root, [...(roots.get(b.root) ?? []), b]);
  const out: any[] = [];
  for (const [root, bs] of roots) {
    if (bs.length > 25) throw new Error(`root ${root} has >25 subcommands`);
    const direct = bs.length === 1 && bs[0].name === root;
    const perms = new Set(bs.map((b) => b.perms));
    out.push({
      name: root, description: ROOT_DESC[root] ?? root, contexts: [0], integration_types: [0],
      // Only hide the whole command when every subcommand needs the same permission; dispatch re-checks per entry.
      default_member_permissions: perms.size === 1 && bs[0].perms ? String(bs[0].perms) : null,
      options: direct ? opts(bs[0]) : bs.map((b) => ({ type: T.Subcommand, name: b.name, description: b.desc.slice(0, 100), options: opts(b) })),
      ...(direct ? { description: bs[0].desc.slice(0, 100) } : {}),
    });
  }
  for (const b of catalog.bases) if (b.ctx)
    out.push({ name: b.ctx.label, type: b.ctx.type === 'user' ? ApplicationCommandType.User : ApplicationCommandType.Message, contexts: [0], integration_types: [0] });
  return out;
}
