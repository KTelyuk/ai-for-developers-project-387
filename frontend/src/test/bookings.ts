import { http, HttpResponse } from 'msw/http';
import type { Booking, BookingCreated, CreateBooking, EventType, Slot } from '@/api';
import { mockAvailabilityApi } from '@/test/availability.ts';
import { server } from '@/test/msw.ts';

export const BOOKING_ID = '33333333-3333-4333-8333-333333333333';
export const BOOKING_TOKEN = 'secret-token_123';

// Слоты и бронирование в памяти теста: забронированное время пропадает из слотов.
// `reject` подменяет ответ на бронь ошибкой, чтобы проверить сообщения сервера.
// Возвращает тела броней и запрошенные даты слотов, чтобы тест видел, что ушло на сервер.
export function mockBookingApi({
  slots,
  reject,
}: {
  slots: Record<string, Slot[]>;
  reject?: { status: number; code: string; message: string };
}) {
  const free = Object.fromEntries(Object.entries(slots).map(([date, list]) => [date, [...list]]));
  const created: CreateBooking[] = [];
  const slotRequests: string[] = [];
  // Счётчики календаря считаются по тем же свободным слотам и обновляются после брони.
  mockAvailabilityApi(() =>
    Object.fromEntries(Object.entries(free).map(([date, list]) => [date, list.length])),
  );
  server.use(
    http.get('*/api/event-types/:id/slots', ({ request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? '';
      slotRequests.push(date);
      return HttpResponse.json(free[date] ?? []);
    }),
    http.post('*/api/bookings', async ({ request }) => {
      const body = (await request.json()) as CreateBooking;
      created.push(body);
      if (reject) {
        return HttpResponse.json(
          { code: reject.code, message: reject.message },
          { status: reject.status },
        );
      }
      const date = body.startAt.slice(0, 10);
      const slot = free[date]?.find((item) => item.startAt === body.startAt);
      free[date] = (free[date] ?? []).filter((item) => item !== slot);
      const response: BookingCreated = {
        booking: {
          id: BOOKING_ID,
          eventTypeId: body.eventTypeId,
          guestName: body.guestName,
          guestEmail: body.guestEmail,
          startAt: body.startAt,
          endAt: slot?.endAt ?? body.startAt,
          createdAt: '2026-11-16T10:00:00+05:00',
        },
        token: BOOKING_TOKEN,
        link: `/bookings/${BOOKING_ID}?token=${BOOKING_TOKEN}`,
      };
      return HttpResponse.json(response, { status: 201 });
    }),
  );
  return { created, slotRequests };
}

export const guestBooking: Booking = {
  id: BOOKING_ID,
  eventTypeId: '22222222-2222-4222-8222-222222222222',
  guestName: 'Анна',
  guestEmail: 'anna@example.com',
  startAt: '2026-11-17T09:00:00+05:00',
  endAt: '2026-11-17T10:00:00+05:00',
  createdAt: '2026-11-16T10:00:00+05:00',
};

type ErrorReply = { status: number; code: string; message: string };

function errorReply({ status, code, message }: ErrorReply) {
  return HttpResponse.json({ code, message }, { status });
}

// Страница записи в памяти теста: одна запись `guestBooking` с токеном `BOOKING_TOKEN`
// и её тип встречи. Чужой токен — 403, после отмены запись не найти — 404.
// Изменение заменяет запись телом запроса; `endAt` — по длительности типа из `eventTypes`.
// `cancelError` и `updateError` подменяют ответы ошибкой.
// Возвращает токены отмен и тела изменений, ушедших на сервер.
export function mockGuestBookingApi({
  eventType,
  eventTypes = [eventType],
  cancelError,
  updateError,
}: {
  eventType: EventType;
  eventTypes?: EventType[];
  cancelError?: ErrorReply;
  updateError?: ErrorReply;
}) {
  let exists = true;
  let current = guestBooking;
  const cancelled: string[] = [];
  const updated: CreateBooking[] = [];
  function denied(id: unknown, request: Request) {
    const token = new URL(request.url).searchParams.get('token');
    if (!exists || id !== BOOKING_ID) {
      return errorReply({ status: 404, code: 'NOT_FOUND', message: 'Запись не найдена' });
    }
    if (token !== BOOKING_TOKEN) {
      return errorReply({ status: 403, code: 'INVALID_TOKEN', message: 'Неверная ссылка' });
    }
    return undefined;
  }
  server.use(
    http.get('*/api/event-types/:id', ({ params }) => {
      const found = eventTypes.find((item) => item.id === params.id);
      return found
        ? HttpResponse.json(found)
        : errorReply({ status: 404, code: 'NOT_FOUND', message: 'Тип встречи не найден' });
    }),
    http.get(
      '*/api/bookings/:id',
      ({ params, request }) => denied(params.id, request) ?? HttpResponse.json(current),
    ),
    http.put('*/api/bookings/:id', async ({ params, request }) => {
      const body = (await request.json()) as CreateBooking;
      updated.push(body);
      const reply = denied(params.id, request);
      if (reply) return reply;
      if (updateError) return errorReply(updateError);
      const minutes = eventTypes.find((item) => item.id === body.eventTypeId)?.durationMinutes ?? 0;
      const endAt = new Date(Date.parse(body.startAt) + minutes * 60_000);
      current = {
        ...current,
        ...body,
        // Ответ в часовом поясе Алматы, как у сервера.
        endAt: `${new Date(endAt.getTime() + 5 * 3_600_000).toISOString().slice(0, 19)}+05:00`,
      };
      return HttpResponse.json(current);
    }),
    http.delete('*/api/bookings/:id', ({ params, request }) => {
      cancelled.push(new URL(request.url).searchParams.get('token') ?? '');
      const reply = denied(params.id, request);
      if (reply) return reply;
      if (cancelError) return errorReply(cancelError);
      exists = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { cancelled, updated };
}
