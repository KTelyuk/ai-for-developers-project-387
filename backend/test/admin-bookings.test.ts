import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryStore, type Store, type StoredBooking } from '../src/store.ts';
import { expectMatchesContract } from './contract.ts';
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

function booking(
  id: string,
  eventTypeId: string,
  startAt: string,
  endAt: string,
  guestName = 'Анна',
): StoredBooking {
  return {
    id,
    eventTypeId,
    guestName,
    guestEmail: `${guestName.toLowerCase()}@example.com`,
    startAt,
    endAt,
    createdAt: '2026-11-15T12:00:00+05:00',
    cancelToken: `token-${id}`,
  };
}

// «Сейчас» — понедельник 16 ноября, 10:00 по Алматы.
const FINISHED = booking(
  'aaaaaaaa-0000-4000-8000-000000000001',
  INTRO.id,
  '2026-11-16T09:00:00+05:00',
  '2026-11-16T09:15:00+05:00',
  'Борис',
);
// Закончилась ровно сейчас: конец интервала не входит в него.
const ENDED_NOW = booking(
  'aaaaaaaa-0000-4000-8000-000000000002',
  INTRO.id,
  '2026-11-16T09:45:00+05:00',
  '2026-11-16T10:00:00+05:00',
  'Вера',
);
const ONGOING = booking(
  'aaaaaaaa-0000-4000-8000-000000000003',
  CONSULTATION.id,
  '2026-11-16T09:30:00+05:00',
  '2026-11-16T10:30:00+05:00',
  'Глеб',
);
const TOMORROW = booking(
  'aaaaaaaa-0000-4000-8000-000000000004',
  CONSULTATION.id,
  '2026-11-17T09:00:00+05:00',
  '2026-11-17T10:00:00+05:00',
  'Дина',
);
// Задана в UTC: сравнение идёт по моменту, а не по строке.
const LATER_TODAY_UTC = booking(
  'aaaaaaaa-0000-4000-8000-000000000005',
  INTRO.id,
  '2026-11-16T09:00:00Z',
  '2026-11-16T09:15:00Z',
  'Ева',
);

function seededStore(bookings: StoredBooking[]): Store {
  const store = createMemoryStore();
  store.eventTypes.save(INTRO);
  store.eventTypes.save(CONSULTATION);
  for (const item of bookings) store.bookings.save(item);
  return store;
}

let app: ReturnType<typeof buildTestApp>;

afterEach(async () => {
  await app.close();
});

function listBookings() {
  return app.inject({ method: 'GET', url: '/api/admin/bookings' });
}

describe('встречи владельца', () => {
  it('без записей — пустой список', async () => {
    app = buildTestApp({ store: seededStore([]) });

    const response = await listBookings();

    expect(response.statusCode).toBe(200);
    expectMatchesContract('get', '/api/admin/bookings', response);
    expect(response.json()).toEqual([]);
  });

  it('показывает незакончившиеся встречи всех типов по возрастанию начала, с названием типа', async () => {
    app = buildTestApp({
      store: seededStore([TOMORROW, FINISHED, LATER_TODAY_UTC, ENDED_NOW, ONGOING]),
    });

    const response = await listBookings();

    expect(response.statusCode).toBe(200);
    expectMatchesContract('get', '/api/admin/bookings', response);
    const body = response.json();
    expect(body.map((item: { guestName: string }) => item.guestName)).toEqual([
      'Глеб',
      'Ева',
      'Дина',
    ]);
    expect(body[0]).toEqual({
      id: ONGOING.id,
      eventTypeId: CONSULTATION.id,
      eventTypeTitle: 'Консультация',
      guestName: 'Глеб',
      guestEmail: 'глеб@example.com',
      startAt: '2026-11-16T09:30:00+05:00',
      endAt: '2026-11-16T10:30:00+05:00',
      createdAt: '2026-11-15T12:00:00+05:00',
    });
    expect(body[1].eventTypeTitle).toBe('Знакомство');
  });
});

describe('отмена владельцем', () => {
  function cancel(id: string) {
    return app.inject({ method: 'DELETE', url: `/api/admin/bookings/${id}` });
  }

  it('удаляет будущую запись: 204, запись пропадает, время снова свободно', async () => {
    app = buildTestApp({ store: seededStore([TOMORROW]) });

    const response = await cancel(TOMORROW.id);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect((await listBookings()).json()).toEqual([]);
    const slots = await app.inject({
      method: 'GET',
      url: `/api/event-types/${CONSULTATION.id}/slots?date=2026-11-17`,
    });
    expect(slots.json()).toContainEqual({
      startAt: '2026-11-17T09:00:00+05:00',
      endAt: '2026-11-17T10:00:00+05:00',
    });
  });

  it('отменяет и уже начавшуюся встречу', async () => {
    app = buildTestApp({ store: seededStore([ONGOING]) });

    const response = await cancel(ONGOING.id);

    expect(response.statusCode).toBe(204);
    expect((await listBookings()).json()).toEqual([]);
  });

  it('несуществующая или уже отменённая запись — 404 NOT_FOUND', async () => {
    app = buildTestApp({ store: seededStore([TOMORROW]) });
    await cancel(TOMORROW.id);

    const response = await cancel(TOMORROW.id);

    expect(response.statusCode).toBe(404);
    expectMatchesContract('delete', '/api/admin/bookings/{id}', response);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});
