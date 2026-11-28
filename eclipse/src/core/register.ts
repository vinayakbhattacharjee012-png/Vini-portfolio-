import { REST, Routes } from 'discord.js';
import { getEnv } from './env.js';
import { buildCommands } from './commands.js';

/** PUT the full command set (global, or one guild when DEV_GUILD_ID is set). Idempotent. */
export async function registerCommands() {
  const e = getEnv(); if (!e.token || !e.clientId) throw new Error('Set DISCORD_TOKEN and CLIENT_ID first (see .env.example).');
  const cmds = buildCommands(), route = e.devGuildId ? Routes.applicationGuildCommands(e.clientId, e.devGuildId) : Routes.applicationCommands(e.clientId);
  await new REST().setToken(e.token).put(route, { body: cmds });
  return `Registered ${cmds.length} commands (${e.devGuildId ? 'guild ' + e.devGuildId : 'global'}).`;
}
