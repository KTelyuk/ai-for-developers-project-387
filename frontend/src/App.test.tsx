import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { intro, mockEventTypesApi } from '@/test/event-types.ts';
import { startedRequests } from '@/test/msw.ts';
import { renderAt } from '@/test/render.tsx';

// Сколько ждать, чтобы асинхронный запрос успел дойти до сети (MSW), если он есть.
const PENDING_REQUESTS_WAIT_MS = 50;

// Ссылки, чей путь ведёт в /admin, в любой записи: /admin, ./admin, http://host/admin.
function adminLinks() {
  return screen
    .getAllByRole('link')
    .map((link) => new URL(link.getAttribute('href') ?? '', window.location.href).pathname)
    .filter((pathname) => pathname === '/admin' || pathname.startsWith('/admin/'));
}

describe('главная', () => {
  it('рассказывает о сервисе и показывает кнопку «Записаться»', () => {
    renderAt('/');

    expect(screen.getByRole('banner')).toHaveTextContent('Календарь звонков');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Запишитесь на звонок в удобное время',
    );
    expect(screen.getByText(/без регистрации/i)).toBeInTheDocument();

    const steps = screen.getByRole('list', { name: 'Как это работает' });
    expect(
      within(steps)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Выберите тип встречи', 'Выберите день и время', 'Оставьте имя и email']);

    expect(screen.getByRole('link', { name: 'Записаться' })).toHaveAttribute('href', '/book');
  });

  it('не делает запросов к API', async () => {
    renderAt('/');
    await new Promise((resolve) => setTimeout(resolve, PENDING_REQUESTS_WAIT_MS));

    expect(startedRequests().map((request) => request.url)).toEqual([]);
  });

  it('не содержит ссылок на /admin', () => {
    renderAt('/');
    expect(adminLinks()).toEqual([]);
  });
});

describe('маршруты', () => {
  it('/admin открывает типы встреч владельца', async () => {
    mockEventTypesApi([intro]);
    renderAt('/admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Типы встреч' }),
    ).toBeInTheDocument();
  });

  it('в разделе владельца логотип ведёт на /admin, а не к гостю', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro]);
    renderAt('/admin/event-types');

    const logo = within(screen.getByRole('banner')).getByRole('link', {
      name: 'Календарь звонков',
    });
    expect(logo).toHaveAttribute('href', '/admin');

    await user.click(logo);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Типы встреч' }),
    ).toBeInTheDocument();
  });

  it('у гостя логотип ведёт на главную', () => {
    renderAt('/book');

    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Календарь звонков' }),
    ).toHaveAttribute('href', '/');
  });

  it('неизвестный адрес — «Страница не найдена» со ссылкой на главную и без ссылок на /admin', async () => {
    const user = userEvent.setup();
    renderAt('/no-such-page');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Страница не найдена');
    expect(adminLinks()).toEqual([]);

    await user.click(screen.getByRole('link', { name: 'На главную' }));
    expect(screen.getByRole('link', { name: 'Записаться' })).toBeInTheDocument();
  });
});

describe('страница бронирования', () => {
  it('открывается по кнопке «Записаться» и возвращает на главную', async () => {
    const user = userEvent.setup();
    mockEventTypesApi();
    renderAt('/');

    await user.click(screen.getByRole('link', { name: 'Записаться' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Бронирование');

    await user.click(await screen.findByRole('link', { name: 'На главную' }));
    expect(screen.getByRole('link', { name: 'Записаться' })).toBeInTheDocument();
  });

  it('не содержит ссылок на /admin ни до, ни после выбора типа встречи', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro]);
    renderAt('/book');

    await user.click(await screen.findByRole('button', { name: /Знакомство/ }));
    await screen.findByRole('region', { name: 'Информация' });
    expect(adminLinks()).toEqual([]);
  });
});
