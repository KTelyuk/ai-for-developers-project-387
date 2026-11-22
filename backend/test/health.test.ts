import { afterAll, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.ts';

describe('smoke', () => {
  const app = buildTestApp();

  afterAll(() => app.close());

  it('starts and responds to health check', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
