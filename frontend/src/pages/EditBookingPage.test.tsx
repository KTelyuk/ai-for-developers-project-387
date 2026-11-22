import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Slot } from '@/api';
import { BOOKING_ID, BOOKING_TOKEN, mockBookingApi, mockGuestBookingApi } from '@/test/bookings.ts';
import { consultation, intro, mockEventTypesApi } from '@/test/event-types.ts';
import { renderAt } from '@/test/render.tsx';

// «Сейчас» — понедельник 16 ноября 2026, 10:00 по Алматы; запись — Консультация во вторник 09:00.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-16T10:00:00+05:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

function slot(date: string, start: string, end: string): Slot {
  return { startAt: `${date}T${start}:00+05:00`, endAt: `${date}T${end}:00+05:00` };
}

const PAGE = `/bookings/${BOOKING_ID}?token=${BOOKING_TOKEN}`;
const EDIT = `/bookings/${BOOKING_ID}/edit?token=${BOOKING_TOKEN}&eventType=${consultation.id}&date=2026-11-17`;

type User = ReturnType<typeof userEvent.setup>;

// Запись, типы встреч и свободное время 17 и 18 ноября.
function mockApi(options: Partial<Parameters<typeof mockGuestBookingApi>[0]> = {}) {
  mockEventTypesApi([intro, consultation]);
  mockBookingApi({
    slots: {
      '2026-11-17': [slot('2026-11-17', '11:00', '12:00')],
      '2026-11-18': [slot('2026-11-18', '10:00', '10:15')],
    },
  });
  return mockGuestBookingApi({
    eventType: consultation,
    eventTypes: [intro, consultation],
    ...options,
  });
}

async function chooseTime(user: User, time: string) {
  const list = await screen.findByRole('list', { name: 'Свободное время' });
  await user.click(within(list).getByRole('button', { name: time }));
}

describe('изменение записи гостем', () => {
  it('«Изменить» ведёт к шагам с выбранными типом и днём', async () => {
    const user = userEvent.setup();
    mockApi();
    renderAt(PAGE);

    await user.click(await screen.findByRole('link', { name: 'Изменить' }));

    expect(await screen.findByRole('heading', { name: 'Изменение записи' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Консультация' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Свободное время' })).toHaveTextContent('11:00');
    expect(screen.getByRole('link', { name: 'Вернуться к записи без изменений' })).toHaveAttribute(
      'href',
      PAGE,
    );
  });

  it('новое время и имя: форма с прежними данными, после сохранения — страница записи', async () => {
    const user = userEvent.setup();
    const { updated } = mockApi();
    renderAt(EDIT);
    await chooseTime(user, '11:00');

    expect(screen.getByLabelText('Имя')).toHaveValue('Анна');
    expect(screen.getByLabelText('Email')).toHaveValue('anna@example.com');
    await user.clear(screen.getByLabelText('Имя'));
    await user.type(screen.getByLabelText('Имя'), 'Анна Петрова');
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    const region = await screen.findByRole('region', { name: 'Ваша запись' });
    expect(within(region).getByRole('status')).toHaveTextContent('Запись изменена');
    expect(region).toHaveTextContent('11:00–12:00');
    expect(region).toHaveTextContent('Анна Петрова');
    expect(updated).toEqual([
      {
        eventTypeId: consultation.id,
        startAt: '2026-11-17T11:00:00+05:00',
        guestName: 'Анна Петрова',
        guestEmail: 'anna@example.com',
      },
    ]);
  });

  it('другой тип встречи: «Назад» сохраняет токен, запись уходит с новым типом', async () => {
    const user = userEvent.setup();
    const { updated } = mockApi();
    renderAt(EDIT);

    await user.click(await screen.findByRole('button', { name: 'Назад' }));
    await user.click(await screen.findByRole('button', { name: /Знакомство/ }));
    await user.click(await screen.findByRole('button', { name: /18 ноября — свободно 1/ }));
    await chooseTime(user, '10:00');
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    const region = await screen.findByRole('region', { name: 'Ваша запись' });
    expect(await within(region).findByText('Знакомство')).toBeInTheDocument();
    expect(region).toHaveTextContent('10:00–10:15');
    expect(updated).toEqual([
      expect.objectContaining({ eventTypeId: intro.id, startAt: '2026-11-18T10:00:00+05:00' }),
    ]);
  });

  it('время уже заняли — сообщение и слоты, данные гостя сохранены', async () => {
    const user = userEvent.setup();
    mockApi({ updateError: { status: 409, code: 'SLOT_TAKEN', message: 'Это время уже занято' } });
    renderAt(EDIT);
    await chooseTime(user, '11:00');
    await user.clear(screen.getByLabelText('Имя'));
    await user.type(screen.getByLabelText('Имя'), 'Анна П.');
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Это время уже заняли');
    await chooseTime(user, '11:00');
    expect(screen.getByLabelText('Имя')).toHaveValue('Анна П.');
  });

  it('встреча началась, пока гость выбирал — сообщение в форме', async () => {
    const user = userEvent.setup();
    mockApi({
      updateError: { status: 409, code: 'ALREADY_STARTED', message: 'Встреча уже началась' },
    });
    renderAt(EDIT);
    await chooseTime(user, '11:00');
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Встреча уже началась — изменить её нельзя.',
    );
  });

  it('встреча уже началась — изменить нельзя, шагов нет', async () => {
    vi.setSystemTime(new Date('2026-11-17T09:00:00+05:00'));
    mockApi();
    renderAt(EDIT);

    expect(
      await screen.findByRole('heading', { name: 'Изменить запись нельзя' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Свободное время' })).not.toBeInTheDocument();
  });

  it('неверный токен — запись недоступна', async () => {
    mockApi();
    renderAt(`/bookings/${BOOKING_ID}/edit?token=wrong`);

    expect(await screen.findByRole('heading', { name: 'Запись недоступна' })).toBeInTheDocument();
  });

  it('записи нет — «Запись не найдена»', async () => {
    mockApi();
    renderAt(`/bookings/44444444-4444-4444-8444-444444444444/edit?token=${BOOKING_TOKEN}`);

    expect(await screen.findByRole('heading', { name: 'Запись не найдена' })).toBeInTheDocument();
  });
});
