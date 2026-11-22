import type { DurationMinutes } from '@/api';

// Правила полей — те же, что в контракте (typespec/main.tsp) и на сервере (docs/spec.md,
// «Валидация полей»). Схемы форм берут их отсюда.

// Длительности типа встречи (DurationMinutes).
export const DURATIONS = [15, 30, 45, 60] as const satisfies readonly DurationMinutes[];

// Название и описание типа встречи; название обрезается по краям.
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;

// Имя гостя: 1–100 символов после обрезки по краям. Email — `local@domain`, до 254 символов.
export const GUEST_NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
