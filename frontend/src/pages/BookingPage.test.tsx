import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { BOOKING_ID, BOOKING_TOKEN, mockGuestBookingApi } from '@/test/bookings.ts';
import { consultation } from '@/test/event-types.ts';
import { server } from '@/test/msw.ts';
import { renderAt } from '@/test/render.tsx';

const PAGE = `/bookings/${BOOKING_ID}?token=${BOOKING_TOKEN}`;

describe('страница записи', () => {
  it('показывает тип встречи, дату, время и имя гостя', async () => {
    mockGuestBookingApi({ eventType: consultation });
    renderAt(PAGE);

    const region = await screen.findByRole('region', { name: 'Ваша запись' });
    expect(await within(region).findByText('Консультация')).toBeInTheDocument();
    expect(region).toHaveTextContent('вт, 17 ноября');
    expect(region).toHaveTextContent('09:00–10:00');
    expect(region).toHaveTextContent('Анна');
  });

  it('неверный токен — запись недоступна, отменить нечего', async () => {
    mockGuestBookingApi({ eventType: consultation });
    renderAt(`/bookings/${BOOKING_ID}?token=wrong`);

    expect(await screen.findByRole('heading', { name: 'Запись недоступна' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Отменить' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
  });

  it('записи нет — «Запись не найдена»', async () => {
    mockGuestBookingApi({ eventType: consultation });
    renderAt(`/bookings/44444444-4444-4444-8444-444444444444?token=${BOOKING_TOKEN}`);

    expect(await screen.findByRole('heading', { name: 'Запись не найдена' })).toBeInTheDocument();
  });

  it('сервер недоступен — сообщение об ошибке загрузки', async () => {
    server.use(http.get('*/api/bookings/:id', () => HttpResponse.error()));
    renderAt(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить запись');
  });
});

describe('отмена гостем', () => {
  it('«Отменить» спрашивает подтверждение; «Не отменять» ничего не отправляет', async () => {
    const user = userEvent.setup();
    const { cancelled } = mockGuestBookingApi({ eventType: consultation });
    renderAt(PAGE);

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));
    expect(screen.getByText('Отменить запись? Время освободится для других.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Не отменять' }));

    expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument();
    expect(cancelled).toEqual([]);
  });

  it('подтверждённая отмена уходит с токеном и показывает «Запись отменена»', async () => {
    const user = userEvent.setup();
    const { cancelled } = mockGuestBookingApi({ eventType: consultation });
    renderAt(PAGE);

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));
    await user.click(screen.getByRole('button', { name: 'Да, отменить' }));

    expect(await screen.findByRole('heading', { name: 'Запись отменена' })).toBeInTheDocument();
    expect(cancelled).toEqual([BOOKING_TOKEN]);
    expect(screen.getByRole('link', { name: 'Записаться снова' })).toHaveAttribute('href', '/book');
  });

  it('встреча уже началась — сообщение, что отменить нельзя', async () => {
    const user = userEvent.setup();
    mockGuestBookingApi({
      eventType: consultation,
      cancelError: { status: 409, code: 'ALREADY_STARTED', message: 'Встреча уже началась' },
    });
    renderAt(PAGE);

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));
    await user.click(screen.getByRole('button', { name: 'Да, отменить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Встреча уже началась — отменить её нельзя',
    );
    expect(screen.queryByRole('button', { name: 'Отменить' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ваша запись' })).toBeInTheDocument();
  });

  it('запись успели отменить — «Запись не найдена»', async () => {
    const user = userEvent.setup();
    mockGuestBookingApi({
      eventType: consultation,
      cancelError: { status: 404, code: 'NOT_FOUND', message: 'Запись не найдена' },
    });
    renderAt(PAGE);

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));
    await user.click(screen.getByRole('button', { name: 'Да, отменить' }));

    expect(await screen.findByRole('heading', { name: 'Запись не найдена' })).toBeInTheDocument();
  });

  it('другая ошибка — просит повторить, кнопка остаётся', async () => {
    const user = userEvent.setup();
    mockGuestBookingApi({
      eventType: consultation,
      cancelError: { status: 500, code: 'INTERNAL_ERROR', message: 'Ошибка' },
    });
    renderAt(PAGE);

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));
    await user.click(screen.getByRole('button', { name: 'Да, отменить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось отменить запись. Попробуйте ещё раз.',
    );
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument();
  });
});
