import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockBookingApi } from '@/test/bookings.ts';
import { intro, mockEventTypesApi } from '@/test/event-types.ts';
import { renderAt } from '@/test/render.tsx';

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

describe('страница бронирования: кнопки шагов «Назад» и «Продолжить»', () => {
  it('«Продолжить» неактивна, пока день не выбран', async () => {
    mockEventTypesApi([intro]);
    mockBookingApi({ slots: SLOTS });
    renderAt(`/book?eventType=${intro.id}`);

    const steps = await screen.findByRole('navigation', { name: 'Шаги записи' });
    expect(within(steps).getByRole('button', { name: 'Назад' })).toBeEnabled();
    expect(within(steps).getByRole('button', { name: 'Продолжить' })).toBeDisabled();
  });

  it('после выбора дня «Продолжить» переводит к выбору времени', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro]);
    mockBookingApi({ slots: SLOTS });
    renderAt(`/book?eventType=${intro.id}`);

    await user.click(await screen.findByRole('button', { name: 'вт, 17 ноября — свободно 1' }));
    const steps = screen.getByRole('navigation', { name: 'Шаги записи' });
    await user.click(within(steps).getByRole('button', { name: 'Продолжить' }));

    expect(screen.getByRole('region', { name: 'Время' })).toHaveFocus();
  });

  it('в форме записи остаётся только «Назад»: дальше ведёт кнопка «Записаться»', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro]);
    mockBookingApi({ slots: SLOTS });
    renderAt(`/book?eventType=${intro.id}&date=2026-11-17`);

    await user.click(await screen.findByRole('button', { name: '09:00' }));

    const steps = screen.getByRole('navigation', { name: 'Шаги записи' });
    expect(within(steps).getByRole('button', { name: 'Назад' })).toBeInTheDocument();
    expect(within(steps).queryByRole('button', { name: 'Продолжить' })).not.toBeInTheDocument();
  });
});
