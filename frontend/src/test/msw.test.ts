import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { getHealth } from '@/api';
import { server } from '@/test/msw.ts';

describe('моки HTTP', () => {
  it('запрос SDK получает ответ из MSW', async () => {
    server.use(http.get('*/api/health', () => HttpResponse.json({ status: 'ok' })));

    const { data } = await getHealth();

    expect(data).toEqual({ status: 'ok' });
  });

  it('запрос без обработчика в MSW не уходит в сеть и завершается ошибкой', async () => {
    const { data, error } = await getHealth();

    expect(data).toBeUndefined();
    expect(error).toBeDefined();
  });
});
