import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { consultation, intro, mockEventTypesApi } from '@/test/event-types.ts';
import { server } from '@/test/msw.ts';
import { renderAt } from '@/test/render.tsx';

describe('страница бронирования: выбор типа встречи', () => {
  it('показывает типы встреч с названием, описанием и длительностью', async () => {
    mockEventTypesApi([intro, consultation]);
    renderAt('/book');

    const list = await screen.findByRole('list', { name: 'Типы встреч' });
    const options = within(list).getAllByRole('button');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Знакомство');
    expect(options[0]).toHaveTextContent('Короткий звонок, чтобы познакомиться');
    expect(options[0]).toHaveTextContent('15 мин');
    expect(options[1]).toHaveTextContent('Консультация');
    expect(options[1]).toHaveTextContent('60 мин');
    expect(screen.queryByRole('region', { name: 'Информация' })).not.toBeInTheDocument();
  });

  it('после выбора типа показывает блок «Информация» с часовым поясом Алматы', async () => {
    const user = userEvent.setup();
    mockEventTypesApi([intro, consultation]);
    renderAt('/book');

    await user.click(await screen.findByRole('button', { name: /Консультация/ }));

    const info = screen.getByRole('region', { name: 'Информация' });
    expect(within(info).getByRole('heading', { name: 'Консультация' })).toBeInTheDocument();
    expect(info).toHaveTextContent('Подробный разбор вашей задачи');
    expect(info).toHaveTextContent('60 мин');
    expect(info).toHaveTextContent('Время указано по Алматы (UTC+5)');
    expect(screen.queryByRole('list', { name: 'Типы встреч' })).not.toBeInTheDocument();
  });

  it('открывает выбранный тип встречи по ссылке', async () => {
    mockEventTypesApi([intro, consultation]);
    renderAt(`/book?eventType=${intro.id}`);

    const info = await screen.findByRole('region', { name: 'Информация' });
    expect(info).toHaveTextContent('Знакомство');
  });

  it('без типов встреч сообщает, что записаться пока нельзя', async () => {
    mockEventTypesApi();
    renderAt('/book');

    expect(await screen.findByText('Записаться пока нельзя')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
  });

  it('сообщает, если типы встреч не загрузились', async () => {
    server.use(http.get('*/api/event-types', () => HttpResponse.json({}, { status: 500 })));
    renderAt('/book');

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить типы встреч');
  });
});
