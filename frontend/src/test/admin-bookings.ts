import { http, HttpResponse } from 'msw/http';
import type { AdminBooking } from '@/api';
import { server } from '@/test/msw.ts';

export const anna: AdminBooking = {
  id: '44444444-4444-4444-8444-444444444441',
  eventTypeId: '22222222-2222-4222-8222-222222222222',
  eventTypeTitle: 'Консультация',
  guestName: 'Анна',
  guestEmail: 'anna@example.com',
  startAt: '2026-11-16T09:30:00+05:00',
  endAt: '2026-11-16T10:30:00+05:00',
  createdAt: '2026-11-15T12:00:00+05:00',
};

export const boris: AdminBooking = {
  id: '44444444-4444-4444-8444-444444444442',
  eventTypeId: '11111111-1111-4111-8111-111111111111',
  eventTypeTitle: 'Знакомство',
  guestName: 'Борис',
  guestEmail: 'boris@example.com',
  startAt: '2026-11-17T14:00:00+05:00',
  endAt: '2026-11-17T14:15:00+05:00',
  createdAt: '2026-11-15T12:00:00+05:00',
};

// Встречи владельца в памяти теста: отменённая пропадает из списка.
// `missing` — записи, которые сервер уже не знает (отменены в другом окне): DELETE даёт 404
// и они сразу пропадают из списка. Возвращает id, ушедшие на отмену.
export function mockAdminBookingsApi(
  initial: AdminBooking[],
  { missing = [] }: { missing?: string[] } = {},
) {
  let bookings = [...initial];
  const deleted: string[] = [];
  server.use(
    http.get('*/api/admin/bookings', () => HttpResponse.json(bookings)),
    http.delete('*/api/admin/bookings/:id', ({ params }) => {
      const id = String(params.id);
      const exists = bookings.some((item) => item.id === id) && !missing.includes(id);
      bookings = bookings.filter((item) => item.id !== id);
      if (!exists) {
        return HttpResponse.json(
          { code: 'NOT_FOUND', message: 'Запись не найдена' },
          { status: 404 },
        );
      }
      deleted.push(id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { deleted };
}
