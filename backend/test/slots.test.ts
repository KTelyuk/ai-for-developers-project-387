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

// Каждый тест собирает своё приложение: «сейчас» — понедельник 16 ноября, 10:00 по Алматы.
let app: ReturnType<typeof buildTestApp>;

afterEach(async () => {
  await app.close();
});

function getSlots(date: string, id = CONSULTATION.id) {
  return app.inject({ method: 'GET', url: `/api/event-types/${id}/slots?date=${date}` });
}

describe('слоты дня', () => {
  it('«сейчас» 10:00 понедельника: часовые слоты с 10:15, без обеда и до 18:00', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getSlots('2026-11-16');

    expect(response.statusCode).toBe(200);
    expectMatchesContract('get', '/api/event-types/{id}/slots', response);
    const slots = response.json();
    expect(slots[0]).toEqual({
      startAt: '2026-11-16T10:15:00+05:00',
      endAt: '2026-11-16T11:15:00+05:00',
    });
    expect(slots.at(-1)).toEqual({
      startAt: '2026-11-16T17:00:00+05:00',
      endAt: '2026-11-16T18:00:00+05:00',
    });
    expect(slots.map((slot: { startAt: string }) => slot.startAt.slice(11, 16))).not.toContain(
      '12:15',
    );
  });

  it('записи любого типа занимают время', async () => {
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

    const response = await getSlots('2026-11-17');

    expect(response.json()[0].startAt).toBe('2026-11-17T09:15:00+05:00');
  });

  it('выходной — пустой список', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getSlots('2026-11-21');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it.each([
    ['вчера', '2026-11-15'],
    ['за окном записи', '2026-11-30'],
    ['неверный формат', '16.11.2026'],
    ['несуществующая дата', '2026-11-31'],
  ])('%s — 400 VALIDATION_ERROR', async (_name, date) => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getSlots(date);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expectMatchesContract('get', '/api/event-types/{id}/slots', response);
  });

  it('без даты — 400', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await app.inject({
      method: 'GET',
      url: `/api/event-types/${CONSULTATION.id}/slots`,
    });

    expect(response.statusCode).toBe(400);
  });

  it('неизвестный тип встречи — 404 NOT_FOUND', async () => {
    app = buildTestApp({ store: storeWithConsultation() });

    const response = await getSlots('2026-11-16', '99999999-9999-4999-8999-999999999999');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
    expectMatchesContract('get', '/api/event-types/{id}/slots', response);
  });
});
