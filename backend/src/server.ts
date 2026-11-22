import { buildApp } from './app.ts';
import { seedDevData, shouldSeed } from './dev-seed.ts';
import { createMemoryStore } from './store.ts';

const port = Number(process.env.PORT ?? 3000);
const store = createMemoryStore();
// Данные в памяти, и без заготовок после перезапуска пусто. `--seed` передаёт `npm run dev`,
// `SEED=true` задан на Render, чтобы демо после сна и деплоя открывалось с типами встреч.
if (shouldSeed(process.argv, process.env)) seedDevData(store);
const app = buildApp({ store });

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
