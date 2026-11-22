// Хранилище в памяти. Интерфейс синхронный: бронирование проверяет пересечение и сохраняет запись
// одной операцией без `await` (docs/spec.md, «Модули бэкенда»). Замена на базу сохраняет интерфейс.

import type { Booking, EventType } from './api/types.gen.ts';

export type { EventType };

// Запись в хранилище — запись из контракта плюс токен отмены, который наружу не отдаётся.
export type StoredBooking = Booking & { cancelToken: string };

// Запись наружу — без токена отмены.
export function publicBooking({ cancelToken: _token, ...booking }: StoredBooking): Booking {
  return booking;
}

export interface Repository<T extends { id: string }> {
  list(): T[];
  get(id: string): T | undefined;
  // Создаёт или заменяет запись с тем же `id`.
  save(item: T): void;
  // Возвращает false, если записи не было.
  delete(id: string): boolean;
}

export type Store = {
  eventTypes: Repository<EventType>;
  bookings: Repository<StoredBooking>;
};

function createMemoryRepository<T extends { id: string }>(): Repository<T> {
  const items = new Map<string, T>();
  return {
    list: () => [...items.values()],
    get: (id) => items.get(id),
    save: (item) => {
      items.set(item.id, item);
    },
    delete: (id) => items.delete(id),
  };
}

export function createMemoryStore(): Store {
  return { eventTypes: createMemoryRepository(), bookings: createMemoryRepository() };
}
