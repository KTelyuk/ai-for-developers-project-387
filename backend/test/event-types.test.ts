import { afterEach, describe, expect, it } from 'vitest';
import { expectMatchesContract } from './contract.ts';
import { buildTestApp } from './helpers.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let app = buildTestApp();

afterEach(async () => {
  await app.close();
  app = buildTestApp();
});

function createEventType(payload: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/api/admin/event-types', payload });
}

describe('типы встреч', () => {
  it('без типов встреч список пуст', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/event-types' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
    expectMatchesContract('get', '/api/event-types', response);
  });

  it('владелец создаёт тип встречи, и гость видит его в списке и по id', async () => {
    const created = await createEventType({
      title: 'Знакомство',
      description: 'Короткий звонок',
      durationMinutes: 15,
    });

    expect(created.statusCode).toBe(201);
    expectMatchesContract('post', '/api/admin/event-types', created);
    const eventType = created.json();
    expect(eventType).toEqual({
      id: expect.stringMatching(UUID),
      title: 'Знакомство',
      description: 'Короткий звонок',
      durationMinutes: 15,
    });

    const list = await app.inject({ method: 'GET', url: '/api/event-types' });
    expect(list.json()).toEqual([eventType]);
    expectMatchesContract('get', '/api/event-types', list);

    const one = await app.inject({ method: 'GET', url: `/api/event-types/${eventType.id}` });
    expect(one.statusCode).toBe(200);
    expect(one.json()).toEqual(eventType);
    expectMatchesContract('get', '/api/event-types/{id}', one);
  });

  it('описание необязательно, название обрезается по краям', async () => {
    const created = await createEventType({ title: '  Консультация  ', durationMinutes: 60 });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ title: 'Консультация', description: '' });
  });

  it('список упорядочен по порядку создания', async () => {
    await createEventType({ title: 'Первый', durationMinutes: 30 });
    await createEventType({ title: 'Второй', durationMinutes: 45 });

    const list = await app.inject({ method: 'GET', url: '/api/event-types' });
    expect(list.json().map((item: { title: string }) => item.title)).toEqual(['Первый', 'Второй']);
  });

  it.each([
    ['пустое название', { title: '', durationMinutes: 15 }],
    ['название из пробелов', { title: '   ', durationMinutes: 15 }],
    ['без названия', { durationMinutes: 15 }],
    ['название длиннее 100 символов', { title: 'а'.repeat(101), durationMinutes: 15 }],
    [
      'описание длиннее 500 символов',
      { title: 'Звонок', description: 'а'.repeat(501), durationMinutes: 15 },
    ],
    ['длительность вне списка', { title: 'Звонок', durationMinutes: 20 }],
    ['без длительности', { title: 'Звонок' }],
  ])('%s — 400 VALIDATION_ERROR', async (_name, payload) => {
    const response = await createEventType(payload);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
    expectMatchesContract('post', '/api/admin/event-types', response);

    const list = await app.inject({ method: 'GET', url: '/api/event-types' });
    expect(list.json()).toEqual([]);
  });

  it('название ровно 100 символов и описание ровно 500 — допустимы', async () => {
    const response = await createEventType({
      title: 'а'.repeat(100),
      description: 'б'.repeat(500),
      durationMinutes: 45,
    });

    expect(response.statusCode).toBe(201);
  });

  it('неизвестный id — 404 NOT_FOUND', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/event-types/00000000-0000-4000-8000-000000000000',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'NOT_FOUND', message: expect.any(String) });
    expectMatchesContract('get', '/api/event-types/{id}', response);
  });
});
