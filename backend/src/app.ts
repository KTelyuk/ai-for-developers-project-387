import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import openapiGlue from 'fastify-openapi-glue';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type Clock, systemClock } from './clock.ts';
import { registerErrorHandling, sendNotFound } from './errors.ts';
import { createHandlers } from './handlers.ts';
import { createMemoryStore, type Store } from './store.ts';

const specification = fileURLToPath(new URL('../../openapi/openapi.yaml', import.meta.url));
const defaultFrontendDir = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

export type AppOptions = {
  clock?: Clock;
  store?: Store;
  /** Собранный фронтенд для отдачи; без каталога (разработка, тесты) не подключается. */
  frontendDir?: string;
};

export function buildApp({
  clock = systemClock,
  store = createMemoryStore(),
  frontendDir = defaultFrontendDir,
}: AppOptions = {}) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  registerErrorHandling(app);
  app.register(openapiGlue, { specification, serviceHandlers: createHandlers({ clock, store }) });

  const serveFrontend = existsSync(frontendDir);
  if (serveFrontend) {
    app.register(fastifyStatic, { root: frontendDir, wildcard: false });
  }

  // Неизвестный путь API — 404 NOT_FOUND; остальные GET/HEAD отдают index.html для маршрутов SPA.
  app.setNotFoundHandler((request, reply) => {
    const isApi = request.url === '/api' || request.url.startsWith('/api/');
    const isPageRequest = request.method === 'GET' || request.method === 'HEAD';
    if (serveFrontend && !isApi && isPageRequest) {
      return reply.sendFile('index.html');
    }
    return sendNotFound(request, reply);
  });

  return app;
}
