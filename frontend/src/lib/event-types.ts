import { z } from 'zod';
import { DESCRIPTION_MAX_LENGTH, DURATIONS, TITLE_MAX_LENGTH } from '@/lib/limits.ts';

// Название обрезается по краям, как на сервере.
export const eventTypeFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Введите название')
    .max(TITLE_MAX_LENGTH, `Не длиннее ${TITLE_MAX_LENGTH} символов`),
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH, `Не длиннее ${DESCRIPTION_MAX_LENGTH} символов`),
  durationMinutes: z.enum(DURATIONS.map(String) as ['15', '30', '45', '60']),
});

export type EventTypeFormInput = z.input<typeof eventTypeFormSchema>;
export type EventTypeFormValues = z.output<typeof eventTypeFormSchema>;
