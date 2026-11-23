import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AdminBooking, ApiError } from '@/api';
import {
  cancelBookingByOwnerMutation,
  listAdminBookingsOptions,
} from '@/api/@tanstack/react-query.gen.ts';
import { AdminNav } from '@/components/AdminNav.tsx';
import { LoadError, Loading } from '@/components/LoadState.tsx';
import { BookingSubject } from '@/components/BookingSubject.tsx';
import { Button } from '@/components/ui/button.tsx';
import { formatMomentDay, formatTimeRange } from '@/lib/format.ts';
import { OWNER_TIME_ZONE_LABEL } from '@/lib/schedule.ts';

// Встреча в списке владельца; «Отменить» сначала спрашивает подтверждение.
function BookingItem({ booking, onMissing }: { booking: AdminBooking; onMissing: () => void }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const cancel = useMutation({
    ...cancelBookingByOwnerMutation(),
    onError: (error) => {
      if ((error as Partial<ApiError> | null)?.code === 'NOT_FOUND') onMissing();
    },
    // Отмена освобождает время: обновляем и список, и слоты со счётчиками у гостя.
    onSettled: () => queryClient.invalidateQueries(),
  });
  const failed = cancel.isError && (cancel.error as Partial<ApiError> | null)?.code !== 'NOT_FOUND';

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-medium break-words">{booking.eventTypeTitle}</h3>
        <p className="text-sm">
          {formatMomentDay(booking.startAt)}, {formatTimeRange(booking.startAt, booking.endAt)}
        </p>
        <p className="text-sm break-words text-muted-foreground">
          {booking.guestName} · {booking.guestEmail}
        </p>
        {booking.subject ? (
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Предмет разговора: </span>
            <BookingSubject subject={booking.subject} />
          </p>
        ) : null}
        {failed ? (
          <p role="alert" className="text-sm text-destructive">
            Не удалось отменить встречу
          </p>
        ) : null}
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Отменить встречу?</span>
          <Button
            type="button"
            variant="destructive"
            className="h-11 px-4"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ path: { id: booking.id } })}
          >
            Да, отменить
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-4"
            disabled={cancel.isPending}
            onClick={() => setConfirming(false)}
          >
            Нет
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11 self-start px-4"
          onClick={() => setConfirming(true)}
        >
          Отменить
        </Button>
      )}
    </li>
  );
}

export function AdminBookingsPage() {
  const bookings = useQuery(listAdminBookingsOptions());
  const [notice, setNotice] = useState<string>();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <AdminNav />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Встречи</h1>
        <p className="text-sm text-muted-foreground">
          Предстоящие и идущие сейчас, время — {OWNER_TIME_ZONE_LABEL}
        </p>
      </div>
      <p role="status" className="text-sm empty:hidden">
        {notice}
      </p>
      {bookings.isPending ? (
        <Loading>Загружаем…</Loading>
      ) : bookings.isError ? (
        <LoadError message="Не удалось загрузить встречи" onRetry={() => void bookings.refetch()} />
      ) : bookings.data.length === 0 ? (
        <p className="text-muted-foreground">Предстоящих встреч нет</p>
      ) : (
        <ul aria-label="Встречи" className="flex flex-col gap-3">
          {bookings.data.map((booking) => (
            <BookingItem
              key={booking.id}
              booking={booking}
              onMissing={() => setNotice('Встреча уже отменена')}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
