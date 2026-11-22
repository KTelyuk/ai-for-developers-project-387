import { useId, useState } from 'react';
import type { BookingCreated, EventType } from '@/api';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { absoluteLink } from '@/lib/bookings.ts';
import { formatMomentDay, formatTimeRange } from '@/lib/format.ts';
import { OWNER_TIME_ZONE_LABEL } from '@/lib/schedule.ts';

// Подтверждение брони: токен приходит только здесь, поэтому ссылку нужно сохранить сразу.
export function BookingConfirmation({
  eventType,
  created,
}: {
  eventType: EventType;
  created: BookingCreated;
}) {
  const id = useId();
  const [copied, setCopied] = useState<'ok' | 'failed'>();
  const { booking } = created;
  const link = absoluteLink(created.link);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="flex max-w-xl flex-col gap-4 rounded-xl border p-5"
    >
      <h2 id={`${id}-heading`} className="text-2xl font-semibold">
        Вы записаны
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Встреча</dt>
        <dd className="break-words">{eventType.title}</dd>
        <dt className="text-muted-foreground">Дата</dt>
        <dd>{formatMomentDay(booking.startAt)}</dd>
        <dt className="text-muted-foreground">Время</dt>
        <dd>{formatTimeRange(booking.startAt, booking.endAt)}</dd>
      </dl>
      <p className="text-sm text-muted-foreground">{OWNER_TIME_ZONE_LABEL}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-link`}>Ссылка на запись</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`${id}-link`}
            readOnly
            value={link}
            className="h-11"
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button type="button" size="lg" className="h-11 px-6" onClick={copy}>
            Скопировать
          </Button>
        </div>
        <p className="text-sm font-medium">Сохраните ссылку — без неё запись не отменить</p>
        <p role="status" className="text-sm text-muted-foreground">
          {copied === 'ok'
            ? 'Ссылка скопирована'
            : copied === 'failed'
              ? 'Не удалось скопировать — выделите ссылку и скопируйте вручную'
              : null}
        </p>
      </div>
    </section>
  );
}
