// All secrets/config come from process.env, read lazily so tests can toggle them.
try { process.loadEnvFile('.env'); } catch { /* no .env file: rely on real environment */ }

export const getEnv = () => ({
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  devGuildId: process.env.DEV_GUILD_ID || '',
  dataDir: process.env.DATA_DIR || './data',
  aiUrl: process.env.AI_API_URL || '',
  aiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || '',
  audioUrl: process.env.AUDIO_STREAM_URL || '',
});

export const aiConfigured = () => { const e = getEnv(); return !!(e.aiUrl && e.aiKey && e.aiModel); };
export const AI_SETUP_NOTICE =
  '⚙️ **AI is not configured.** Set `AI_API_URL`, `AI_API_KEY` and `AI_MODEL` (OpenAI-compatible endpoint) in the bot environment and restart. No reply was generated.';
