import { buildApp } from '../src/app.ts';
import type { Clock } from '../src/clock.ts';
import type { Store } from '../src/store.ts';

// Понедельник, 10:00 по Алматы: рабочий день, до обеда.
export const DEFAULT_NOW = '2026-11-16T10:00:00+05:00';

// Часы, которые всегда показывают один и тот же момент.
export function fixedClock(iso: string): Clock {
  const ms = Date.parse(iso);
  return () => new Date(ms);
}

// Приложение для тестов: время зафиксировано, хранилище — новое на каждый вызов.
export function buildTestApp({ now = DEFAULT_NOW, store }: { now?: string; store?: Store } = {}) {
  return buildApp({ clock: fixedClock(now), store });
}
