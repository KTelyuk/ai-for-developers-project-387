import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryStore, type Store } from '../src/store.ts';
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

const CALL = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Звонок',
  description: '',
  durationMinutes: 30 as const,
};

function storeWithEventTypes(): Store {
  const store = createMemoryStore();
  store.eventTypes.save(INTRO);
  store.eventTypes.save(CONSULTATION);
  store.eventTypes.save(CALL);
  return store;
}

// «Сейчас» — понедельник 16 ноября, 10:00 по Алматы.
let app: ReturnType<typeof buildTestApp>;

afterEach(async () => {
  await app.close();
});

type BookingBody = {
  eventTypeId?: string;
  startAt?: string;
  guestName?: string;
  guestEmail?: string;
  subject?: string;
};

function book(body: BookingBody) {
  return app.inject({
    method: 'POST',
    url: '/api/bookings',
    payload: {
      eventTypeId: CONSULTATION.id,
      startAt: '2026-11-17T09:00:00+05:00',
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
      ...body,
    },
  });
}

function getSlots(date: string, id = CONSULTATION.id) {
  return app.inject({ method: 'GET', url: `/api/event-types/${id}/slots?date=${date}` });
}

describe('бронирование', () => {
  it('создаёт запись: 201, запись с endAt по длительности, токен и ссылка', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });

    const response = await book({ guestName: '  Анна  ' });

    expect(response.statusCode).toBe(201);
    expectMatchesContract('post', '/api/bookings', response);
    const { booking, token, link } = response.json();
    expect(booking).toMatchObject({
      eventTypeId: CONSULTATION.id,
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
      startAt: '2026-11-17T09:00:00+05:00',
      endAt: '2026-11-17T10:00:00+05:00',
      createdAt: '2026-11-16T10:00:00+05:00',
    });
    expect(booking).not.toHaveProperty('cancelToken');
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(link).toBe(`/bookings/${booking.id}?token=${token}`);
  });

  it('длина имени проверяется после обрезки: 100 символов с пробелами по краям — можно', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });
    const name = 'а'.repeat(100);

    const response = await book({ guestName: `  ${name}  ` });

    expect(response.statusCode).toBe(201);
    expect(response.json().booking.guestName).toBe(name);
  });

  it('у каждой записи свой токен', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });

    const first = (await book({})).json();
    const second = (await book({ startAt: '2026-11-17T10:00:00+05:00' })).json();

    expect(first.token).not.toBe(second.token);
  });

  it('то же время в UTC — тот же слот, запись хранится со смещением Алматы', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });

    const response = await book({ startAt: '2026-11-17T04:00:00Z' });

    expect(response.statusCode).toBe(201);
    expect(response.json().booking.startAt).toBe('2026-11-17T09:00:00+05:00');
  });

  it('занятое время пропадает из слотов всех типов встреч', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });

    await book({});

    const consultation = (await getSlots('2026-11-17')).json();
    const intro = (await getSlots('2026-11-17', INTRO.id)).json();
    expect(consultation[0].startAt).toBe('2026-11-17T10:00:00+05:00');
    expect(intro[0].startAt).toBe('2026-11-17T10:00:00+05:00');
  });

  it('то же время второй раз — 409 SLOT_TAKEN', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });
    await book({});

    const response = await book({ guestName: 'Борис', guestEmail: 'boris@example.com' });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'SLOT_TAKEN' });
    expectMatchesContract('post', '/api/bookings', response);
  });

  it('частичное наложение другого типа встречи — 409, впритык — можно', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });
    await book({});

    const overlapping = await book({ eventTypeId: INTRO.id, startAt: '2026-11-17T09:45:00+05:00' });
    const adjacent = await book({ eventTypeId: INTRO.id, startAt: '2026-11-17T10:00:00+05:00' });

    expect(overlapping.statusCode).toBe(409);
    expect(overlapping.json()).toMatchObject({ code: 'SLOT_TAKEN' });
    expect(adjacent.statusCode).toBe(201);
  });

  // Встречи разной длительности: 60 минут в 10:00 занимают 10:00–11:00.
  it.each([
    ['30 минут в 10:30 — внутри часовой встречи', '2026-11-17T10:30:00+05:00'],
    ['30 минут в 09:45 — заходит на начало', '2026-11-17T09:45:00+05:00'],
    ['30 минут в 10:45 — выходит за конец', '2026-11-17T10:45:00+05:00'],
  ])('60 минут в 10:00, затем %s — 409 SLOT_TAKEN', async (_case, startAt) => {
    app = buildTestApp({ store: storeWithEventTypes() });
    expect((await book({ startAt: '2026-11-17T10:00:00+05:00' })).statusCode).toBe(201);

    const response = await book({ eventTypeId: CALL.id, startAt, guestName: 'Борис' });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'SLOT_TAKEN' });
    expectMatchesContract('post', '/api/bookings', response);
  });

  it('60 минут в 10:00, затем 30 минут впритык (09:30 и 11:00) — обе записи проходят', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });
    await book({ startAt: '2026-11-17T10:00:00+05:00' });

    const before = await book({ eventTypeId: CALL.id, startAt: '2026-11-17T09:30:00+05:00' });
    const after = await book({ eventTypeId: CALL.id, startAt: '2026-11-17T11:00:00+05:00' });

    expect([before.statusCode, after.statusCode]).toEqual([201, 201]);
  });

  it('смена длительности типа встречи не меняет время созданной записи', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });
    await book({});

    await app.inject({
      method: 'PATCH',
      url: `/api/admin/event-types/${CONSULTATION.id}`,
      payload: { durationMinutes: 15 },
    });

    const slots = (await getSlots('2026-11-17')).json();
    expect(slots[0].startAt).toBe('2026-11-17T10:00:00+05:00');
    const next = await book({ startAt: '2026-11-17T09:45:00+05:00' });
    expect(next.statusCode).toBe(409);
  });

  it.each([
    ['не на сетке 15 минут', '2026-11-17T09:10:00+05:00'],
    ['до начала рабочего дня', '2026-11-17T08:45:00+05:00'],
    ['заканчивается после 18:00', '2026-11-17T17:15:00+05:00'],
    ['пересекает обед', '2026-11-17T12:30:00+05:00'],
    ['выходной', '2026-11-21T09:00:00+05:00'],
    ['за окном записи', '2026-11-30T09:00:00+05:00'],
    ['уже наступило', '2026-11-16T10:00:00+05:00'],
    ['с секундами', '2026-11-17T09:00:30+05:00'],
  ])('%s — 400 SLOT_UNAVAILABLE', async (_name, startAt) => {
    app = buildTestApp({ store: storeWithEventTypes() });

    const response = await book({ startAt });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    expectMatchesContract('post', '/api/bookings', response);
  });

  it.each([
    ['пустое имя', { guestName: '' }],
    ['имя из пробелов', { guestName: '   ' }],
    ['имя длиннее 100', { guestName: 'а'.repeat(101) }],
    ['имя длиннее 100 после обрезки', { guestName: ` ${'а'.repeat(101)} ` }],
    ['email без @', { guestEmail: 'anna.example.com' }],
    ['email с пробелом', { guestEmail: 'anna @example.com' }],
    ['email длиннее 254', { guestEmail: `${'a'.repeat(250)}@b.kz` }],
    ['startAt не дата', { startAt: 'завтра' }],
  ])('%s — 400 VALIDATION_ERROR', async (_name, body) => {
    app = buildTestApp({ store: storeWithEventTypes() });

    const response = await book(body);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expectMatchesContract('post', '/api/bookings', response);
  });

  it('неизвестный тип встречи — 404 NOT_FOUND', async () => {
    app = buildTestApp({ store: storeWithEventTypes() });

    const response = await book({ eventTypeId: '99999999-9999-4999-8999-999999999999' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
    expectMatchesContract('post', '/api/bookings', response);
  });
});

describe('предмет разговора', () => {
  const subjectOf = async (subject?: string) => {
    app = buildTestApp({ store: storeWithEventTypes() });
    return book(subject === undefined ? {} : { subject });
  };

  it('сохраняется в записи и отдаётся в ответе и на странице записи', async () => {
    const response = await subjectOf('Обсудить проект');
    expect(response.statusCode).toBe(201);
    const { booking, token } = response.json();
    expect(booking.subject).toBe('Обсудить проект');
    const read = await app.inject({
      method: 'GET',
      url: `/api/bookings/${booking.id}?token=${token}`,
    });
    expect(read.json().subject).toBe('Обсудить проект');
  });

  it('пробелы по краям обрезаются, переносы строк внутри сохраняются', async () => {
    const response = await subjectOf('  первое\n\nвторое  ');
    expect(response.json().booking.subject).toBe('первое\n\nвторое');
  });

  it('ровно 500 символов принимаются, 501 — 400 VALIDATION_ERROR без записи', async () => {
    expect((await subjectOf('я'.repeat(500))).statusCode).toBe(201);
    await app.close();
    app = buildTestApp({ store: storeWithEventTypes() });
    const rejected = await book({ subject: 'я'.repeat(501) });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().code).toBe('VALIDATION_ERROR');
    const slots = await getSlots('2026-11-17');
    expect(slots.json().map((slot: { startAt: string }) => slot.startAt)).toContain(
      '2026-11-17T09:00:00+05:00',
    );
  });

  it('длина считается в символах: 500 эмодзи принимаются, 501 — 400 VALIDATION_ERROR', async () => {
    const accepted = await subjectOf('😀'.repeat(500));
    expect(accepted.statusCode).toBe(201);
    expect(accepted.json().booking.subject).toBe('😀'.repeat(500));
    await app.close();
    app = buildTestApp({ store: storeWithEventTypes() });
    const rejected = await book({ subject: '😀'.repeat(501) });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().code).toBe('VALIDATION_ERROR');
  });

  it('500 символов с пробелами по краям принимаются: длина считается после обрезки', async () => {
    expect((await subjectOf(`  ${'я'.repeat(500)}  `)).statusCode).toBe(201);
  });

  it('без поля и из одних пробелов поля у записи нет', async () => {
    for (const subject of [undefined, '', '   \n ']) {
      const response = await subjectOf(subject);
      expect(response.statusCode).toBe(201);
      expect(response.json().booking).not.toHaveProperty('subject');
      await app.close();
    }
    app = buildTestApp({ store: storeWithEventTypes() });
  });

  it('при 409 предмет не сохраняется', async () => {
    const store = storeWithEventTypes();
    app = buildTestApp({ store });
    await book({});
    const taken = await book({ guestName: 'Борис', subject: 'Второй' });
    expect(taken.statusCode).toBe(409);
    expect(store.bookings.list()).toHaveLength(1);
  });
});
