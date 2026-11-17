import { loadRuntimeSecrets } from '../src/server/config/runtime.mjs';
await loadRuntimeSecrets();
await import('./migrate.mjs');
