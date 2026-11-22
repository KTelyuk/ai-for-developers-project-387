// Подписи дат и времени в интерфейсе. Время приходит от сервера уже со смещением Алматы
// (`2026-11-17T09:00:00+05:00`), поэтому показывается как есть, без перевода в пояс браузера.

// Дата `YYYY-MM-DD` читается как полночь UTC: так подпись не зависит от пояса браузера.
const dayLabel = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

// День `2026-11-17` → «вт, 17 ноября».
export function formatDay(date: string) {
  return dayLabel.format(new Date(date));
}

// День момента по Алматы: `2026-11-17T09:00:00+05:00` → `2026-11-17`.
export function momentDate(iso: string) {
  return iso.slice(0, 10);
}

// День момента `2026-11-17T09:00:00+05:00` → «вт, 17 ноября».
export function formatMomentDay(iso: string) {
  return formatDay(momentDate(iso));
}

// Время момента как пришло от сервера: `2026-11-16T09:00:00+05:00` → `09:00`.
export function formatTime(iso: string) {
  return iso.slice(11, 16);
}

// Интервал по Алматы: `09:00–10:00`.
export function formatTimeRange(startAt: string, endAt: string) {
  return `${formatTime(startAt)}–${formatTime(endAt)}`;
}

export function formatDuration(minutes: number) {
  return `${minutes} мин`;
}
