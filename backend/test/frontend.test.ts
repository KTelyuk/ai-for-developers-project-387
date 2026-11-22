import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';

const frontendDir = mkdtempSync(path.join(tmpdir(), 'frontend-'));
mkdirSync(path.join(frontendDir, 'assets'));
writeFileSync(path.join(frontendDir, 'index.html'), '<!doctype html><div id="root"></div>');
writeFileSync(path.join(frontendDir, 'assets', 'app.js'), 'console.log("app");');

describe('built frontend', () => {
  const app = buildApp({ frontendDir });

  afterAll(async () => {
    await app.close();
    rmSync(frontendDir, { recursive: true, force: true });
  });

  it('serves index.html at the root', async () => {
    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.body).toContain('<div id="root">');
  });

  it.each(['/book', '/admin/event-types', '/bookings/abc?token=xyz'])(
    'serves index.html for the client-side route %s',
    async (url) => {
      const response = await app.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^text\/html/);
      expect(response.body).toContain('<div id="root">');
    },
  );

  it('serves built assets as files', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/app.js' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.body).toBe('console.log("app");');
  });

  it('keeps the API health check working', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it.each(['/api/nope', '/api'])(
    'answers the unknown API path %s with a 404 error instead of index.html',
    async (url) => {
      const response = await app.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: 'NOT_FOUND', message: expect.any(String) });
    },
  );
});

describe('without a built frontend', () => {
  const app = buildApp({ frontendDir: path.join(tmpdir(), 'no-such-frontend-dir') });

  afterAll(() => app.close());

  it('answers unknown paths with a 404 error', async () => {
    const response = await app.inject({ method: 'GET', url: '/book' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});
