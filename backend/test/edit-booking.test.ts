import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryStore, type Store } from '../src/store.ts';
import { expectMatchesContract } from './contract.ts';
import { buildTestApp } from './helpers.ts';

const INTRO = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Знакомство',
  description: '',
  durationMinutes: 30 as const,
};

const CONSULTATION = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Консультация',
  description: '',
  durationMinutes: 60 as const,
};

const START = '2026-11-17T09:00:00+05:00';
const UNKNOWN_ID = '99999999-9999-4999-8999-999999999999';
const PATH = '/api/bookings/{id}';

// «Сейчас» по умолчанию — понедельник 16 ноября, 10:00 по Алматы; запись — на вторник 09:00.
let app: ReturnType<typeof buildTestApp>;
let store: Store;

afterEach(async () => {
  await app.close();
});

async function book(startAt: string, guestName = 'Анна') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/bookings',
    payload: { eventTypeId: INTRO.id, startAt, guestName, guestEmail: 'anna@example.com' },
  });
  const { booking, token } = response.json();
  return { id: booking.id as string, token: token as string };
}

async function setUp() {
  store = createMemoryStore();
  store.eventTypes.save(INTRO);
  store.eventTypes.save(CONSULTATION);
  app = buildTestApp({ store });
  return book(START);
}

async function reopenAt(now: string) {
  await app.close();
  app = buildTestApp({ now, store });
}

function update(id: string, token: string, payload: Record<string, unknown>) {
  return app.inject({
    method: 'PUT',
    url: `/api/bookings/${id}?token=${encodeURIComponent(token)}`,
    payload: {
      eventTypeId: INTRO.id,
      startAt: START,
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
      ...payload,
    },
  });
}

function getBooking(id: string, token: string) {
  return app.inject({
    method: 'GET',
    url: `/api/bookings/${id}?token=${encodeURIComponent(token)}`,
  });
}

function slotStarts(eventTypeId = INTRO.id) {
  return app
    .inject({ method: 'GET', url: `/api/event-types/${eventTypeId}/slots?date=2026-11-17` })
    .then((response) => response.json().map((slot: { startAt: string }) => slot.startAt));
}

describe('изменение записи гостем', () => {
  it('меняет тип, время, имя и email; id и createdAt прежние, endAt по новой длительности', async () => {
    const { id, token } = await setUp();

    const response = await update(id, token, {
      eventTypeId: CONSULTATION.id,
      startAt: '2026-11-18T14:00:00+05:00',
      guestName: '  Анна Петрова  ',
      guestEmail: 'petrova@example.com',
    });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('put', PATH, response);
    const expected = {
      id,
      eventTypeId: CONSULTATION.id,
      guestName: 'Анна Петрова',
      guestEmail: 'petrova@example.com',
      startAt: '2026-11-18T14:00:00+05:00',
      endAt: '2026-11-18T15:00:00+05:00',
      createdAt: '2026-11-16T10:00:00+05:00',
    };
    expect(response.json()).toEqual(expected);
    // Прежняя ссылка открывает изменённую запись.
    expect((await getBooking(id, token)).json()).toEqual(expected);
  });

  it('прежнее время освобождается, новое занимается', async () => {
    const { id, token } = await setUp();

    await update(id, token, { startAt: '2026-11-17T11:00:00+05:00' });

    const starts = await slotStarts();
    expect(starts).toContain(START);
    expect(starts).not.toContain('2026-11-17T11:00:00+05:00');
  });

  it('сдвиг на время, перекрывающее прежнее, разрешён: запись не мешает сама себе', async () => {
    const { id, token } = await setUp();

    const response = await update(id, token, {
      eventTypeId: CONSULTATION.id,
      startAt: '2026-11-17T09:15:00+05:00',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ endAt: '2026-11-17T10:15:00+05:00' });
  });

  it('то же время с новыми данными — 200', async () => {
    const { id, token } = await setUp();

    const response = await update(id, token, { guestName: 'Анна П.' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ startAt: START, guestName: 'Анна П.' });
  });

  it('время занято другой записью — 409 SLOT_TAKEN, запись не меняется', async () => {
    const { id, token } = await setUp();
    await book('2026-11-17T11:00:00+05:00', 'Борис');

    const response = await update(id, token, {
      eventTypeId: CONSULTATION.id,
      startAt: '2026-11-17T10:30:00+05:00',
    });

    expect(response.statusCode).toBe(409);
    expectMatchesContract('put', PATH, response);
    expect(response.json()).toMatchObject({ code: 'SLOT_TAKEN' });
    expect((await getBooking(id, token)).json()).toMatchObject({
      eventTypeId: INTRO.id,
      startAt: START,
    });
  });

  it.each([
    ['не на сетке', '2026-11-17T09:10:00+05:00'],
    ['в обед', '2026-11-17T13:00:00+05:00'],
    ['в выходной', '2026-11-21T10:00:00+05:00'],
    ['в прошлом', '2026-11-16T09:00:00+05:00'],
  ])('время %s — 400 SLOT_UNAVAILABLE', async (_case, startAt) => {
    const { id, token } = await setUp();

    const response = await update(id, token, { startAt });

    expect(response.statusCode).toBe(400);
    expectMatchesContract('put', PATH, response);
    expect(response.json()).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it.each([
    ['имя из пробелов', { guestName: '   ' }],
    ['имя длиннее 100 символов', { guestName: 'А'.repeat(101) }],
    ['неверный email', { guestEmail: 'anna' }],
  ])('%s — 400 VALIDATION_ERROR', async (_case, payload) => {
    const { id, token } = await setUp();

    const response = await update(id, token, payload);

    expect(response.statusCode).toBe(400);
    expectMatchesContract('put', PATH, response);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('типа встречи нет — 404 NOT_FOUND', async () => {
    const { id, token } = await setUp();

    const response = await update(id, token, { eventTypeId: UNKNOWN_ID });

    expect(response.statusCode).toBe(404);
    expectMatchesContract('put', PATH, response);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('записи нет — 404 NOT_FOUND', async () => {
    const { token } = await setUp();

    const response = await update(UNKNOWN_ID, token, {});

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('неверный токен — 403 INVALID_TOKEN, запись не меняется', async () => {
    const { id, token } = await setUp();

    const response = await update(id, 'A'.repeat(43), { guestName: 'Чужой' });

    expect(response.statusCode).toBe(403);
    expectMatchesContract('put', PATH, response);
    expect(response.json()).toMatchObject({ code: 'INVALID_TOKEN' });
    expect((await getBooking(id, token)).json()).toMatchObject({ guestName: 'Анна' });
  });

  it('встреча уже началась — 409 ALREADY_STARTED', async () => {
    const { id, token } = await setUp();
    await reopenAt(START);

    const response = await update(id, token, { startAt: '2026-11-18T10:00:00+05:00' });

    expect(response.statusCode).toBe(409);
    expectMatchesContract('put', PATH, response);
    expect(response.json()).toMatchObject({ code: 'ALREADY_STARTED' });
  });
});
