// Launcher for panel hosts that run `node index.js`: loads the TypeScript source via tsx (no build step).
import { register } from 'tsx/esm/api';
register();
await import('./src/index.ts');
