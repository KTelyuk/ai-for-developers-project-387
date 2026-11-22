import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateBooking, Slot } from '@/api';
import { mockAvailabilityApi } from '@/test/availability.ts';
import { consultation, mockEventTypesApi } from '@/test/event-types.ts';
import { server } from '@/test/msw.ts';
import { renderAt } from '@/test/render.tsx';

// «Сейчас» — понедельник 16 ноября 2026, 10:00 по Алматы. Таймеры настоящие, подменена только дата.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-16T10:00:00+05:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

function slot(start: string, end: string): Slot {
  return { startAt: `2026-11-17T${start}:00+05:00`, endAt: `2026-11-17T${end}:00+05:00` };
}

const DAY = `/book?eventType=${consultation.id}&date=2026-11-17`;

// Другой гость успевает занять время первой брони: сервер убирает его из слотов и счётчиков
// и отвечает 409.
function mockRaceLostApi(slots: Slot[]) {
  let free = [...slots];
  const created: CreateBooking[] = [];
  mockAvailabilityApi(() => ({ '2026-11-17': free.length }));
  server.use(
    http.get('*/api/event-types/:id/slots', () => HttpResponse.json(free)),
    http.post('*/api/bookings', async ({ request }) => {
      const body = (await request.json()) as CreateBooking;
      created.push(body);
      if (created.length === 1) {
        free = free.filter((item) => item.startAt !== body.startAt);
        return HttpResponse.json(
          { code: 'SLOT_TAKEN', message: 'Это время уже занято' },
          { status: 409 },
        );
      }
      return HttpResponse.json(
        {
          booking: {
            id: '33333333-3333-4333-8333-333333333333',
            createdAt: '2026-11-16T10:00:00+05:00',
            endAt: body.startAt,
            ...body,
          },
          token: 'secret',
          link: '/bookings/33333333-3333-4333-8333-333333333333?token=secret',
        },
        { status: 201 },
      );
    }),
  );
  return { created };
}

async function chooseTime(user: ReturnType<typeof userEvent.setup>, time: string) {
  const list = await screen.findByRole('list', { name: 'Свободное время' });
  await user.click(within(list).getByRole('button', { name: time }));
}

describe('страница бронирования: время успели занять', () => {
  it('занятое время пропадает из слотов и счётчика, имя и email сохраняются для другого времени', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    const { created } = mockRaceLostApi([slot('09:00', '10:00'), slot('10:00', '11:00')]);
    renderAt(DAY);
    await chooseTime(user, '09:00');
    await user.type(screen.getByLabelText('Имя'), 'Анна');
    await user.type(screen.getByLabelText('Email'), 'anna@example.com');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Это время уже заняли. Выберите другое.',
    );
    const list = await screen.findByRole('list', { name: 'Свободное время' });
    await vi.waitFor(() =>
      expect(within(list).queryByRole('button', { name: '09:00' })).not.toBeInTheDocument(),
    );

    expect(
      await screen.findByRole('button', { name: /17 ноября — свободно 1/ }),
    ).toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: '10:00' }));
    expect(screen.getByLabelText('Имя')).toHaveValue('Анна');
    expect(screen.getByLabelText('Email')).toHaveValue('anna@example.com');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(await screen.findByRole('region', { name: 'Вы записаны' })).toBeInTheDocument();
    expect(created.map((body) => body.startAt)).toEqual([
      '2026-11-17T09:00:00+05:00',
      '2026-11-17T10:00:00+05:00',
    ]);
    expect(created[1]).toMatchObject({ guestName: 'Анна', guestEmail: 'anna@example.com' });
  });
});
