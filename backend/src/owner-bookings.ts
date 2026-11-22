// Отмена записи владельцем в разделе `/admin/bookings` (docs/spec.md, «Контракт API»).

import { ApiError } from './errors.ts';
import type { Store } from './store.ts';

// Владелец отменяет без токена и без проверки начала встречи; время сразу освобождается.
// Записи нет (в том числе уже отменённой) — 404.
export function cancelOwnerBooking(store: Store, id: string): void {
  if (!store.bookings.delete(id)) {
    throw new ApiError(404, 'NOT_FOUND', 'Запись не найдена');
  }
}
