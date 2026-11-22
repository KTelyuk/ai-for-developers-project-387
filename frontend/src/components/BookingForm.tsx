import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import type { CreateBooking, EventType, Slot } from '@/api';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { type BookingFormValues, bookingFormSchema, errorCode } from '@/lib/bookings.ts';
import { formatMomentDay, formatTimeRange } from '@/lib/format.ts';

type Props = {
  eventType: EventType;
  slot: Slot;
  // Отправка на сервер: новая бронь или изменение записи. Ошибка сервера — отклонённый промис.
  save: (body: CreateBooking) => Promise<void>;
  submitLabel: string;
  // Имя и email из прошлой попытки: после конфликта гость не вводит их заново.
  defaultValues?: BookingFormValues;
  // Время перестало быть свободным: страница возвращает гостя к обновлённым слотам с его данными.
  onSlotGone: (message: string, values: BookingFormValues) => void;
  // Каждое изменение полей: страница хранит введённое, и при возврате к другому времени
  // или дню форма откроется с теми же именем и email.
  onValuesChange: (values: BookingFormValues) => void;
  onBack: () => void;
};

const SLOT_GONE_MESSAGE = 'Это время уже заняли. Выберите другое.';
const SLOT_GONE_CODES = ['SLOT_TAKEN', 'SLOT_UNAVAILABLE'];

// Сообщение об ошибке сервера, после которой гость остаётся в форме.
function serverErrorMessage(code: string | undefined) {
  return code === 'ALREADY_STARTED'
    ? 'Встреча уже началась — изменить её нельзя.'
    : 'Не удалось сохранить запись. Попробуйте ещё раз.';
}

// Форма гостя: имя и email для выбранного времени.
export function BookingForm({
  eventType,
  slot,
  defaultValues = { guestName: '', guestEmail: '' },
  save,
  submitLabel,
  onSlotGone,
  onValuesChange,
  onBack,
}: Props) {
  const id = useId();
  const queryClient = useQueryClient();
  const book = useMutation({
    mutationFn: save,
    // Занятое и освободившееся время пропадает из слотов и счётчиков всех типов встреч.
    onSettled: () => queryClient.invalidateQueries(),
  });
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    try {
      await book.mutateAsync({ eventTypeId: eventType.id, startAt: slot.startAt, ...values });
    } catch (error) {
      if (SLOT_GONE_CODES.includes(errorCode(error) ?? '')) onSlotGone(SLOT_GONE_MESSAGE, values);
    }
  });

  const serverCode = errorCode(book.error);
  const showServerError = book.isError && !SLOT_GONE_CODES.includes(serverCode ?? '');

  const fieldError = (name: keyof BookingFormValues) => {
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
  const name = fieldError('guestName');
  const email = fieldError('guestEmail');

  return (
    <form
      noValidate
      aria-labelledby={`${id}-heading`}
      onSubmit={submit}
      // Ввод в любом поле всплывает сюда: страница всегда знает текущие имя и email.
      onChange={() => onValuesChange(getValues())}
      className="flex flex-col gap-4 rounded-xl border p-5"
    >
      <h2 id={`${id}-heading`} className="text-xl font-semibold">
        Ваши данные
      </h2>
      <p className="text-sm text-muted-foreground">
        {formatMomentDay(slot.startAt)}, {formatTimeRange(slot.startAt, slot.endAt)}
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Имя</Label>
        <Input
          id={`${id}-name`}
          className="h-11"
          autoComplete="name"
          aria-invalid={name['aria-invalid']}
          aria-describedby={name['aria-describedby']}
          {...register('guestName')}
        />
        {name.error}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-11"
          aria-invalid={email['aria-invalid']}
          aria-describedby={email['aria-describedby']}
          {...register('guestEmail')}
        />
        {email.error}
      </div>
      {showServerError ? (
        <p role="alert" className="text-sm text-destructive">
          {serverErrorMessage(serverCode)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="h-11 px-6" disabled={book.isPending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-11 px-6" onClick={onBack}>
          Другое время
        </Button>
      </div>
    </form>
  );
}
