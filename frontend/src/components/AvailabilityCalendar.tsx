import { useQuery } from '@tanstack/react-query';
import { listAvailabilityOptions } from '@/api/@tanstack/react-query.gen.ts';
import { LoadError, Loading } from '@/components/LoadState.tsx';
import type { WindowDay } from '@/lib/schedule.ts';
import { cn } from '@/lib/utils.ts';

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

// Календарь окна записи: недели с понедельника, у каждого дня — число свободных слотов с сервера.
// Выходные, дни без слотов и дни, пока счётчики не загрузились, неактивны.
export function AvailabilityCalendar({
  eventTypeId,
  days,
  selected,
  onSelect,
}: {
  eventTypeId: string;
  days: WindowDay[];
  selected: string | undefined;
  onSelect: (date: string) => void;
}) {
  const availability = useQuery(
    listAvailabilityOptions({
      path: { id: eventTypeId },
      query: { from: days[0].date, to: days[days.length - 1].date },
    }),
  );
  const freeSlots = new Map(availability.data?.map((day) => [day.date, day.freeSlots]));

  return (
    <section aria-labelledby="choose-day" className="flex min-w-0 flex-col gap-4">
      <h2 id="choose-day" className="text-xl font-semibold">
        Выберите день
      </h2>
      {availability.isPending ? (
        <Loading className="text-sm">Загружаем дни…</Loading>
      ) : availability.isError ? (
        <LoadError
          message="Не удалось загрузить календарь"
          onRetry={() => void availability.refetch()}
        />
      ) : null}
      <div aria-hidden="true" className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="text-muted-foreground">
            {weekday}
          </span>
        ))}
      </div>
      <ul aria-label="Дни" className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          const count = freeSlots.get(day.date);
          const disabled = day.weekend || !count;
          const isSelected = day.date === selected;
          return (
            <li
              key={day.date}
              // Первый день встаёт в колонку своего дня недели.
              style={index === 0 ? { gridColumnStart: day.weekday + 1 } : undefined}
            >
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={count === undefined ? day.label : `${day.label} — свободно ${count}`}
                onClick={() => onSelect(day.date)}
                className={cn(
                  'flex aspect-square min-h-11 w-full min-w-11 flex-col items-center justify-center rounded-lg border text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40',
                  isSelected &&
                    'border-primary bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                <span className="font-medium">{day.dayOfMonth}</span>
                <span
                  className={cn('text-xs', isSelected ? 'opacity-90' : 'text-muted-foreground')}
                >
                  {count ?? '·'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
