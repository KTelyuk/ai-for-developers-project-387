import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Call Calendar API" })
@server("/", "Same origin")
namespace CallCalendar;

// Единый формат ошибки (docs/spec.md, «Контракт API»).
union ErrorCode {
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "INVALID_TOKEN",
  "SLOT_TAKEN",
  "ALREADY_STARTED",
  "SLOT_UNAVAILABLE",
  "INTERNAL_ERROR",
}

model ApiError {
  code: ErrorCode;
  message: string;
}

@error
model ValidationError {
  @statusCode _: 400;
  ...ApiError;
}

@error
model NotFoundError {
  @statusCode _: 404;
  ...ApiError;
}

model HealthStatus {
  status: "ok";
}

@route("/api/health")
@tag("System")
interface Health {
  @get
  @operationId("getHealth")
  check(): HealthStatus;
}

// Длительность типа встречи в минутах — только из списка.
union DurationMinutes {
  15,
  30,
  45,
  60,
}

model EventType {
  @format("uuid") id: string;

  @minLength(1)
  @maxLength(100)
  title: string;

  @maxLength(500)
  description: string;

  durationMinutes: DurationMinutes;
}

// Тело создания: название обязательно, описание — нет.
model CreateEventType {
  @minLength(1)
  @maxLength(100)
  title: string;

  @maxLength(500)
  description?: string;

  durationMinutes: DurationMinutes;
}

// Тело изменения: каждое поле необязательно, неуказанные остаются прежними.
model UpdateEventType {
  @minLength(1)
  @maxLength(100)
  title?: string;

  @maxLength(500)
  description?: string;

  durationMinutes?: DurationMinutes;
}

@route("/api/event-types")
@tag("Event types")
interface EventTypes {
  @get
  @operationId("listEventTypes")
  list(): EventType[];

  @get
  @route("/{id}")
  @operationId("getEventType")
  get(@path id: string): EventType | NotFoundError;
}

// Свободный слот: моменты ISO 8601 со смещением Алматы `+05:00`.
model Slot {
  startAt: offsetDateTime;
  endAt: offsetDateTime;
}

@route("/api/event-types/{id}/slots")
@tag("Slots")
interface Slots {
  // Свободные слоты на день `YYYY-MM-DD` по Алматы. Выходной — пустой список;
  // дата вне окна записи или в неверном формате — 400.
  @get
  @operationId("listSlots")
  list(@path id: string, @query date: plainDate): Slot[] | ValidationError | NotFoundError;
}

// Число свободных слотов дня `YYYY-MM-DD` по Алматы.
model DayAvailability {
  date: plainDate;

  @minValue(0)
  freeSlots: int32;
}

@route("/api/event-types/{id}/availability")
@tag("Slots")
interface Availability {
  // Счётчики по каждому дню `from`–`to` включительно. Дни вне окна записи и выходные — 0;
  // диапазон длиннее окна записи или с концом раньше начала — 400.
  @get
  @operationId("listAvailability")
  list(
    @path id: string,
    @query from: plainDate,
    @query to: plainDate,
  ): DayAvailability[] | ValidationError | NotFoundError;
}

@error
model SlotTakenError {
  @statusCode _: 409;
  ...ApiError;
}

// Запись гостя. Токен отмены в модель не входит: он отдаётся один раз, в ответе на бронирование.
model Booking {
  @format("uuid") id: string;
  eventTypeId: string;
  guestName: string;
  guestEmail: string;

  // Предмет разговора: необязательный текст гостя, до 500 символов; у записи без него поля нет.
  subject?: string;
  startAt: offsetDateTime;
  endAt: offsetDateTime;
  createdAt: offsetDateTime;
}

// Тело брони. Email — `local@domain`, до 254 символов.
model CreateBooking {
  eventTypeId: string;
  startAt: offsetDateTime;

  // Сервер сначала обрезает пробелы по краям, затем требует 1–100 символов (400 VALIDATION_ERROR).
  // Длину схема не ограничивает: иначе 100 символов с пробелами по краям отклонились бы до обрезки.
  guestName: string;

  @maxLength(254)
  @pattern("^[^\\s@]+@[^\\s@]+$")
  guestEmail: string;

  // Предмет разговора. Сервер обрезает пробелы по краям, затем требует не более 500 символов
  // (400 VALIDATION_ERROR); пустая строка после обрезки равна отсутствию поля. Переносы строк
  // внутри сохраняются. Длину схема не ограничивает — по той же причине, что у имени.
  subject?: string;
}

// Ответ на бронирование: запись, токен отмены и ссылка на страницу записи
// `/bookings/{id}?token={token}` (путь от корня сайта).
model BookingCreated {
  booking: Booking;
  token: string;
  link: string;
}

@route("/api/bookings")
@tag("Bookings")
interface Bookings {
  // `startAt` не слот этого типа встречи (не на сетке, вне часов или окна) — 400 SLOT_UNAVAILABLE;
  // время занято — 409 SLOT_TAKEN.
  @post
  @operationId("createBooking")
  create(@body body: CreateBooking): {
    @statusCode _: 201;
    @body body: BookingCreated;
  } | ValidationError | NotFoundError | SlotTakenError;
}

@error
model InvalidTokenError {
  @statusCode _: 403;
  ...ApiError;
}

@error
model AlreadyStartedError {
  @statusCode _: 409;
  ...ApiError;
}

// 409 при изменении записи: SLOT_TAKEN или ALREADY_STARTED. Одна модель, а не две с одним
// статусом: иначе в OpenAPI получится `anyOf` из двух одинаковых схем.
@error
model BookingConflictError {
  @statusCode _: 409;
  ...ApiError;
}

// Страница записи гостя: доступ только с токеном из ссылки.
// Записи нет (в том числе уже отменённой) — 404; токен неверный — 403 INVALID_TOKEN.
@route("/api/bookings/{id}")
@tag("Bookings")
interface GuestBookings {
  @get
  @operationId("getBooking")
  get(@path id: string, @query token: string): Booking | NotFoundError | InvalidTokenError;

  // Изменение гостем: тип встречи, время, имя и email заменяются целиком, тело — как у брони; поле `subject`, не
  // переданное в теле, очищает предмет разговора.
  // Ссылка, токен и `createdAt` прежние, `endAt` — по длительности нового типа встречи.
  // Встреча уже началась — 409 ALREADY_STARTED; `startAt` не слот — 400 SLOT_UNAVAILABLE;
  // время занято другой записью — 409 SLOT_TAKEN (сама изменяемая запись время не занимает).
  @put
  @operationId("updateBooking")
  update(@path id: string, @query token: string, @body body: CreateBooking):
    | Booking
    | ValidationError
    | NotFoundError
    | InvalidTokenError
    | BookingConflictError;

  // Отмена гостем: встреча уже началась — 409 ALREADY_STARTED.
  @delete
  @operationId("cancelBooking")
  cancel(@path id: string, @query token: string): {
    @statusCode _: 204;
  } | NotFoundError | InvalidTokenError | AlreadyStartedError;
}

@route("/api/admin/event-types")
@tag("Admin")
interface AdminEventTypes {
  @post
  @operationId("createEventType")
  create(@body body: CreateEventType): {
    @statusCode _: 201;
    @body body: EventType;
  } | ValidationError;

  @patch(#{ implicitOptionality: false })
  @route("/{id}")
  @operationId("updateEventType")
  update(@path id: string, @body body: UpdateEventType):
    | EventType
    | ValidationError
    | NotFoundError;
}

// Встреча в списке владельца: запись и название её типа встречи.
model AdminBooking {
  ...Booking;
  eventTypeTitle: string;
}

@route("/api/admin/bookings")
@tag("Admin")
interface AdminBookings {
  // Ещё не закончившиеся встречи всех типов (идущие сейчас тоже) по возрастанию начала.
  @get
  @operationId("listAdminBookings")
  list(): AdminBooking[];

  // Отмена владельцем: без токена и без проверки начала встречи.
  @delete
  @route("/{id}")
  @operationId("cancelBookingByOwner")
  cancel(@path id: string): {
    @statusCode _: 204;
  } | NotFoundError;
}
