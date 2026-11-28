import { REST, Routes } from 'discord.js';
import { getEnv } from '../src/core/env.js';
import { buildCommands } from '../src/core/commands.js';

const e = getEnv();
if (!e.token || !e.clientId) { console.error('Set DISCORD_TOKEN and CLIENT_ID first (see .env.example).'); process.exit(1); }
const cmds = buildCommands();
const rest = new REST().setToken(e.token);
const route = e.devGuildId ? Routes.applicationGuildCommands(e.clientId, e.devGuildId) : Routes.applicationCommands(e.clientId);
await rest.put(route, { body: cmds });
console.log(`Registered ${cmds.length} commands (${e.devGuildId ? 'guild ' + e.devGuildId : 'global'}).`);
