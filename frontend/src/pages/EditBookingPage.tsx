import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { getBookingOptions } from '@/api/@tanstack/react-query.gen.ts';
import { NotFoundOutcome, Outcome, UnavailableOutcome } from '@/components/BookingOutcome.tsx';
import { LoadError, Loading } from '@/components/LoadState.tsx';
import { errorCode } from '@/lib/bookings.ts';
import { BookPage } from '@/pages/BookPage.tsx';

// Изменение записи гостем: `/bookings/{id}/edit?token=...&eventType=...&date=...`.
// Тип встречи, день и данные гостя выбраны заранее; дальше — те же шаги, что у бронирования.
export function EditBookingPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  // «Сейчас» на момент открытия страницы: начавшуюся встречу менять незачем.
  const [openedAt] = useState(() => Date.now());
  const booking = useQuery(getBookingOptions({ path: { id }, query: { token } }));

  if (booking.isPending) {
    return <Loading className="mx-auto max-w-xl px-4 py-8">Загрузка…</Loading>;
  }
  if (booking.isError) {
    const code = errorCode(booking.error);
    if (code === 'NOT_FOUND') return <NotFoundOutcome />;
    if (code === 'INVALID_TOKEN') return <UnavailableOutcome />;
    return (
      <LoadError
        className="mx-auto max-w-xl px-4 py-8"
        message="Не удалось загрузить запись"
        onRetry={() => void booking.refetch()}
      />
    );
  }
  // Сервер всё равно ответит 409, но гостю незачем проходить шаги ради отказа.
  if (Date.parse(booking.data.startAt) <= openedAt) {
    return <Outcome title="Изменить запись нельзя" text="Встреча уже началась." />;
  }
  return <BookPage rebooking={{ booking: booking.data, token }} />;
}
