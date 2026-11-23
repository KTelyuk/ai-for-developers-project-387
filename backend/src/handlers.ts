import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AdminBooking,
  Booking,
  BookingCreated,
  CreateBooking,
  CreateEventType,
  DayAvailability,
  EventType,
  HealthStatus,
  Slot,
  UpdateEventType,
} from './api/types.gen.ts';
import type { Clock } from './clock.ts';
import { ApiError } from './errors.ts';
import {
  cancelGuestBooking,
  findChangeableGuestBooking,
  findGuestBooking,
} from './guest-bookings.ts';
import { cancelOwnerBooking } from './owner-bookings.ts';
import { isIntervalFree } from './overlap.ts';
import { daySlots, formatOwnerTime, isInWindow, rangeDates, slotStartingAt } from './schedule.ts';
import { publicBooking, type Store, type StoredBooking } from './store.ts';

// Ссылка на страницу записи — путь от корня сайта с идентификатором и токеном отмены.
function bookingLink(id: string, token: string): string {
  return `/bookings/${id}?token=${encodeURIComponent(token)}`;
}

// Часы и хранилище, которые обработчики получают из buildApp (в тестах — подменённые).
export type HandlerDependencies = { clock: Clock; store: Store };

// Контракт проверяет длину как есть; название из одних пробелов тоже считается пустым.
function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed === '') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Название не может быть пустым');
  }
  return trimmed;
}

const GUEST_NAME_MAX_LENGTH = 100;

// Длина имени проверяется после обрезки, поэтому контракт её не ограничивает (CreateBooking).
function normalizeGuestName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Имя не может быть пустым');
  }
  if (trimmed.length > GUEST_NAME_MAX_LENGTH) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Имя не длиннее 100 символов');
  }
  return trimmed;
}

const SUBJECT_MAX_LENGTH = 500;

// Предмет разговора необязателен: пустой после обрезки равен отсутствию.
// Длина — после обрезки и в символах (code points), а не в единицах UTF-16: эмодзи считается за один.
function normalizeSubject(subject: string | undefined): string | undefined {
  const trimmed = subject?.trim();
  if (trimmed === undefined || trimmed === '') return undefined;
  if ([...trimmed].length > SUBJECT_MAX_LENGTH) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Предмет разговора не длиннее 500 символов');
  }
  return trimmed;
}

// Обработчики по operationId из openapi/openapi.yaml. Зависимости приходят из buildApp.
// Форму тела, длины полей и список длительностей уже проверил fastify-openapi-glue по контракту.
export function createHandlers({ clock, store }: HandlerDependencies) {
  function findEventType(id: string): EventType {
    const eventType = store.eventTypes.get(id);
    if (!eventType) throw new ApiError(404, 'NOT_FOUND', 'Тип встречи не найден');
    return eventType;
  }

  // Время брони: `startAt` — слот этого типа встречи и не пересекается с записями `others`.
  // Вызывается внутри той же синхронной операции, что и сохранение.
  function reserveSlot(body: CreateBooking, now: Date, others: readonly StoredBooking[]) {
    const { durationMinutes } = findEventType(body.eventTypeId);
    const slot = slotStartingAt({ startAt: body.startAt, durationMinutes, now });
    if (!slot) {
      throw new ApiError(400, 'SLOT_UNAVAILABLE', 'Это время нельзя забронировать');
    }
    if (!isIntervalFree(slot, others)) {
      throw new ApiError(409, 'SLOT_TAKEN', 'Это время уже занято');
    }
    return slot;
  }

  return {
    getHealth(): HealthStatus {
      return { status: 'ok' };
    },

    listEventTypes(): EventType[] {
      return store.eventTypes.list();
    },

    getEventType(request: FastifyRequest<{ Params: { id: string } }>): EventType {
      return findEventType(request.params.id);
    },

    listSlots(
      request: FastifyRequest<{ Params: { id: string }; Querystring: { date: string } }>,
    ): Slot[] {
      const { durationMinutes } = findEventType(request.params.id);
      const { date } = request.query;
      const now = clock();
      // Формат даты проверил контракт; здесь — что день существует и попадает в окно записи.
      if (!isInWindow(date, now)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'День вне окна записи');
      }
      return daySlots({ date, durationMinutes, bookings: store.bookings.list(), now });
    },

    listAvailability(
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { from: string; to: string };
      }>,
    ): DayAvailability[] {
      const { durationMinutes } = findEventType(request.params.id);
      const dates = rangeDates(request.query.from, request.query.to);
      if (!dates) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Неверный диапазон дней');
      }
      const now = clock();
      const bookings = store.bookings.list();
      // Тот же расчёт, что и у слотов дня: счётчик всегда совпадает с их числом.
      return dates.map((date) => ({
        date,
        freeSlots: daySlots({ date, durationMinutes, bookings, now }).length,
      }));
    },

    // Проверка слота, пересечения и сохранение — одна синхронная операция без `await`:
    // между проверкой и записью другой запрос не вклинится, и одно время не займут дважды.
    createBooking(
      request: FastifyRequest<{ Body: CreateBooking }>,
      reply: FastifyReply,
    ): BookingCreated {
      const { eventTypeId, guestEmail } = request.body;
      const guestName = normalizeGuestName(request.body.guestName);
      const subject = normalizeSubject(request.body.subject);
      const now = clock();
      const slot = reserveSlot(request.body, now, store.bookings.list());
      // endAt берётся из длительности на момент брони: смена длительности типа его не меняет.
      const record: StoredBooking = {
        id: randomUUID(),
        eventTypeId,
        guestName,
        guestEmail,
        ...(subject === undefined ? {} : { subject }),
        startAt: slot.startAt,
        endAt: slot.endAt,
        createdAt: formatOwnerTime(now.getTime()),
        cancelToken: randomBytes(32).toString('base64url'),
      };
      store.bookings.save(record);
      reply.code(201);
      return {
        booking: publicBooking(record),
        token: record.cancelToken,
        link: bookingLink(record.id, record.cancelToken),
      };
    },

    getBooking(
      request: FastifyRequest<{ Params: { id: string }; Querystring: { token: string } }>,
    ): Booking {
      return publicBooking(findGuestBooking(store, request.params.id, request.query.token));
    },

    // Изменение гостем — замена записи целиком теми же проверками, что у брони, одной синхронной
    // операцией. Сама запись время не занимает: её можно сдвинуть внутрь прежнего интервала.
    updateBooking(
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { token: string };
        Body: CreateBooking;
      }>,
    ): Booking {
      const { id } = request.params;
      const now = clock();
      const current = findChangeableGuestBooking(
        store,
        id,
        request.query.token,
        now,
        'Встреча уже началась, изменить её нельзя',
      );
      const guestName = normalizeGuestName(request.body.guestName);
      const subject = normalizeSubject(request.body.subject);
      const others = store.bookings.list().filter((booking) => booking.id !== id);
      const slot = reserveSlot(request.body, now, others);
      // Замена целиком: предмет, не переданный в теле, очищается, а не остаётся прежним.
      const { subject: _previous, ...rest } = current;
      const record: StoredBooking = {
        ...rest,
        eventTypeId: request.body.eventTypeId,
        guestName,
        guestEmail: request.body.guestEmail,
        ...(subject === undefined ? {} : { subject }),
        startAt: slot.startAt,
        endAt: slot.endAt,
      };
      store.bookings.save(record);
      return publicBooking(record);
    },

    cancelBooking(
      request: FastifyRequest<{ Params: { id: string }; Querystring: { token: string } }>,
      reply: FastifyReply,
    ): void {
      cancelGuestBooking(store, request.params.id, request.query.token, clock());
      reply.code(204).send();
    },

    // Встреча не закончилась, пока «сейчас» раньше её конца: идущая сейчас тоже в списке.
    listAdminBookings(): AdminBooking[] {
      const now = clock().getTime();
      return store.bookings
        .list()
        .filter((booking) => Date.parse(booking.endAt) > now)
        .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
        .map((booking) => ({
          ...publicBooking(booking),
          eventTypeTitle: store.eventTypes.get(booking.eventTypeId)?.title ?? '',
        }));
    },

    cancelBookingByOwner(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ): void {
      cancelOwnerBooking(store, request.params.id);
      reply.code(204).send();
    },

    createEventType(
      request: FastifyRequest<{ Body: CreateEventType }>,
      reply: FastifyReply,
    ): EventType {
      const { title, description = '', durationMinutes } = request.body;
      const eventType: EventType = {
        id: randomUUID(),
        title: normalizeTitle(title),
        description,
        durationMinutes,
      };
      store.eventTypes.save(eventType);
      reply.code(201);
      return eventType;
    },

    // Частичное изменение: неуказанные поля остаются прежними.
    // Созданные записи хранят свой endAt, поэтому новая длительность их не трогает.
    updateEventType(
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateEventType }>,
    ): EventType {
      const current = findEventType(request.params.id);
      const { title, description, durationMinutes } = request.body;
      const eventType: EventType = {
        ...current,
        ...(title === undefined ? {} : { title: normalizeTitle(title) }),
        ...(description === undefined ? {} : { description }),
        ...(durationMinutes === undefined ? {} : { durationMinutes }),
      };
      store.eventTypes.save(eventType);
      return eventType;
    },
  };
}
