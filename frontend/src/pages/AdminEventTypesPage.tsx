import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ApiError, EventType } from '@/api';
import {
  createEventTypeMutation,
  getEventTypeQueryKey,
  listEventTypesOptions,
  listEventTypesQueryKey,
  updateEventTypeMutation,
} from '@/api/@tanstack/react-query.gen.ts';
import { AdminNav } from '@/components/AdminNav.tsx';
import { EventTypeForm } from '@/components/EventTypeForm.tsx';
import { LoadError, Loading } from '@/components/LoadState.tsx';
import { Button } from '@/components/ui/button.tsx';
import { formatDuration } from '@/lib/format.ts';

function errorMessage(error: unknown) {
  const message = (error as Partial<ApiError> | null)?.message;
  return typeof message === 'string' && message ? message : 'Не удалось сохранить тип встречи';
}

// Тип встречи в списке владельца: просмотр или форма редактирования на месте.
function EventTypeItem({ eventType }: { eventType: EventType }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const update = useMutation({
    ...updateEventTypeMutation(),
    // Новые данные сразу видны и в списке владельца, и у гостя.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listEventTypesQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getEventTypeQueryKey({ path: { id: eventType.id } }),
        }),
      ]),
  });

  if (editing) {
    return (
      <li className="rounded-xl border p-4">
        <EventTypeForm
          submitLabel="Сохранить"
          defaultValues={eventType}
          pending={update.isPending}
          serverError={update.isError ? errorMessage(update.error) : undefined}
          onCancel={() => {
            update.reset();
            setEditing(false);
          }}
          onSubmit={async (body) => {
            try {
              await update.mutateAsync({ path: { id: eventType.id }, body });
              setEditing(false);
              return true;
            } catch {
              return false;
            }
          }}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium break-words">{eventType.title}</h3>
        <span className="text-sm text-muted-foreground">
          {formatDuration(eventType.durationMinutes)}
        </span>
      </div>
      {eventType.description ? (
        <p className="text-sm break-words text-muted-foreground">{eventType.description}</p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="mt-2 h-11 self-start px-4"
        onClick={() => setEditing(true)}
      >
        Изменить
      </Button>
    </li>
  );
}

export function AdminEventTypesPage() {
  const queryClient = useQueryClient();
  const eventTypes = useQuery(listEventTypesOptions());
  const create = useMutation({
    ...createEventTypeMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listEventTypesQueryKey() }),
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:py-12">
      <AdminNav />
      <h1 className="text-3xl font-bold tracking-tight">Типы встреч</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="event-types-list" className="flex min-w-0 flex-col gap-4">
          <h2 id="event-types-list" className="text-xl font-semibold">
            Опубликованные
          </h2>
          {eventTypes.isPending ? (
            <Loading>Загружаем…</Loading>
          ) : eventTypes.isError ? (
            <LoadError
              message="Не удалось загрузить типы встреч"
              onRetry={() => void eventTypes.refetch()}
            />
          ) : eventTypes.data.length === 0 ? (
            <p className="text-muted-foreground">Типов встреч пока нет</p>
          ) : (
            <ul aria-label="Типы встреч" className="flex flex-col gap-3">
              {eventTypes.data.map((eventType) => (
                <EventTypeItem key={eventType.id} eventType={eventType} />
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="event-type-new" className="flex flex-col gap-4">
          <h2 id="event-type-new" className="text-xl font-semibold">
            Новый тип встречи
          </h2>
          <EventTypeForm
            submitLabel="Создать"
            pending={create.isPending}
            serverError={create.isError ? errorMessage(create.error) : undefined}
            onSubmit={async (body) => {
              try {
                await create.mutateAsync({ body });
                return true;
              } catch {
                return false;
              }
            }}
          />
        </section>
      </div>
    </div>
  );
}
