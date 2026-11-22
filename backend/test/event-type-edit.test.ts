import { afterEach, describe, expect, it } from 'vitest';
import { expectMatchesContract } from './contract.ts';
import { buildTestApp } from './helpers.ts';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

let app = buildTestApp();

afterEach(async () => {
  await app.close();
  app = buildTestApp();
});

async function createIntro() {
  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/event-types',
    payload: { title: 'Знакомство', description: 'Короткий звонок', durationMinutes: 15 },
  });
  return response.json() as { id: string };
}

function updateEventType(id: string, payload: Record<string, unknown>) {
  return app.inject({ method: 'PATCH', url: `/api/admin/event-types/${id}`, payload });
}

describe('редактирование типа встречи', () => {
  it('владелец меняет все поля, и гость видит новые данные в списке и по id', async () => {
    const { id } = await createIntro();

    const response = await updateEventType(id, {
      title: 'Консультация',
      description: 'Подробный разбор',
      durationMinutes: 60,
    });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('patch', '/api/admin/event-types/{id}', response);
    const updated = {
      id,
      title: 'Консультация',
      description: 'Подробный разбор',
      durationMinutes: 60,
    };
    expect(response.json()).toEqual(updated);

    const list = await app.inject({ method: 'GET', url: '/api/event-types' });
    expect(list.json()).toEqual([updated]);
    const one = await app.inject({ method: 'GET', url: `/api/event-types/${id}` });
    expect(one.json()).toEqual(updated);
  });

  it('частичное изменение сохраняет остальные поля', async () => {
    const { id } = await createIntro();

    const response = await updateEventType(id, { description: 'Новое описание' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id,
      title: 'Знакомство',
      description: 'Новое описание',
      durationMinutes: 15,
    });
  });

  it('название обрезается по краям, описание можно очистить', async () => {
    const { id } = await createIntro();

    const response = await updateEventType(id, { title: '  Звонок  ', description: '' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ title: 'Звонок', description: '' });
  });

  it.each([
    ['пустое название', { title: '' }],
    ['название из пробелов', { title: '   ' }],
    ['название длиннее 100 символов', { title: 'а'.repeat(101) }],
    ['описание длиннее 500 символов', { description: 'а'.repeat(501) }],
    ['длительность вне списка', { durationMinutes: 20 }],
  ])('%s — 400 VALIDATION_ERROR, тип встречи не меняется', async (_name, payload) => {
    const { id } = await createIntro();

    const response = await updateEventType(id, payload);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) });
    expectMatchesContract('patch', '/api/admin/event-types/{id}', response);
    const one = await app.inject({ method: 'GET', url: `/api/event-types/${id}` });
    expect(one.json()).toEqual({
      id,
      title: 'Знакомство',
      description: 'Короткий звонок',
      durationMinutes: 15,
    });
  });

  it('неизвестный id — 404 NOT_FOUND', async () => {
    const response = await updateEventType(UNKNOWN_ID, { title: 'Звонок' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'NOT_FOUND', message: expect.any(String) });
    expectMatchesContract('patch', '/api/admin/event-types/{id}', response);
  });
});
