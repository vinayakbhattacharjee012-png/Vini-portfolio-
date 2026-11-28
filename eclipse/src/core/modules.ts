import type { Module } from './types.js';

/** Handler files load on first use (dynamic import) — startup only pays for the catalog. */
const L: Record<string, () => Promise<Module>> = {
  moderation: () => import('../modules/moderation.js'),
  automod: () => import('../modules/automod.js'),
  community: () => import('../modules/community.js'),
  security: () => import('../modules/security.js'),
  economy: () => import('../modules/economy.js'),
  tickets: () => import('../modules/tickets.js'),
  admin: () => import('../modules/admin.js'),
  music: () => import('../modules/music.js'),
  ai: () => import('../modules/ai.js'),
  games: () => import('../modules/games.js'),
  akinator: () => import('../modules/akinator.js'),
  anicatch: () => import('../modules/anicatch.js'),
  core: () => import('../modules/core.js'),
};
export const MODULE_NAMES = Object.keys(L);
/** Modules that must subscribe to gateway events at startup. */
export const HOOK_MODULES = ['automod', 'community', 'security', 'economy', 'ai', 'anicatch'];
export const loadModule = (name: string) => { const f = L[name]; if (!f) throw new Error(`unknown module ${name}`); return f(); };
