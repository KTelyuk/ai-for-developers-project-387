import { z } from 'zod';
import type { ApiError } from '@/api';
import {
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  GUEST_NAME_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
} from '@/lib/limits.ts';

// Имя проверяется после обрезки по краям, как на сервере; email — `local@domain`.
export const bookingFormSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .max(GUEST_NAME_MAX_LENGTH, `Не длиннее ${GUEST_NAME_MAX_LENGTH} символов`),
  guestEmail: z
    .string()
    .trim()
    .regex(EMAIL_PATTERN, 'Введите email в формате name@example.com')
    .max(EMAIL_MAX_LENGTH, `Не длиннее ${EMAIL_MAX_LENGTH} символов`),
  // Пустая строка после обрезки равна отсутствию поля: в тело запроса она не попадает.
  subject: z.string().trim().max(SUBJECT_MAX_LENGTH, `Не длиннее ${SUBJECT_MAX_LENGTH} символов`),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

// Код ошибки из ответа сервера `{ code, message }`; у сетевой ошибки кода нет.
export function errorCode(error: unknown) {
  return (error as Partial<ApiError> | null)?.code;
}

// Адрес страницы записи — тот же, что в ссылке из ответа на бронирование.
export function bookingPath(id: string, token: string) {
  return `/bookings/${id}?token=${encodeURIComponent(token)}`;
}

// Ссылку сервер отдаёт путём от корня сайта; гостю показываем полный адрес.
export function absoluteLink(link: string) {
  return new URL(link, window.location.origin).toString();
}
