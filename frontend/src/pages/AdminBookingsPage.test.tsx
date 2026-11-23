import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { anna, boris, mockAdminBookingsApi } from '@/test/admin-bookings.ts';
import { mockEventTypesApi } from '@/test/event-types.ts';
import { server } from '@/test/msw.ts';
import { renderAt } from '@/test/render.tsx';

const PATH = '/admin/bookings';

async function bookingsList() {
  return screen.findByRole('list', { name: 'Встречи' });
}

describe('админка: встречи', () => {
  it('показывает встречи в порядке сервера: тип, дата, время, имя и email гостя', async () => {
    mockAdminBookingsApi([anna, boris]);
    renderAt(PATH);

    const items = within(await bookingsList()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Консультация');
    expect(items[0]).toHaveTextContent('пн, 16 ноября');
    expect(items[0]).toHaveTextContent('09:30–10:30');
    expect(items[0]).toHaveTextContent('Анна');
    expect(items[0]).toHaveTextContent('anna@example.com');
    expect(items[1]).toHaveTextContent('Знакомство');
    expect(items[1]).toHaveTextContent('вт, 17 ноября');
    expect(items[1]).toHaveTextContent('14:00–14:15');
    expect(items[1]).toHaveTextContent('Борис');
  });

  it('показывает предмет разговора целиком, с переносами строк и как обычный текст', async () => {
    const subject = `Первая <b>строка</b>\n\nВторая ${'длинная '.repeat(100)}`.trim();
    mockAdminBookingsApi([{ ...anna, subject }, boris]);
    renderAt(PATH);

    const items = within(await bookingsList()).getAllByRole('listitem');
    const shown = within(items[0] as HTMLElement).getByText(/Первая/);
    expect(shown.textContent).toBe(subject);
    expect(shown).toHaveClass('whitespace-pre-wrap');
    expect(items[0]?.querySelector('b')).toBeNull();
    expect(items[1]).not.toHaveTextContent('Предмет разговора');
  });

  it('без встреч показывает понятное пустое состояние', async () => {
    mockAdminBookingsApi([]);
    renderAt(PATH);

    expect(await screen.findByText('Предстоящих встреч нет')).toBeInTheDocument();
  });

  it('ошибка загрузки видна владельцу', async () => {
    server.use(
      http.get('*/api/admin/bookings', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'x' }, { status: 500 }),
      ),
    );
    renderAt(PATH);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить встречи');
  });

  it('отменяет встречу после подтверждения, и она пропадает из списка', async () => {
    const user = userEvent.setup();
    const { deleted } = mockAdminBookingsApi([anna, boris]);
    renderAt(PATH);
    const [first] = within(await bookingsList()).getAllByRole('listitem');

    await user.click(within(first).getByRole('button', { name: 'Отменить' }));
    expect(deleted).toEqual([]);
    await user.click(within(first).getByRole('button', { name: 'Да, отменить' }));

    const items = await within(await bookingsList()).findAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Борис');
    expect(deleted).toEqual([anna.id]);
  });

  it('передумать можно: «Нет» не отменяет встречу', async () => {
    const user = userEvent.setup();
    const { deleted } = mockAdminBookingsApi([anna]);
    renderAt(PATH);
    const [first] = within(await bookingsList()).getAllByRole('listitem');

    await user.click(within(first).getByRole('button', { name: 'Отменить' }));
    await user.click(within(first).getByRole('button', { name: 'Нет' }));

    expect(within(first).getByRole('button', { name: 'Отменить' })).toBeInTheDocument();
    expect(deleted).toEqual([]);
  });

  it('встреча, которой уже нет, пропадает из списка с сообщением', async () => {
    const user = userEvent.setup();
    mockAdminBookingsApi([anna], { missing: [anna.id] });
    renderAt(PATH);
    const [first] = within(await bookingsList()).getAllByRole('listitem');

    await user.click(within(first).getByRole('button', { name: 'Отменить' }));
    await user.click(within(first).getByRole('button', { name: 'Да, отменить' }));

    expect(await screen.findByText('Встреча уже отменена')).toHaveAttribute('role', 'status');
    expect(await screen.findByText('Предстоящих встреч нет')).toBeInTheDocument();
  });

  it('между разделами владельца есть навигация', async () => {
    const user = userEvent.setup();
    mockAdminBookingsApi([]);
    mockEventTypesApi();
    renderAt(PATH);

    const nav = screen.getByRole('navigation', { name: 'Раздел владельца' });
    expect(within(nav).getByRole('link', { name: 'Встречи' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.click(within(nav).getByRole('link', { name: 'Типы встреч' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Типы встреч' })).toBeVisible();
    const adminNav = screen.getByRole('navigation', { name: 'Раздел владельца' });
    await user.click(within(adminNav).getByRole('link', { name: 'Встречи' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Встречи' })).toBeVisible();
  });
});
