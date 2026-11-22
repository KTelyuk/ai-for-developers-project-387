import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryStore, type Store, type StoredBooking } from '../src/store.ts';
import { expectMatchesContract } from './contract.ts';
import { buildTestApp } from './helpers.ts';

const CONSULTATION = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Консультация',
  description: '',
  durationMinutes: 60 as const,
};

function storeWithConsultation(bookings: StoredBooking[] = []): Store {
  const store = createMemoryStore();
  store.eventTypes.save(CONSULTATION);
  for (const booking of bookings) store.bookings.save(booking);
  return store;
}

// «Сейчас» — понедельник 16 ноября, 10:00 по Алматы. Часовой тип встречи: в полном рабочем дне
// 26 слотов (начала 09:00–12:00 и 14:00–17:00 с шагом 15 минут), сегодня после 10:00 — 21.
let app: ReturnType<typeof buildTestApp>;

afterEach(async () => {
  await app.close();
});

function getAvailability(from: string, to: string, id = CONSULTATION.id) {
  return app.inject({
    method: 'GET',
    url: `/api/event-types/${id}/availability?from=${from}&to=${to}`,
  });
}

describe('число свободных слотов по дням', () => {
  it('неделя: сегодня без прошедшего времени, будни целиком, выходные — 0', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getAvailability('2026-11-16', '2026-11-22');

    expect(response.statusCode).toBe(200);
    expectMatchesContract('get', '/api/event-types/{id}/availability', response);
    expect(response.json()).toEqual([
      { date: '2026-11-16', freeSlots: 21 },
      { date: '2026-11-17', freeSlots: 26 },
      { date: '2026-11-18', freeSlots: 26 },
      { date: '2026-11-19', freeSlots: 26 },
      { date: '2026-11-20', freeSlots: 26 },
      { date: '2026-11-21', freeSlots: 0 },
      { date: '2026-11-22', freeSlots: 0 },
    ]);
  });

  it('счётчик дня совпадает с числом слотов этого дня', async () => {
    const booking: StoredBooking = {
      id: '33333333-3333-4333-8333-333333333333',
      eventTypeId: '44444444-4444-4444-8444-444444444444',
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
      startAt: '2026-11-17T09:00:00+05:00',
      endAt: '2026-11-17T09:15:00+05:00',
      createdAt: '2026-11-16T09:00:00+05:00',
      cancelToken: 'token',
    };
    app = buildTestApp({ store: storeWithConsultation([booking]) });

    const counts = (await getAvailability('2026-11-17', '2026-11-17')).json();
    const slots = (
      await app.inject({
        method: 'GET',
        url: `/api/event-types/${CONSULTATION.id}/slots?date=2026-11-17`,
      })
    ).json();

    expect(counts).toEqual([{ date: '2026-11-17', freeSlots: 25 }]);
    expect(slots).toHaveLength(25);
  });

  it('дни вне окна — 0', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const before = await getAvailability('2026-11-15', '2026-11-16');
    const after = await getAvailability('2026-11-27', '2026-11-30');

    expect(before.json()).toEqual([
      { date: '2026-11-15', freeSlots: 0 },
      { date: '2026-11-16', freeSlots: 21 },
    ]);
    expect(after.json()).toEqual([
      { date: '2026-11-27', freeSlots: 26 },
      { date: '2026-11-28', freeSlots: 0 },
      { date: '2026-11-29', freeSlots: 0 },
      { date: '2026-11-30', freeSlots: 0 },
    ]);
  });

  it('окно целиком — 14 дней', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getAvailability('2026-11-16', '2026-11-29');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(14);
  });

  it.each([
    ['длиннее окна', '2026-11-16', '2026-11-30'],
    ['с концом раньше начала', '2026-11-17', '2026-11-16'],
    ['в неверном формате', '16.11.2026', '2026-11-17'],
    ['с несуществующей датой', '2026-11-16', '2026-11-31'],
  ])('диапазон %s — 400 VALIDATION_ERROR', async (_name, from, to) => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getAvailability(from, to);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expectMatchesContract('get', '/api/event-types/{id}/availability', response);
  });

  it('неизвестный тип встречи — 404 NOT_FOUND', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getAvailability(
      '2026-11-16',
      '2026-11-17',
      '99999999-9999-4999-8999-999999999999',
    );

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
    expectMatchesContract('get', '/api/event-types/{id}/availability', response);
  });
});
