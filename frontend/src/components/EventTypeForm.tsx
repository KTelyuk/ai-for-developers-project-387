import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import type { CreateEventType, DurationMinutes, EventType } from '@/api';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import {
  type EventTypeFormInput,
  type EventTypeFormValues,
  eventTypeFormSchema,
} from '@/lib/event-types.ts';
import { formatDuration } from '@/lib/format.ts';
import { DURATIONS } from '@/lib/limits.ts';

type Props = {
  submitLabel: string;
  pending: boolean;
  // Сообщение сервера, если сохранить не удалось.
  serverError?: string;
  // Текущие значения при редактировании; без них форма пустая, длительность 30 минут.
  defaultValues?: EventType;
  // Возвращает true, если сохранено: тогда форма возвращается к начальным значениям.
  onSubmit: (values: CreateEventType) => Promise<boolean>;
  // Если задан, рядом с кнопкой сохранения появляется «Отмена».
  onCancel?: () => void;
};

const EMPTY: EventTypeFormInput = { title: '', description: '', durationMinutes: '30' };

function toFormInput(eventType?: EventType): EventTypeFormInput {
  if (!eventType) return EMPTY;
  return {
    title: eventType.title,
    description: eventType.description,
    durationMinutes: String(eventType.durationMinutes) as EventTypeFormInput['durationMinutes'],
  };
}

const selectClassName =
  'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

export function EventTypeForm({
  submitLabel,
  pending,
  serverError,
  defaultValues,
  onSubmit,
  onCancel,
}: Props) {
  const id = useId();
  const initial = toFormInput(defaultValues);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventTypeFormInput, unknown, EventTypeFormValues>({
    resolver: zodResolver(eventTypeFormSchema),
    defaultValues: initial,
  });

  const submit = handleSubmit(async (values) => {
    const saved = await onSubmit({
      title: values.title,
      description: values.description,
      durationMinutes: Number(values.durationMinutes) as DurationMinutes,
    });
    if (saved) reset(initial);
  });

  const fieldError = (name: keyof EventTypeFormInput) => {
    const message = errors[name]?.message;
    return {
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `${id}-${name}-error` : undefined,
      error: message ? (
        <p id={`${id}-${name}-error`} className="text-sm text-destructive">
          {message}
        </p>
      ) : null,
    };
  };
  const title = fieldError('title');
  const description = fieldError('description');

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-title`}>Название</Label>
        <Input
          id={`${id}-title`}
          className="h-11"
          aria-invalid={title['aria-invalid']}
          aria-describedby={title['aria-describedby']}
          {...register('title')}
        />
        {title.error}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-description`}>Описание</Label>
        <Textarea
          id={`${id}-description`}
          rows={3}
          aria-invalid={description['aria-invalid']}
          aria-describedby={description['aria-describedby']}
          {...register('description')}
        />
        {description.error}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-duration`}>Длительность</Label>
        <select id={`${id}-duration`} className={selectClassName} {...register('durationMinutes')}>
          {DURATIONS.map((minutes) => (
            <option key={minutes} value={String(minutes)}>
              {formatDuration(minutes)}
            </option>
          ))}
        </select>
      </div>
      {serverError ? (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="h-11 px-6" disabled={pending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 px-6"
            onClick={onCancel}
          >
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
