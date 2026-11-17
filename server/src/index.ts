import { loadConfig } from './config';
import { buildApp } from './app';
import { MemoryStore } from './store/memory';
import { PgStore } from './store/pg';
import type { Store } from './store/types';

const config = loadConfig();
let store: Store;
if (config.databaseUrl) store = new PgStore(config.databaseUrl);
else { store = new MemoryStore(); console.warn('[tessaria] Sem DATABASE_URL: usando memória (tudo se perde ao reiniciar). Use só em desenvolvimento.'); }

await store.migrate();
const { app } = await buildApp({ config, store });
await app.listen({ port: config.port, host: config.host });
app.log.info(`Fios de Tessária online na porta ${config.port}`);
console.log(`[tessaria] servidor ouvindo em http://${config.host}:${config.port}`);

const shutdown = async (sig: string) => {
  app.log.info(`${sig}: encerrando`);
  try { await app.close(); await store.close(); } finally { process.exit(0); }
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
