import { afterAll, describe, expect, it } from 'vitest';
import { ApiError } from '../src/errors.ts';
import { buildTestApp } from './helpers.ts';

describe('формат ошибок', () => {
  const app = buildTestApp();

  // Пока в контракте нет маршрутов с параметрами и ошибками, проверяем общий обработчик
  // на маршрутах, добавленных только в тесте: так же их проверяет и fastify-openapi-glue.
  app.get(
    '/api/test/validated',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['date'],
          properties: { date: { type: 'string' } },
        },
      },
    },
    () => ({ ok: true }),
  );
  app.get('/api/test/forbidden', () => {
    throw new ApiError(403, 'INVALID_TOKEN', 'Неверный токен');
  });
  app.get('/api/test/crash', () => {
    throw new Error('boom');
  });

  afterAll(() => app.close());

  it('неизвестный путь API отвечает 404 NOT_FOUND', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/no-such-thing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'NOT_FOUND', message: expect.any(String) });
  });

  it('ошибка валидации запроса отвечает 400 VALIDATION_ERROR', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/test/validated' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  });

  it('ошибка обработчика сохраняет свой статус и код', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/test/forbidden' });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ code: 'INVALID_TOKEN', message: 'Неверный токен' });
  });

  it('непредвиденная ошибка отвечает 500 без подробностей', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/test/crash' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal Server Error' });
  });
});
