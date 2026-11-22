import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Slot } from '@/api';
import { BOOKING_ID, BOOKING_TOKEN, mockBookingApi } from '@/test/bookings.ts';
import { consultation, mockEventTypesApi } from '@/test/event-types.ts';
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
const LINK = `${window.location.origin}/bookings/${BOOKING_ID}?token=${BOOKING_TOKEN}`;

async function chooseTime(user: ReturnType<typeof userEvent.setup>, time: string) {
  const list = await screen.findByRole('list', { name: 'Свободное время' });
  await user.click(within(list).getByRole('button', { name: time }));
}

describe('страница бронирования: запись', () => {
  it('выбор времени открывает форму с выбранным временем', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    mockBookingApi({ slots: { '2026-11-17': [slot('09:00', '10:00')] } });
    renderAt(DAY);

    await chooseTime(user, '09:00');

    const form = screen.getByRole('form', { name: 'Ваши данные' });
    expect(form).toHaveTextContent('09:00–10:00');
    expect(within(form).getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(within(form).getByLabelText('Email')).toHaveAttribute('inputmode', 'email');
  });

  it('пустое имя и неверный email — ошибки под полями, запрос не уходит', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    const { created } = mockBookingApi({ slots: { '2026-11-17': [slot('09:00', '10:00')] } });
    renderAt(DAY);
    await chooseTime(user, '09:00');

    await user.type(screen.getByLabelText('Имя'), '   ');
    await user.type(screen.getByLabelText('Email'), 'anna.example.com');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(screen.getByLabelText('Имя')).toHaveAccessibleDescription('Введите имя');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Введите email в формате name@example.com',
    );
    expect(created).toEqual([]);
  });

  it('запись: отправляет данные и показывает подтверждение со ссылкой', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    const { created } = mockBookingApi({
      slots: { '2026-11-17': [slot('09:00', '10:00'), slot('10:00', '11:00')] },
    });
    renderAt(DAY);
    await chooseTime(user, '09:00');

    await user.type(screen.getByLabelText('Имя'), '  Анна ');
    await user.type(screen.getByLabelText('Email'), 'anna@example.com');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    const confirmation = await screen.findByRole('region', { name: 'Вы записаны' });
    expect(created).toEqual([
      {
        eventTypeId: consultation.id,
        startAt: '2026-11-17T09:00:00+05:00',
        guestName: 'Анна',
        guestEmail: 'anna@example.com',
      },
    ]);
    expect(confirmation).toHaveTextContent('Консультация');
    expect(confirmation).toHaveTextContent('вт, 17 ноября');
    expect(confirmation).toHaveTextContent('09:00–10:00');
    expect(within(confirmation).getByRole('textbox', { name: 'Ссылка на запись' })).toHaveValue(
      LINK,
    );
    expect(confirmation).toHaveTextContent('Сохраните ссылку — без неё запись не отменить');
  });

  it('«Скопировать» кладёт ссылку в буфер обмена', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    mockBookingApi({ slots: { '2026-11-17': [slot('09:00', '10:00')] } });
    renderAt(DAY);
    await chooseTime(user, '09:00');
    await user.type(screen.getByLabelText('Имя'), 'Анна');
    await user.type(screen.getByLabelText('Email'), 'anna@example.com');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    await user.click(await screen.findByRole('button', { name: 'Скопировать' }));

    expect(await navigator.clipboard.readText()).toBe(LINK);
    expect(screen.getByRole('status')).toHaveTextContent('Ссылка скопирована');
  });

  it('время уже заняли — сообщение, и форма возвращает к обновлённым слотам', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    const { slotRequests } = mockBookingApi({
      slots: { '2026-11-17': [slot('09:00', '10:00')] },
      reject: { status: 409, code: 'SLOT_TAKEN', message: 'Это время уже занято' },
    });
    renderAt(DAY);
    await chooseTime(user, '09:00');
    await user.type(screen.getByLabelText('Имя'), 'Анна');
    await user.type(screen.getByLabelText('Email'), 'anna@example.com');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Это время уже заняли. Выберите другое.',
    );
    expect(await screen.findByRole('list', { name: 'Свободное время' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Ваши данные' })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(slotRequests).toEqual(['2026-11-17', '2026-11-17']));
  });

  it('«Другое время» возвращает к списку слотов', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    mockBookingApi({ slots: { '2026-11-17': [slot('09:00', '10:00')] } });
    renderAt(DAY);
    await chooseTime(user, '09:00');

    await user.click(screen.getByRole('button', { name: 'Другое время' }));

    expect(await screen.findByRole('list', { name: 'Свободное время' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Ваши данные' })).not.toBeInTheDocument();
  });

  it('после «Другое время» форма для нового времени открывается с введёнными данными', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    const { created } = mockBookingApi({
      slots: { '2026-11-17': [slot('09:00', '10:00'), slot('10:00', '11:00')] },
    });
    renderAt(DAY);
    await chooseTime(user, '09:00');
    await user.type(screen.getByLabelText('Имя'), 'Анна');
    await user.type(screen.getByLabelText('Email'), 'anna@example.com');

    await user.click(screen.getByRole('button', { name: 'Другое время' }));
    await chooseTime(user, '10:00');

    expect(screen.getByLabelText('Имя')).toHaveValue('Анна');
    expect(screen.getByLabelText('Email')).toHaveValue('anna@example.com');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));
    await screen.findByRole('region', { name: 'Вы записаны' });
    expect(created).toEqual([
      {
        eventTypeId: consultation.id,
        startAt: '2026-11-17T10:00:00+05:00',
        guestName: 'Анна',
        guestEmail: 'anna@example.com',
      },
    ]);
  });
});
