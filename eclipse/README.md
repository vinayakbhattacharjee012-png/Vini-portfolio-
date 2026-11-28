# Eclipse

Modular Discord bot (TypeScript, discord.js 14.28). Lives in `eclipse/`, separate from the portfolio site at the repo root.

```
src/registry/  catalog.ts (derived-entry index) · defs.ts (129 base features × preset axes = 60k+ entries)
src/core/      dispatch (toggle→perms→cooldown→audit→handler) · hierarchy · limiter · audit · scheduler · commands
src/modules/   one lazily-imported file per module (moderation, automod, security, economy, tickets, ai, games, …)
src/storage/   JSON store (atomic, debounced). tests/ scripts/
```

**How 60k entries stay cheap:** entries are not stored. A base feature (e.g. `mod tempban`) declares preset axes (hours × reason × delete-days); entry ids are prefix-sum offsets and the preset is decoded from the ordinal on demand. Only ~30 slash commands are registered; every preset runs via `/eclipse run feature:<autocomplete>`.

## Honest limits
- Audio: queue engine is real; **no playback** (needs `@discordjs/voice` + a stream provider + an adapter that is not written). `/music status` says so.
- AI: needs `AI_API_URL/KEY/MODEL`; otherwise an explicit setup notice. `/ai research` has no web search.
- Storage is a single-process JSON file; swap `Store` for SQLite/Postgres before multi-shard.
- Backup is snapshot + diff only; restore is deliberately not automated.
- Role-granting/targeted invites rely on Discord accepting `roles`/`targetUser`; API rejections are shown, not hidden.
- Akinator uses a built-in 40-character table, not the real Akinator service.
- Privileged intents (Server Members, Message Content) must be enabled in the Developer Portal.
