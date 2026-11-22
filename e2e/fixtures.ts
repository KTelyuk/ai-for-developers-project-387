import { type APIRequestContext, type Page, test as base, expect } from '@playwright/test';

// Часы браузера фиксируются на момент начала теста: окно из 14 дней на странице не сдвинется
// посреди сценария. Сервер живёт по настоящим часам, а его данные в памяти общие для всех тестов,
// поэтому сценарии не опираются на конкретную дату: каждый создаёт свой тип встречи с уникальным
// названием и берёт первый свободный день и время, которые показывает интерфейс.
export async function fixClock(page: Page) {
  await page.clock.setFixedTime(new Date());
}

export const test = base.extend<{ uniqueTitle: (label: string) => string }>({
  page: async ({ page }, use) => {
    await fixClock(page);
    await use(page);
  },
  // oxlint-disable-next-line no-empty-pattern -- Playwright требует деструктуризацию фикстур
  uniqueTitle: async ({}, use, testInfo) => {
    await use((label) => `${label} ${testInfo.project.name} ${Date.now().toString(36)}`);
  },
});

export { expect };

export type Guest = { name: string; email: string };

export const ANNA: Guest = { name: 'Анна Петрова', email: 'anna@example.com' };
export const BORIS: Guest = { name: 'Борис Иванов', email: 'boris@example.com' };

// Подготовка данных через API владельца — сам сценарий создания проверяется отдельно, в UI.
export async function createEventType(
  request: APIRequestContext,
  title: string,
  durationMinutes: 15 | 30 | 45 | 60 = 30,
) {
  const response = await request.post('/api/admin/event-types', {
    data: { title, description: 'Создано e2e-тестом', durationMinutes },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string; title: string };
}

// Гость открывает бронирование, выбирает тип и первый день со свободным временем.
// Возвращает подпись дня (`пн, 16 ноября`), чтобы потом найти этот же день снова.
export async function openFirstFreeDay(page: Page, title: string) {
  await page.goto('/book');
  await page
    .getByRole('list', { name: 'Типы встреч' })
    .getByRole('button', { name: title })
    .click();
  const day = page
    .getByRole('list', { name: 'Дни' })
    .getByRole('button', { name: /свободно \d+/, disabled: false })
    .first();
  const label = ((await day.getAttribute('aria-label')) ?? '').split(' — ')[0];
  await day.click();
  return label;
}

export function slotList(page: Page) {
  return page.getByRole('list', { name: 'Свободное время' });
}

// Гость выбирает день `dayLabel` в уже открытом календаре.
export async function chooseDay(page: Page, dayLabel: string) {
  await page
    .getByRole('list', { name: 'Дни' })
    .getByRole('button', { name: new RegExp(`^${dayLabel}( |$)`) })
    .click();
}

// Гость берёт первое свободное время дня и открывает форму. Возвращает время (`09:00`).
export async function chooseFirstSlot(page: Page) {
  const slot = slotList(page).getByRole('button').first();
  const time = (await slot.textContent())?.trim() ?? '';
  await slot.click();
  return time;
}

export async function submitGuest(page: Page, guest: Guest) {
  const form = page.getByRole('form', { name: 'Ваши данные' });
  await form.getByLabel('Имя').fill(guest.name);
  await form.getByLabel('Email').fill(guest.email);
  await form.getByRole('button', { name: 'Записаться' }).click();
}

// Полная запись гостя на первое свободное время. Возвращает день, время и ссылку на запись.
export async function bookFirstFreeSlot(page: Page, title: string, guest: Guest) {
  const day = await openFirstFreeDay(page, title);
  const time = await chooseFirstSlot(page);
  await submitGuest(page, guest);
  const confirmation = page.getByRole('region', { name: 'Вы записаны' });
  await expect(confirmation).toBeVisible();
  const link = await confirmation.getByLabel('Ссылка на запись').inputValue();
  return { day, time, link };
}
