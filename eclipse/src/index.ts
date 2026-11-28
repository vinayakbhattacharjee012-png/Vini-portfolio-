import { Client, GatewayIntentBits as G, Options, Partials, MessageFlags } from 'discord.js';
import { getEnv } from './core/env.js';
import { Store } from './storage/store.js';
import { Limiter } from './core/limiter.js';
import { catalog } from './registry/defs.js';
import { HOOK_MODULES, loadModule } from './core/modules.js';
import { autoDefer, direct, exec, findEntry, respond, resolveRun } from './core/dispatch.js';
import { startScheduler } from './core/scheduler.js';
import type { Deps } from './core/types.js';

const env = getEnv();
if (!env.token) { console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.'); process.exit(1); }

const client = new Client({
  // MessageContent + GuildMembers are privileged intents: enable them in the Developer Portal.
  intents: [G.Guilds, G.GuildMembers, G.GuildMessages, G.MessageContent, G.GuildModeration, G.GuildWebhooks, G.GuildMessageReactions, G.GuildVoiceStates],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel],
  makeCache: Options.cacheWithLimits({ ...Options.DefaultMakeCacheSettings, MessageManager: 50, PresenceManager: 0, ReactionManager: 0, GuildScheduledEventManager: 0, VoiceStateManager: 0 }),
  sweepers: { ...Options.DefaultSweeperSettings, messages: { interval: 300, lifetime: 600 } },
});
const deps: Deps = { client, store: new Store(`${env.dataDir}/eclipse.json`), limiter: new Limiter() };

client.once('clientReady', async () => {
  for (const m of HOOK_MODULES) (await loadModule(m)).hook?.(deps);
  startScheduler(deps);
  console.log(`Eclipse ready as ${client.user!.tag} · ${catalog.size.toLocaleString()} indexed entries · ${catalog.bases.length} handlers`);
});

client.on('interactionCreate', async (i) => {
  try {
    if (i.isAutocomplete()) {
      const q = i.options.getFocused();
      return void i.respond(catalog.search(q, 25).map((e) => ({ name: e.name.slice(0, 100), value: i.options.getFocused(true).name === 'query' ? e.name.slice(0, 100) : String(e.id) }))).catch(() => {});
    }
    if (i.isChatInputCommand() || i.isContextMenuCommand()) {
      if (!i.inCachedGuild()) return void i.reply({ content: 'Use this in a server.', flags: MessageFlags.Ephemeral });
      let base = i.isChatInputCommand() ? catalog.base(i.commandName, i.options.getSubcommand(false) ?? i.commandName) : catalog.bases.find((b) => b.ctx?.label === i.commandName);
      if (!base) return void i.reply({ content: 'Unknown command (re-run `npm run deploy`).', flags: MessageFlags.Ephemeral });
      const a: Record<string, any> = {};
      if (i.isChatInputCommand()) for (const s of base.opts) {
        const o = i.options.get(s.n); if (!o) continue;
        a[s.n] = s.t === 'u' ? o.user : s.t === 'r' ? o.role : s.t === 'c' ? o.channel : s.t === 'a' ? o.attachment : o.value;
      } else if (i.isUserContextMenuCommand()) { const s = base.opts.find((x) => x.t === 'u'); if (s) a[s.n] = i.targetUser; }
      else if (i.isMessageContextMenuCommand()) { const s = base.opts.find((x) => x.t === 's'); if (s) a[s.n] = i.targetMessage.content.slice(0, 4000); a._msg = i.targetMessage; }
      let entry = direct(base), args = a;
      if (base.handlerKey === 'core.eclipse.run') { // `eclipse run` → execute any registry entry/preset
        const e = findEntry(String(a.feature));
        if (!e) return void i.reply({ content: 'No such registry entry. Use `/eclipse search`.', flags: MessageFlags.Ephemeral });
        entry = e; args = await resolveRun(i.guild, e.base, e.vars, { user: a.user?.id, role: a.role?.id, channel: a.channel?.id, text: a.text, number: a.number, flag: a.flag });
      }
      const stop = autoDefer(i);
      const r = await exec(deps, { guild: i.guild, actor: i.member, channel: i.channel as any, interaction: i, depth: base.handlerKey === 'core.eclipse.run' ? 1 : 0 }, entry, args);
      stop(); return void (await respond(i, r));
    }
    if (i.isMessageComponent() || i.isModalSubmit()) {
      const m = i.customId.split(':')[0];
      if (m === 'cf') return; // confirmation buttons are awaited inline
      const mod = await loadModule(m).catch(() => null);
      return void (await mod?.component?.(i, deps));
    }
  } catch (e) {
    console.error('[interaction]', e);
    if (i.isRepliable()) { const p = { content: '⚠️ Something went wrong.', flags: MessageFlags.Ephemeral } as const; (i.deferred || i.replied ? i.followUp(p) : i.reply(p)).catch(() => {}); }
  }
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { deps.store.flush(); void client.destroy(); process.exit(0); });
void client.login(env.token);
