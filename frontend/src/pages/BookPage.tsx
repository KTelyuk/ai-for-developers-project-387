import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Clock, Globe } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  type Booking,
  type BookingCreated,
  type CreateBooking,
  createBooking,
  type EventType,
  type Slot,
  updateBooking,
} from '@/api';
import { getBookingQueryKey, listEventTypesOptions } from '@/api/@tanstack/react-query.gen.ts';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar.tsx';
import { BookingConfirmation } from '@/components/BookingConfirmation.tsx';
import { BookingForm } from '@/components/BookingForm.tsx';
import { LoadError, Loading } from '@/components/LoadState.tsx';
import { SlotList } from '@/components/SlotList.tsx';
import { Button } from '@/components/ui/button.tsx';
import { type BookingFormValues, bookingPath } from '@/lib/bookings.ts';
import { formatDuration, momentDate } from '@/lib/format.ts';
import { OWNER_TIME_ZONE_LABEL, windowDays } from '@/lib/schedule.ts';
import { useOwnerToday } from '@/lib/use-owner-today.ts';
import { cn } from '@/lib/utils.ts';

// Выбор хранится в адресе: `/book?eventType=<id>&date=YYYY-MM-DD`.
const EVENT_TYPE_PARAM = 'eventType';
const DATE_PARAM = 'date';

// Изменение записи гостем: те же шаги на `/bookings/{id}/edit?token=...`, токен остаётся в адресе.
export type Rebooking = { booking: Booking; token: string };

function EventTypeInfo({ eventType }: { eventType: EventType }) {
  return (
    <section
      aria-labelledby="booking-info"
      className="flex flex-col gap-3 rounded-xl border p-5 lg:max-w-sm"
    >
      <h2 id="booking-info" className="text-sm font-medium text-muted-foreground">
        Информация
      </h2>
      <h3 className="text-xl font-semibold break-words">{eventType.title}</h3>
      {eventType.description ? (
        <p className="break-words text-muted-foreground">{eventType.description}</p>
      ) : null}
      <p className="flex items-center gap-2 text-sm">
        <Clock className="size-4" aria-hidden="true" />
        {formatDuration(eventType.durationMinutes)}
      </p>
      <p className="flex items-center gap-2 text-sm">
        <Globe className="size-4" aria-hidden="true" />
        {OWNER_TIME_ZONE_LABEL}
      </p>
    </section>
  );
}

export function BookPage({ rebooking }: { rebooking?: Rebooking }) {
  const eventTypes = useQuery(listEventTypesOptions());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // При изменении записи токен переживает любой шаг: без него сервер ответит 403.
  const select = (params: Record<string, string>) =>
    setSearchParams(rebooking ? { token: rebooking.token, ...params } : params);
  const selectedId = searchParams.get(EVENT_TYPE_PARAM);
  const selected = eventTypes.data?.find((eventType) => eventType.id === selectedId);
  // Окно сдвигается вместе с датой по Алматы, даже если страница остаётся открытой.
  const today = useOwnerToday();
  const days = useMemo(() => windowDays(today), [today]);
  const dateParam = searchParams.get(DATE_PARAM);
  const selectedDate = days.find((day) => day.date === dateParam && !day.weekend)?.date;
  // Выбранное время, сообщение о занятом времени и созданная запись живут только на этой странице:
  // токен из ответа не попадает в адрес и историю.
  const [slot, setSlot] = useState<Slot>();
  const [notice, setNotice] = useState<string>();
  const [created, setCreated] = useState<BookingCreated>();
  // Введённые имя и email переживают конфликт и возврат к выбору времени: форма открывается с ними.
  // При изменении записи форма открывается с прежними именем и email.
  const [guest, setGuest] = useState<BookingFormValues | undefined>(
    rebooking && {
      guestName: rebooking.booking.guestName,
      guestEmail: rebooking.booking.guestEmail,
    },
  );
  const chosenSlot = slot && momentDate(slot.startAt) === selectedDate ? slot : undefined;
  const timeStep = useRef<HTMLElement>(null);
  // Закреплённые внизу кнопки шагов не должны закрывать конец страницы на телефоне.
  const withSteps = selected !== undefined && created === undefined;

  function chooseSlot(next: Slot | undefined, message?: string) {
    setSlot(next);
    setNotice(message);
  }

  // Новая бронь показывает подтверждение со ссылкой; изменённая запись — свою страницу.
  async function save(body: CreateBooking) {
    if (rebooking) {
      const { id } = rebooking.booking;
      const options = { path: { id }, query: { token: rebooking.token } };
      const { data } = await updateBooking({ ...options, body, throwOnError: true });
      // В кэше ещё прежняя запись: без этого страница записи на миг показала бы старое время.
      queryClient.setQueryData(getBookingQueryKey(options), data);
      await navigate(bookingPath(id, rebooking.token), { state: { updated: true } });
      return;
    }
    const { data } = await createBooking({ body, throwOnError: true });
    setCreated(data);
  }

  return (
    <div
      className={cn(
        'mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-8 sm:pt-12',
        withSteps ? 'pb-28 md:pb-12' : 'pb-8 sm:pb-12',
      )}
    >
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {rebooking ? 'Изменение записи' : 'Бронирование'}
        </h1>
        {rebooking ? (
          <Link
            to={bookingPath(rebooking.booking.id, rebooking.token)}
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Вернуться к записи без изменений
          </Link>
        ) : null}
      </div>
      {eventTypes.isPending ? (
        <Loading>Загружаем типы встреч…</Loading>
      ) : eventTypes.isError ? (
        <LoadError
          message="Не удалось загрузить типы встреч"
          onRetry={() => void eventTypes.refetch()}
        />
      ) : eventTypes.data.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-lg font-medium">Записаться пока нельзя</p>
          <p className="text-muted-foreground">
            Владелец ещё не опубликовал ни одного типа встречи.
          </p>
          <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base">
            <Link to="/">На главную</Link>
          </Button>
        </div>
      ) : selected && created ? (
        <BookingConfirmation eventType={selected} created={created} />
      ) : selected ? (
        <div className="flex flex-col gap-6">
          {/* На телефоне шаги листаются кнопками, закреплёнными внизу экрана; с планшета «Назад» стоит
              над блоками, а «Продолжить» не нужна — календарь и время видны рядом. */}
          <nav
            aria-label="Шаги записи"
            className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0"
          >
            <Button
              variant="outline"
              size="lg"
              className="h-11 flex-1 px-6 text-base md:flex-none"
              onClick={() => {
                chooseSlot(undefined);
                select({});
              }}
            >
              Назад
            </Button>
            {chosenSlot ? null : (
              <Button
                size="lg"
                className="h-11 flex-1 px-6 text-base md:hidden"
                disabled={!selectedDate}
                onClick={() => {
                  const time = timeStep.current;
                  time?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                  time?.focus({ preventScroll: true });
                }}
              >
                Продолжить
              </Button>
            )}
          </nav>
          {notice ? (
            <p role="alert" className="text-destructive">
              {notice}
            </p>
          ) : null}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="md:col-span-2 lg:col-span-1">
              <EventTypeInfo eventType={selected} />
            </div>
            {chosenSlot ? (
              <div className="lg:col-span-2">
                <BookingForm
                  eventType={selected}
                  slot={chosenSlot}
                  save={save}
                  submitLabel={rebooking ? 'Сохранить изменения' : 'Записаться'}
                  defaultValues={guest}
                  onSlotGone={(message, values) => {
                    setGuest(values);
                    chooseSlot(undefined, message);
                  }}
                  onValuesChange={setGuest}
                  onBack={() => chooseSlot(undefined)}
                />
              </div>
            ) : (
              <>
                <AvailabilityCalendar
                  eventTypeId={selected.id}
                  days={days}
                  selected={selectedDate}
                  onSelect={(date) => {
                    chooseSlot(undefined);
                    select({ [EVENT_TYPE_PARAM]: selected.id, [DATE_PARAM]: date });
                  }}
                />
                <SlotList
                  ref={timeStep}
                  eventTypeId={selected.id}
                  date={selectedDate}
                  onSelect={(next) => chooseSlot(next)}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="choose-event-type" className="flex flex-col gap-4">
            <h2 id="choose-event-type" className="text-xl font-semibold">
              Выберите тип встречи
            </h2>
            <ul aria-label="Типы встреч" className="grid gap-3 sm:grid-cols-2">
              {eventTypes.data.map((eventType) => {
                return (
                  <li key={eventType.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => select({ [EVENT_TYPE_PARAM]: eventType.id })}
                      className="flex min-h-11 w-full flex-col gap-1 rounded-xl border p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="flex w-full flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium break-words">{eventType.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(eventType.durationMinutes)}
                        </span>
                      </span>
                      {eventType.description ? (
                        <span className="text-sm break-words text-muted-foreground">
                          {eventType.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
