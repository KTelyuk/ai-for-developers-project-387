import { afterEach, describe, expect, it } from 'vitest';
import { DEV_EVENT_TYPES, seedDevData, shouldSeed } from '../src/dev-seed.ts';
import { createMemoryStore } from '../src/store.ts';
import { expectMatchesContract } from './contract.ts';
import { buildTestApp } from './helpers.ts';

let app: ReturnType<typeof buildTestApp> | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('когда заполнять начальные данные', () => {
  it('с флагом --seed', () => {
    expect(shouldSeed(['node', 'server.ts', '--seed'], {})).toBe(true);
  });

  it('с переменной SEED=true', () => {
    expect(shouldSeed(['node', 'server.ts'], { SEED: 'true' })).toBe(true);
  });

  it('без флага и с любым другим значением SEED сервер стартует пустым', () => {
    expect(shouldSeed(['node', 'server.ts'], {})).toBe(false);
    expect(shouldSeed(['node', 'server.ts'], { SEED: '1' })).toBe(false);
    expect(shouldSeed(['node', 'server.ts'], { SEED: 'false' })).toBe(false);
  });
});

describe('начальные данные для разработки', () => {
  it('гость видит заготовленные типы встреч, и они соответствуют контракту', async () => {
    const store = createMemoryStore();
    seedDevData(store);
    app = buildTestApp({ store });

    const response = await app.inject({ method: 'GET', url: '/api/event-types' });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('get', '/api/event-types', response);
    expect(response.json()).toEqual(
      DEV_EVENT_TYPES.map((eventType) => ({ id: expect.any(String), ...eventType })),
    );
  });

  it('на заготовленный тип можно записаться', async () => {
    const store = createMemoryStore();
    seedDevData(store);
    app = buildTestApp({ store });
    const [eventType] = store.eventTypes.list();

    const response = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId: eventType.id,
        startAt: '2026-11-17T09:00:00+05:00',
        guestName: 'Анна',
        guestEmail: 'anna@example.com',
      },
    });

    expect(response.statusCode).toBe(201);
  });
});
