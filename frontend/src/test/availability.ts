import { http, HttpResponse } from 'msw/http';
import type { DayAvailability } from '@/api';
import { server } from '@/test/msw.ts';

const DAY_MS = 24 * 60 * 60_000;

// Счётчики свободных слотов по дням; дни без счётчика — 0. Функция вызывается на каждый запрос —
// так счётчики меняются вместе с состоянием теста. Отвечает за каждый день `from`–`to`
// и запоминает запрошенные диапазоны, чтобы тест видел, что ушло на сервер.
export function mockAvailabilityApi(
  counts: Record<string, number> | (() => Record<string, number>),
) {
  const requested: { id: string; from: string; to: string }[] = [];
  server.use(
    http.get('*/api/event-types/:id/availability', ({ request, params }) => {
      const current = typeof counts === 'function' ? counts() : counts;
      const query = new URL(request.url).searchParams;
      const from = query.get('from') ?? '';
      const to = query.get('to') ?? '';
      requested.push({ id: String(params.id), from, to });
      const days: DayAvailability[] = [];
      for (let ms = Date.parse(from); ms <= Date.parse(to); ms += DAY_MS) {
        const date = new Date(ms).toISOString().slice(0, 10);
        days.push({ date, freeSlots: current[date] ?? 0 });
      }
      return HttpResponse.json(days);
    }),
  );
  return { requested };
}
