// Fast end-to-end sanity report (no Discord login needed).
import { buildCommands } from '../src/core/commands.js';
import { callAI } from '../src/modules/ai.js';
import { audioStatus } from '../src/modules/music.js';
import { catalog } from '../src/registry/defs.js';

const t0 = performance.now(), s = catalog.stats();
console.log(`registry: ${s.total.toLocaleString()} indexed entries, ${s.bases} lazy handlers (built in ${(performance.now() - t0).toFixed(1)}ms)`);
console.log(`discord payload: ${buildCommands().length} application commands registered (limit 100)`);
console.log(`sample entry: ${JSON.stringify({ ...catalog.entry(12345)!, base: undefined, perms: String(catalog.entry(12345)!.perms) })}`);
for (const k of ['AI_API_URL', 'AI_API_KEY', 'AI_MODEL']) delete process.env[k];
console.log('ai (no keys):', JSON.stringify(await callAI('s', 'hello')));
console.log('audio status:', JSON.stringify(await audioStatus()));
console.log(`heap after load: ${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB`);
