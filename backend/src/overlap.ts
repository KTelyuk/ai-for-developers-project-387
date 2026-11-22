// Пересечения — чистая проверка, свободен ли интервал относительно записей (docs/spec.md).
// Интервалы полуоткрытые `[start, end)`: встреча впритык к предыдущей разрешена.

// Моменты — строки ISO 8601 со смещением; сравниваются как моменты времени, а не как строки.
export type Interval = { startAt: string; endAt: string };

export function overlaps(a: Interval, b: Interval): boolean {
  return Date.parse(a.startAt) < Date.parse(b.endAt) && Date.parse(b.startAt) < Date.parse(a.endAt);
}

export function isIntervalFree(interval: Interval, bookings: readonly Interval[]): boolean {
  return !bookings.some((booking) => overlaps(interval, booking));
}
