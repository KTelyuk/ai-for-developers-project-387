import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAvailabilityApi } from '@/test/availability.ts';
import { consultation, intro, mockEventTypesApi } from '@/test/event-types.ts';
import { server } from '@/test/msw.ts';
import { renderAt } from '@/test/render.tsx';

// Таймеры настоящие, подменена только дата.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

// «Сейчас» — понедельник 16 ноября 2026, 10:00 по Алматы.
const MONDAY = '2026-11-16T10:00:00+05:00';

function days() {
  return within(screen.getByRole('list', { name: 'Дни' })).getAllByRole('button');
}

describe('страница бронирования: календарь окна записи', () => {
  it('14 дней с сегодняшнего по Алматы и счётчик свободных слотов у каждого', async () => {
    vi.setSystemTime(new Date(MONDAY));
    const user = userEvent.setup();
    mockEventTypesApi([intro, consultation]);
    const { requested } = mockAvailabilityApi({ '2026-11-16': 21, '2026-11-17': 26 });
    renderAt('/book');

    await user.click(await screen.findByRole('button', { name: /Консультация/ }));

    expect(
      await screen.findByRole('button', { name: 'пн, 16 ноября — свободно 21' }),
    ).toBeEnabled();
    expect(days()).toHaveLength(14);
    expect(days()[13]).toHaveAccessibleName('вс, 29 ноября — свободно 0');
    expect(screen.getByRole('button', { name: /17 ноября — свободно 26/ })).toHaveTextContent('26');
    expect(requested).toEqual([{ id: consultation.id, from: '2026-11-16', to: '2026-11-29' }]);
  });

  it('окно сдвигается с датой: ночью по UTC в Алматы уже следующий день', async () => {
    // 20:30 UTC 15 ноября — 01:30 16 ноября по Алматы.
    vi.setSystemTime(new Date('2026-11-15T20:30:00Z'));
    const { requested } = mockAvailabilityApi({});
    mockEventTypesApi([consultation]);
    renderAt(`/book?eventType=${consultation.id}`);

    expect(await screen.findByRole('list', { name: 'Дни' })).toBeInTheDocument();
    expect(days()[0]).toHaveAccessibleName(/16 ноября/);
    await vi.waitFor(() => expect(requested).toHaveLength(1));
    expect(requested[0]).toMatchObject({ from: '2026-11-16', to: '2026-11-29' });
  });

  it('окно сдвигается, когда в Алматы наступает следующий день, пока страница открыта', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-16T23:59:30+05:00'));
    const { requested } = mockAvailabilityApi({});
    mockEventTypesApi([consultation]);
    renderAt(`/book?eventType=${consultation.id}`);
    expect(await screen.findByRole('button', { name: /16 ноября/ })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(days()[0]).toHaveAccessibleName(/17 ноября/);
    expect(days()[13]).toHaveAccessibleName(/30 ноября/);
    await vi.waitFor(() =>
      expect(requested).toContainEqual({
        id: consultation.id,
        from: '2026-11-17',
        to: '2026-11-30',
      }),
    );
  });

  it('выходные и дни без слотов неактивны и не выбираются', async () => {
    vi.setSystemTime(new Date(MONDAY));
    const user = userEvent.setup();
    mockEventTypesApi([consultation]);
    mockAvailabilityApi({ '2026-11-16': 21, '2026-11-17': 0, '2026-11-18': 26 });
    renderAt(`/book?eventType=${consultation.id}`);

    const empty = await screen.findByRole('button', { name: /17 ноября — свободно 0/ });
    expect(empty).toBeDisabled();
    expect(screen.getByRole('button', { name: /21 ноября/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /22 ноября/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /18 ноября/ })).toBeEnabled();

    await user.click(empty);

    expect(empty).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Сначала выберите день')).toBeInTheDocument();
  });

  it('пока счётчики не загрузились, дни не выбираются', async () => {
    vi.setSystemTime(new Date(MONDAY));
    mockEventTypesApi([consultation]);
    server.use(http.get('*/api/event-types/:id/availability', () => new Promise<never>(() => {})));
    renderAt(`/book?eventType=${consultation.id}`);

    await screen.findByRole('list', { name: 'Дни' });

    expect(days().every((day) => day.hasAttribute('disabled'))).toBe(true);
  });

  it('сообщает, если календарь не загрузился', async () => {
    vi.setSystemTime(new Date(MONDAY));
    mockEventTypesApi([consultation]);
    server.use(
      http.get('*/api/event-types/:id/availability', () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'x' }, { status: 404 }),
      ),
    );
    renderAt(`/book?eventType=${consultation.id}`);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить календарь');
  });
});
