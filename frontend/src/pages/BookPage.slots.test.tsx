import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Slot } from '@/api';
import { mockAvailabilityApi } from '@/test/availability.ts';
import { consultation, intro, mockEventTypesApi } from '@/test/event-types.ts';
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

// Слоты по дням; запрошенные даты — чтобы тест видел, что ушло на сервер.
// Счётчики календаря совпадают с числом слотов дня.
function mockSlotsApi(byDate: Record<string, Slot[]>) {
  mockAvailabilityApi(
    Object.fromEntries(Object.entries(byDate).map(([date, slots]) => [date, slots.length])),
  );
  const requested: string[] = [];
  server.use(
    http.get('*/api/event-types/:id/slots', ({ request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? '';
      requested.push(date);
      return HttpResponse.json(byDate[date] ?? []);
    }),
  );
  return { requested };
}

describe('страница бронирования: слоты дня', () => {
  it('показывает свободное время дня по Алматы с подписью часового пояса', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro, consultation]);
    const { requested } = mockSlotsApi({
      '2026-11-17': [slot('09:00', '10:00'), slot('14:00', '15:00')],
    });
    renderAt(`/book?eventType=${consultation.id}`);

    await user.click(await screen.findByRole('button', { name: /17 ноября/ }));

    const list = await screen.findByRole('list', { name: 'Свободное время' });
    const times = within(list).getAllByRole('button');
    expect(times.map((button) => button.textContent)).toEqual(['09:00', '14:00']);
    expect(screen.getByRole('region', { name: 'Время' })).toHaveTextContent(
      'Время указано по Алматы (UTC+5)',
    );
    expect(requested).toEqual(['2026-11-17']);
    expect(screen.getByRole('button', { name: /17 ноября/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('день без свободного времени — сообщение вместо списка', async () => {
    mockEventTypesApi([consultation]);
    mockSlotsApi({});
    renderAt(`/book?eventType=${consultation.id}&date=2026-11-16`);

    expect(await screen.findByText('На этот день свободного времени нет')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Свободное время' })).not.toBeInTheDocument();
  });

  it('сообщает, если слоты не загрузились', async () => {
    mockEventTypesApi([consultation]);
    mockAvailabilityApi({ '2026-11-17': 1 });
    server.use(
      http.get('*/api/event-types/:id/slots', () =>
        HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'x' }, { status: 400 }),
      ),
    );
    renderAt(`/book?eventType=${consultation.id}&date=2026-11-17`);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить время');
  });

  it('день вне окна из ссылки не выбирается и не запрашивается', async () => {
    mockEventTypesApi([consultation]);
    const { requested } = mockSlotsApi({});
    renderAt(`/book?eventType=${consultation.id}&date=2026-12-30`);

    expect(await screen.findByText('Сначала выберите день')).toBeInTheDocument();
    expect(requested).toEqual([]);
  });

  it('«Назад» возвращает к выбору типа встречи', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro, consultation]);
    mockSlotsApi({});
    renderAt(`/book?eventType=${consultation.id}&date=2026-11-17`);

    await user.click(await screen.findByRole('button', { name: 'Назад' }));

    expect(screen.getByRole('list', { name: 'Типы встреч' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Информация' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Дни' })).not.toBeInTheDocument();
  });
});
