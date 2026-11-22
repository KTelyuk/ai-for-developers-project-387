import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryStore, type Store } from '../src/store.ts';
import { buildTestApp } from './helpers.ts';

const INTRO = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Знакомство',
  description: '',
  durationMinutes: 15 as const,
};

const CONSULTATION = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Консультация',
  description: '',
  durationMinutes: 60 as const,
};

function storeWithEventTypes(): Store {
  const store = createMemoryStore();
  store.eventTypes.save(INTRO);
  store.eventTypes.save(CONSULTATION);
  return store;
}

// «Сейчас» — понедельник 16 ноября, 10:00 по Алматы.
let app: ReturnType<typeof buildTestApp>;

afterEach(async () => {
  await app.close();
});

function book(eventTypeId: string, startAt: string, guest: number) {
  return app.inject({
    method: 'POST',
    url: '/api/bookings',
    payload: {
      eventTypeId,
      startAt,
      guestName: `Гость ${guest}`,
      guestEmail: `guest${guest}@example.com`,
    },
  });
}

function statuses(responses: { statusCode: number }[]) {
  return responses.map((response) => response.statusCode).toSorted();
}

describe('одновременные брони', () => {
  it('одно и то же время: ровно одна 201, остальные 409 SLOT_TAKEN', async () => {
    const store = storeWithEventTypes();
    app = buildTestApp({ store });

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, guest) =>
        book(CONSULTATION.id, '2026-11-17T09:00:00+05:00', guest),
      ),
    );

    expect(statuses(responses)).toEqual([201, ...Array(9).fill(409)]);
    for (const response of responses.filter((item) => item.statusCode === 409)) {
      expect(response.json()).toMatchObject({ code: 'SLOT_TAKEN' });
    }
    expect(store.bookings.list()).toHaveLength(1);
  });

  it('пересекающееся время разных типов встреч: ровно одна 201, остальные 409', async () => {
    const store = storeWithEventTypes();
    app = buildTestApp({ store });

    // Все интервалы попарно пересекаются (общий отрезок 09:30–09:45), какой бы запрос ни успел первым.
    const responses = await Promise.all([
      book(CONSULTATION.id, '2026-11-17T09:00:00+05:00', 0),
      book(INTRO.id, '2026-11-17T09:30:00+05:00', 1),
      book(CONSULTATION.id, '2026-11-17T09:15:00+05:00', 2),
      book(CONSULTATION.id, '2026-11-17T09:30:00+05:00', 3),
    ]);

    const accepted = responses.filter((response) => response.statusCode === 201);
    expect(accepted).toHaveLength(1);
    expect(statuses(responses)).toEqual([201, 409, 409, 409]);
    expect(store.bookings.list()).toHaveLength(1);
  });
});
