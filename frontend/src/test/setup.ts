// Модуль регистрирует матчеры jest-dom в expect и их типы — импорт ради побочного эффекта.
// oxlint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { client } from '@/api/client.gen.ts';
import { resetStartedRequests, server } from '@/test/msw.ts';

// В Node `fetch` не принимает относительный адрес, поэтому SDK в тестах ходит на origin jsdom.
client.setConfig({ baseUrl: window.location.origin });

// Под полной параллельной нагрузкой первый рендер страницы с календарём не укладывается в секунду
// по умолчанию: findBy*/waitFor ждут дольше, чтобы тесты не падали от медленной машины.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetStartedRequests();
});

afterAll(() => {
  server.close();
});
