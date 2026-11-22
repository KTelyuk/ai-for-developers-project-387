import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import {
  cancelBookingMutation,
  getBookingOptions,
  getEventTypeOptions,
} from '@/api/@tanstack/react-query.gen.ts';
import { NotFoundOutcome, Outcome, UnavailableOutcome } from '@/components/BookingOutcome.tsx';
import { LoadError, Loading } from '@/components/LoadState.tsx';
import { Button } from '@/components/ui/button.tsx';
import { errorCode } from '@/lib/bookings.ts';
import { formatMomentDay, formatTimeRange, momentDate } from '@/lib/format.ts';
import { OWNER_TIME_ZONE_LABEL } from '@/lib/schedule.ts';

// Страница записи: гость открывает её по ссылке `/bookings/{id}?token=...` и может изменить
// или отменить запись.
// Токен из ссылки уходит в каждый запрос; без верного токена сервер отвечает 403.
export function BookingPage() {
  const headingId = useId();
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  // Сюда возвращает сохранённое изменение записи.
  const updated = (useLocation().state as { updated?: boolean } | null)?.updated === true;

  const booking = useQuery(getBookingOptions({ path: { id }, query: { token } }));
  const eventTypeId = booking.data?.eventTypeId ?? '';
  const eventType = useQuery({
    ...getEventTypeOptions({ path: { id: eventTypeId } }),
    enabled: eventTypeId !== '',
  });
  const cancel = useMutation({
    ...cancelBookingMutation(),
    // Освободившееся время должно сразу появиться в слотах и счётчиках дней.
    onSettled: () => queryClient.invalidateQueries(),
  });

  const cancelCode = errorCode(cancel.error);
  if (cancel.isSuccess) {
    return <Outcome title="Запись отменена" text="Время снова свободно." rebook />;
  }
  if (cancelCode === 'NOT_FOUND') return <NotFoundOutcome />;
  if (cancelCode === 'INVALID_TOKEN') return <UnavailableOutcome />;

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

  const { startAt, endAt, guestName, guestEmail } = booking.data;
  const editPath = `/bookings/${id}/edit?${new URLSearchParams({
    token,
    eventType: eventTypeId,
    date: momentDate(startAt),
  })}`;
  const started = cancelCode === 'ALREADY_STARTED';

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
      <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-xl border p-5">
        <h1 id={headingId} className="text-2xl font-semibold">
          Ваша запись
        </h1>
        {updated ? (
          <p role="status" className="text-sm font-medium">
            Запись изменена. Ссылка осталась прежней.
          </p>
        ) : null}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Встреча</dt>
          <dd className="break-words">{eventType.data?.title ?? '…'}</dd>
          <dt className="text-muted-foreground">Дата</dt>
          <dd>{formatMomentDay(startAt)}</dd>
          <dt className="text-muted-foreground">Время</dt>
          <dd>{formatTimeRange(startAt, endAt)}</dd>
          <dt className="text-muted-foreground">Имя</dt>
          <dd className="break-words">{guestName}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-words">{guestEmail}</dd>
        </dl>
        <p className="text-sm text-muted-foreground">{OWNER_TIME_ZONE_LABEL}</p>

        {started ? (
          <p role="alert" className="text-sm font-medium">
            Встреча уже началась — отменить её нельзя
          </p>
        ) : confirming && !cancel.isError ? (
          <div className="flex flex-col gap-3">
            <p className="font-medium">Отменить запись? Время освободится для других.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="h-11 px-6"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate({ path: { id }, query: { token } })}
              >
                Да, отменить
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 px-6"
                disabled={cancel.isPending}
                onClick={() => setConfirming(false)}
              >
                Не отменять
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="h-11 px-6">
                <Link to={editPath}>Изменить</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 px-6"
                onClick={() => {
                  cancel.reset();
                  setConfirming(true);
                }}
              >
                Отменить
              </Button>
            </div>
            {cancel.isError ? (
              <p role="alert" className="text-sm text-destructive">
                Не удалось отменить запись. Попробуйте ещё раз.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
