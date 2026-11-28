// Structural types so tests can use plain objects; real GuildMember/Role satisfy them.
export interface HMember { id: string; roles: { highest: { position: number } } }
export interface HGuild { ownerId: string; members: { me: HMember | null } }
export interface HRole { id: string; position: number; managed: boolean }

/** Returns a refusal reason, or null if `actor` may act on `target` (and the bot can too). */
export function checkTarget(g: HGuild, actor: HMember, target: HMember): string | null {
  const me = g.members.me;
  if (!me) return 'Bot member not cached.';
  if (target.id === g.ownerId) return 'Target is the server owner.';
  if (target.id === actor.id) return 'You cannot target yourself.';
  if (target.id === me.id) return 'I will not target myself.';
  if (actor.id !== g.ownerId && actor.roles.highest.position <= target.roles.highest.position)
    return 'Target’s highest role is equal to or above yours.';
  if (me.roles.highest.position <= target.roles.highest.position)
    return 'Target’s highest role is equal to or above mine — move my role higher.';
  return null;
}

export function checkRole(g: HGuild, actor: HMember, role: HRole): string | null {
  const me = g.members.me;
  if (!me) return 'Bot member not cached.';
  if (role.managed || role.id === (g as any).id) return 'That role is managed/@everyone and cannot be assigned.';
  if (actor.id !== g.ownerId && actor.roles.highest.position <= role.position) return 'That role is equal to or above your highest role.';
  if (me.roles.highest.position <= role.position) return 'That role is equal to or above my highest role.';
  return null;
}

import { PermissionFlagsBits as P } from 'discord.js';
/** Roles with any of these must never be self-assignable via panels/verification/rewards. */
export const DANGEROUS_PERMS = P.Administrator | P.ManageGuild | P.ManageRoles | P.ManageChannels | P.ManageWebhooks | P.BanMembers | P.KickMembers | P.ModerateMembers | P.MentionEveryone | P.ManageMessages | P.ManageNicknames;
export const isDangerous = (r: { permissions: { bitfield: bigint } }) => (r.permissions.bitfield & DANGEROUS_PERMS) !== 0n;
