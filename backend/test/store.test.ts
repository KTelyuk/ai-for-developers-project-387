import { describe, expect, it } from 'vitest';
import { type EventType, createMemoryStore } from '../src/store.ts';

const intro: EventType = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Знакомство',
  description: 'Короткий звонок',
  durationMinutes: 15,
};

describe('хранилище в памяти', () => {
  it('сохраняет, находит, заменяет и удаляет типы встреч', () => {
    const { eventTypes } = createMemoryStore();
    expect(eventTypes.list()).toEqual([]);

    eventTypes.save(intro);
    expect(eventTypes.get(intro.id)).toEqual(intro);

    eventTypes.save({ ...intro, durationMinutes: 30 });
    expect(eventTypes.list()).toEqual([{ ...intro, durationMinutes: 30 }]);

    expect(eventTypes.delete(intro.id)).toBe(true);
    expect(eventTypes.get(intro.id)).toBeUndefined();
    expect(eventTypes.delete(intro.id)).toBe(false);
  });

  it('хранит записи отдельно от типов встреч и между хранилищами не делится', () => {
    const store = createMemoryStore();
    store.bookings.save({
      id: '22222222-2222-4222-8222-222222222222',
      eventTypeId: intro.id,
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
      startAt: '2026-11-16T11:00:00+05:00',
      endAt: '2026-11-16T11:15:00+05:00',
      createdAt: '2026-11-16T10:00:00+05:00',
      cancelToken: 'token',
    });

    expect(store.bookings.list()).toHaveLength(1);
    expect(store.eventTypes.list()).toEqual([]);
    expect(createMemoryStore().bookings.list()).toEqual([]);
  });
});
