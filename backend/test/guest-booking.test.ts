import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryStore, type Store } from '../src/store.ts';
import { expectMatchesContract } from './contract.ts';
import { buildTestApp } from './helpers.ts';

const CONSULTATION = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Консультация',
  description: '',
  durationMinutes: 60 as const,
};

const START = '2026-11-17T09:00:00+05:00';
const UNKNOWN_ID = '99999999-9999-4999-8999-999999999999';

// «Сейчас» по умолчанию — понедельник 16 ноября, 10:00 по Алматы; запись — на вторник 09:00.
let app: ReturnType<typeof buildTestApp>;
let store: Store;

afterEach(async () => {
  await app.close();
});

async function bookConsultation() {
  store = createMemoryStore();
  store.eventTypes.save(CONSULTATION);
  app = buildTestApp({ store });
  const response = await app.inject({
    method: 'POST',
    url: '/api/bookings',
    payload: {
      eventTypeId: CONSULTATION.id,
      startAt: START,
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
    },
  });
  const { booking, token } = response.json();
  return { id: booking.id as string, token: token as string };
}

// Те же данные, но часы показывают другой момент.
async function reopenAt(now: string) {
  await app.close();
  app = buildTestApp({ now, store });
}

function getBooking(id: string, token: string) {
  return app.inject({
    method: 'GET',
    url: `/api/bookings/${id}?token=${encodeURIComponent(token)}`,
  });
}

function cancelBooking(id: string, token: string) {
  return app.inject({
    method: 'DELETE',
    url: `/api/bookings/${id}?token=${encodeURIComponent(token)}`,
  });
}

function slotStarts() {
  return app
    .inject({ method: 'GET', url: `/api/event-types/${CONSULTATION.id}/slots?date=2026-11-17` })
    .then((response) => response.json().map((slot: { startAt: string }) => slot.startAt));
}

describe('страница записи гостя', () => {
  it('по верному токену отдаёт запись без токена', async () => {
    const { id, token } = await bookConsultation();

    const response = await getBooking(id, token);

    expect(response.statusCode).toBe(200);
    expectMatchesContract('get', '/api/bookings/{id}', response);
    expect(response.json()).toEqual({
      id,
      eventTypeId: CONSULTATION.id,
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
      startAt: START,
      endAt: '2026-11-17T10:00:00+05:00',
      createdAt: '2026-11-16T10:00:00+05:00',
    });
  });

  it('записи нет — 404 NOT_FOUND', async () => {
    const { token } = await bookConsultation();

    const response = await getBooking(UNKNOWN_ID, token);

    expect(response.statusCode).toBe(404);
    expectMatchesContract('get', '/api/bookings/{id}', response);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it.each([
    ['чужой токен той же длины', 'A'.repeat(43)],
    ['токен другой длины', 'short'],
  ])('%s — 403 INVALID_TOKEN', async (_case, wrongToken) => {
    const { id } = await bookConsultation();

    const response = await getBooking(id, wrongToken);

    expect(response.statusCode).toBe(403);
    expectMatchesContract('get', '/api/bookings/{id}', response);
    expect(response.json()).toMatchObject({ code: 'INVALID_TOKEN' });
  });
});

describe('отмена гостем', () => {
  it('отменяет запись: 204, время снова свободно, запись больше не найти', async () => {
    const { id, token } = await bookConsultation();
    expect(await slotStarts()).not.toContain(START);

    const response = await cancelBooking(id, token);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(await slotStarts()).toContain(START);
    expect((await getBooking(id, token)).statusCode).toBe(404);
  });

  it('повторная отмена — 404 NOT_FOUND', async () => {
    const { id, token } = await bookConsultation();
    await cancelBooking(id, token);

    const response = await cancelBooking(id, token);

    expect(response.statusCode).toBe(404);
    expectMatchesContract('delete', '/api/bookings/{id}', response);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('неверный токен — 403 INVALID_TOKEN, запись остаётся', async () => {
    const { id, token } = await bookConsultation();

    const response = await cancelBooking(id, 'A'.repeat(43));

    expect(response.statusCode).toBe(403);
    expectMatchesContract('delete', '/api/bookings/{id}', response);
    expect(response.json()).toMatchObject({ code: 'INVALID_TOKEN' });
    expect((await getBooking(id, token)).statusCode).toBe(200);
  });

  it('за минуту до начала ещё можно отменить', async () => {
    const { id, token } = await bookConsultation();
    await reopenAt('2026-11-17T08:59:00+05:00');

    expect((await cancelBooking(id, token)).statusCode).toBe(204);
  });

  it.each([
    ['в момент начала', START],
    ['во время встречи (момент в UTC)', '2026-11-17T04:30:00Z'],
    ['после окончания', '2026-11-17T11:00:00+05:00'],
  ])('встреча уже началась (%s) — 409 ALREADY_STARTED, запись остаётся', async (_case, now) => {
    const { id, token } = await bookConsultation();
    await reopenAt(now);

    const response = await cancelBooking(id, token);

    expect(response.statusCode).toBe(409);
    expectMatchesContract('delete', '/api/bookings/{id}', response);
    expect(response.json()).toMatchObject({ code: 'ALREADY_STARTED' });
    expect((await getBooking(id, token)).statusCode).toBe(200);
  });
});
