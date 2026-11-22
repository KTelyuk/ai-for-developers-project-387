import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay } from 'msw';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anna, mockAdminBookingsApi } from '@/test/admin-bookings.ts';
import { BOOKING_ID, BOOKING_TOKEN, mockBookingApi, mockGuestBookingApi } from '@/test/bookings.ts';
import { consultation, intro, mockEventTypesApi } from '@/test/event-types.ts';
import { server } from '@/test/msw.ts';
import { renderAt } from '@/test/render.tsx';

// Первый ответ на запрос — ошибка сервера, следующие уходят в обработчики теста.
function failOnce(path: string) {
  server.use(http.get(path, () => HttpResponse.json({}, { status: 500 }), { once: true }));
}

// Запрос не отвечает: экран остаётся в состоянии загрузки.
function hang(path: string) {
  server.use(
    http.get(path, async () => {
      await delay('infinite');
      return HttpResponse.json([]);
    }),
  );
}

// «Сейчас» — понедельник 16 ноября 2026, 10:00 по Алматы; таймеры настоящие, подменена только дата.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-16T10:00:00+05:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

const SLOTS = {
  '2026-11-17': [{ startAt: '2026-11-17T09:00:00+05:00', endAt: '2026-11-17T09:15:00+05:00' }],
};

describe('состояния экранов: загрузка и повтор после ошибки сети', () => {
  it('бронирование: типы встреч грузятся, после ошибки «Повторить» загружает их снова', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro, consultation]);
    failOnce('*/api/event-types');
    renderAt('/book');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить типы встреч');
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('list', { name: 'Типы встреч' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('бронирование: пока типы встреч грузятся, видна загрузка', async () => {
    hang('*/api/event-types');
    renderAt('/book');

    expect(await screen.findByRole('status')).toHaveTextContent('Загружаем типы встреч');
  });

  it('календарь: после ошибки «Повторить» загружает счётчики дней снова', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro]);
    mockBookingApi({ slots: SLOTS });
    failOnce('*/api/event-types/:id/availability');
    renderAt(`/book?eventType=${intro.id}`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить календарь');
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('button', { name: 'вт, 17 ноября — свободно 1' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('календарь: пока счётчики грузятся, видна загрузка', async () => {
    mockEventTypesApi([intro]);
    hang('*/api/event-types/:id/availability');
    renderAt(`/book?eventType=${intro.id}`);

    const calendar = await screen.findByRole('region', { name: 'Выберите день' });
    expect(await within(calendar).findByRole('status')).toHaveTextContent('Загружаем дни');
  });

  it('слоты: после ошибки «Повторить» загружает время снова', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro]);
    mockBookingApi({ slots: SLOTS });
    failOnce('*/api/event-types/:id/slots');
    renderAt(`/book?eventType=${intro.id}&date=2026-11-17`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить время');
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));

    const slots = await screen.findByRole('list', { name: 'Свободное время' });
    expect(within(slots).getByRole('button', { name: '09:00' })).toBeInTheDocument();
  });

  it('слоты: пока время грузится, видна загрузка', async () => {
    mockEventTypesApi([intro]);
    mockBookingApi({ slots: SLOTS });
    hang('*/api/event-types/:id/slots');
    renderAt(`/book?eventType=${intro.id}&date=2026-11-17`);

    const time = await screen.findByRole('region', { name: 'Время' });
    expect(await within(time).findByRole('status')).toHaveTextContent('Загружаем время');
  });

  it('типы встреч владельца: после ошибки «Повторить» загружает список снова', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro]);
    failOnce('*/api/event-types');
    renderAt('/admin/event-types');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить типы встреч');
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));

    const list = await screen.findByRole('list', { name: 'Типы встреч' });
    expect(list).toHaveTextContent('Знакомство');
  });

  it('типы встреч владельца: пока список грузится, видна загрузка', async () => {
    hang('*/api/event-types');
    renderAt('/admin/event-types');

    expect(await screen.findByRole('status')).toHaveTextContent('Загружаем');
  });

  it('встречи владельца: после ошибки «Повторить» загружает список снова', async () => {
    const user = userEvent.setup();
    mockAdminBookingsApi([anna]);
    failOnce('*/api/admin/bookings');
    renderAt('/admin/bookings');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить встречи');
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));

    const list = await screen.findByRole('list', { name: 'Встречи' });
    expect(list).toHaveTextContent('Анна');
  });

  it('встречи владельца: пока список грузится, видна загрузка', async () => {
    hang('*/api/admin/bookings');
    renderAt('/admin/bookings');

    expect(await screen.findByText('Загружаем…')).toHaveAttribute('role', 'status');
  });

  it('запись гостя: после ошибки «Повторить» загружает запись снова', async () => {
    const user = userEvent.setup();
    mockGuestBookingApi({ eventType: consultation });
    failOnce('*/api/bookings/:id');
    renderAt(`/bookings/${BOOKING_ID}?token=${BOOKING_TOKEN}`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить запись');
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('region', { name: 'Ваша запись' })).toBeInTheDocument();
  });

  it('запись гостя: пока запись грузится, видна загрузка', async () => {
    hang('*/api/bookings/:id');
    renderAt(`/bookings/${BOOKING_ID}?token=${BOOKING_TOKEN}`);

    expect(await screen.findByRole('status')).toHaveTextContent('Загрузка');
  });
});
