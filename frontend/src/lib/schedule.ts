// Дни и время по Алматы. Слоты считает сервер; фронтенд только показывает их как есть
// и строит список дней окна для выбора (docs/spec.md, «Правила расписания»).
// Смещение и окно владельца на фронтенде заданы только здесь.

import { formatDay } from '@/lib/format.ts';

// Смещение Алматы фиксированное, +05:00: летнего времени нет (docs/spec.md, issue #17).
const OWNER_OFFSET_MS = 5 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
export const WINDOW_DAYS = 14;

// Подпись часового пояса владельца: всё время в интерфейсе — по Алматы.
export const OWNER_TIME_ZONE_LABEL = 'Время указано по Алматы (UTC+5)';

export type WindowDay = {
  date: string;
  // `пн, 16 ноября`.
  label: string;
  dayOfMonth: number;
  // День недели с понедельника: 0 — понедельник, 6 — воскресенье.
  weekday: number;
  weekend: boolean;
};

// Сегодняшняя дата `YYYY-MM-DD` по Алматы.
export function ownerToday(now: Date): string {
  return new Date(now.getTime() + OWNER_OFFSET_MS).toISOString().slice(0, 10);
}

// 14 календарных дней начиная с сегодняшнего по Алматы (`today` — из `ownerToday`).
export function windowDays(today: string): WindowDay[] {
  const start = Date.parse(today);
  return Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const day = new Date(start + index * DAY_MS);
    const date = day.toISOString().slice(0, 10);
    const weekday = (day.getUTCDay() + 6) % 7;
    return {
      date,
      label: formatDay(date),
      dayOfMonth: day.getUTCDate(),
      weekday,
      weekend: weekday >= 5,
    };
  });
}
