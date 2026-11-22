import {
  ANNA,
  BORIS,
  bookFirstFreeSlot,
  chooseDay,
  chooseFirstSlot,
  createEventType,
  expect,
  fixClock,
  openFirstFreeDay,
  slotList,
  submitGuest,
  test,
} from './fixtures.ts';

// Сценарии из README, «Тестирование», шаг 7.

test('владелец создаёт и редактирует тип встречи', async ({ page, uniqueTitle }) => {
  const title = uniqueTitle('Знакомство');
  const edited = uniqueTitle('Консультация');

  await page.goto('/admin/event-types');
  const create = page.getByRole('region', { name: 'Новый тип встречи' });
  await create.getByLabel('Название').fill(title);
  await create.getByLabel('Описание').fill('Короткий звонок');
  await create.getByLabel('Длительность').selectOption({ label: '45 мин' });
  await create.getByRole('button', { name: 'Создать' }).click();

  const list = page.getByRole('list', { name: 'Типы встреч' });
  const item = list
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title }) });
  await expect(item).toContainText('45 мин');
  await expect(item).toContainText('Короткий звонок');

  await item.getByRole('button', { name: 'Изменить' }).click();
  const form = list
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Сохранить' }) });
  await expect(form.getByLabel('Название')).toHaveValue(title);
  await form.getByLabel('Название').fill(edited);
  await form.getByLabel('Длительность').selectOption({ label: '60 мин' });
  await form.getByRole('button', { name: 'Сохранить' }).click();

  const editedItem = list
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: edited }) });
  await expect(editedItem).toContainText('60 мин');
  await expect(list.getByRole('heading', { name: title, exact: true })).toHaveCount(0);

  // Гость видит тип уже с новыми данными.
  await page.goto('/book');
  const guestButton = page
    .getByRole('list', { name: 'Типы встреч' })
    .getByRole('button', { name: edited });
  await expect(guestButton).toContainText('60 мин');
});

test('гость записывается, и запись появляется у владельца', async ({
  page,
  request,
  uniqueTitle,
}) => {
  const { title } = await createEventType(request, uniqueTitle('Разбор'), 30);

  const { day, time, link } = await bookFirstFreeSlot(page, title, ANNA);
  expect(link).toMatch(/\/bookings\/[^/?]+\?token=/);

  await page.goto('/admin/bookings');
  const booking = page
    .getByRole('list', { name: 'Встречи' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title }) });
  await expect(booking).toContainText(ANNA.name);
  await expect(booking).toContainText(ANNA.email);
  await expect(booking).toContainText(day);
  await expect(booking).toContainText(time);
});

test('второй гость не может занять то же время', async ({
  page,
  browser,
  request,
  uniqueTitle,
}) => {
  const { title } = await createEventType(request, uniqueTitle('Созвон'), 30);

  // Второй гость в своём браузере открыл то же время раньше, чем первый записался.
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await fixClock(other);
  const day = await openFirstFreeDay(page, title);
  expect(await openFirstFreeDay(other, title)).toBe(day);
  const time = await chooseFirstSlot(other);

  expect(await chooseFirstSlot(page)).toBe(time);
  await submitGuest(page, ANNA);
  await expect(page.getByRole('region', { name: 'Вы записаны' })).toBeVisible();

  await submitGuest(other, BORIS);
  await expect(other.getByRole('alert')).toHaveText('Это время уже заняли. Выберите другое.');
  await expect(other.getByRole('region', { name: 'Вы записаны' })).toHaveCount(0);
  await expect(slotList(other)).toBeVisible();
  await expect(slotList(other).getByRole('button', { name: time, exact: true })).toHaveCount(0);

  await otherContext.close();
});

test('гость отменяет запись по ссылке, и время снова свободно', async ({
  page,
  request,
  uniqueTitle,
}) => {
  const { title } = await createEventType(request, uniqueTitle('Встреча'), 15);
  const { day, time, link } = await bookFirstFreeSlot(page, title, ANNA);

  await page.goto('/book');
  await page
    .getByRole('list', { name: 'Типы встреч' })
    .getByRole('button', { name: title })
    .click();
  await chooseDay(page, day);
  await expect(slotList(page)).toBeVisible();
  await expect(slotList(page).getByRole('button', { name: time, exact: true })).toHaveCount(0);

  await page.goto(link);
  const booking = page.getByRole('region', { name: 'Ваша запись' });
  await expect(booking).toContainText(title);
  await expect(booking).toContainText(ANNA.name);
  await booking.getByRole('button', { name: 'Отменить' }).click();
  await booking.getByRole('button', { name: 'Да, отменить' }).click();
  await expect(page.getByRole('heading', { name: 'Запись отменена' })).toBeVisible();

  await page.getByRole('link', { name: 'Записаться снова' }).click();
  await page
    .getByRole('list', { name: 'Типы встреч' })
    .getByRole('button', { name: title })
    .click();
  await chooseDay(page, day);
  await expect(slotList(page).getByRole('button', { name: time, exact: true })).toBeVisible();
});

test('гость меняет время записи по ссылке, и владелец видит новое время', async ({
  page,
  request,
  uniqueTitle,
}) => {
  const { title } = await createEventType(request, uniqueTitle('Перенос'), 15);
  const { time, link } = await bookFirstFreeSlot(page, title, ANNA);

  await page.goto(link);
  await page.getByRole('link', { name: 'Изменить' }).click();
  await expect(page.getByRole('heading', { name: 'Изменение записи' })).toBeVisible();
  // Своё прежнее время занято, поэтому первое свободное — уже другое.
  const newTime = await chooseFirstSlot(page);
  expect(newTime).not.toBe(time);
  const form = page.getByRole('form', { name: 'Ваши данные' });
  await expect(form.getByLabel('Имя')).toHaveValue(ANNA.name);
  await form.getByRole('button', { name: 'Сохранить изменения' }).click();

  const booking = page.getByRole('region', { name: 'Ваша запись' });
  await expect(booking).toContainText('Запись изменена');
  await expect(booking).toContainText(newTime);

  await page.goto('/admin/bookings');
  const item = page
    .getByRole('list', { name: 'Встречи' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title }) });
  await expect(item).toContainText(newTime);
  await expect(item).not.toContainText(`${time}–`);
});

test('владелец отменяет запись из своего списка', async ({ page, request, uniqueTitle }) => {
  const { title } = await createEventType(request, uniqueTitle('Интервью'), 45);
  const { link } = await bookFirstFreeSlot(page, title, BORIS);

  await page.goto('/admin/bookings');
  const booking = page
    .getByRole('list', { name: 'Встречи' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title }) });
  await booking.getByRole('button', { name: 'Отменить' }).click();
  await expect(booking).toContainText('Отменить встречу?');
  await booking.getByRole('button', { name: 'Да, отменить' }).click();
  await expect(booking).toHaveCount(0);

  // Ссылка гостя больше не ведёт на запись.
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'Запись не найдена' })).toBeVisible();
});

test('в гостевом интерфейсе нет ссылок на /admin', async ({ page, request, uniqueTitle }) => {
  const { title } = await createEventType(request, uniqueTitle('Звонок'), 30);

  async function expectNoAdminLinks() {
    const hrefs = await page
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    expect(hrefs.filter((href) => href.includes('/admin'))).toEqual([]);
  }

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Записаться' })).toBeVisible();
  await expectNoAdminLinks();

  await page.getByRole('link', { name: 'Записаться' }).click();
  await expect(page.getByRole('list', { name: 'Типы встреч' })).toBeVisible();
  await expectNoAdminLinks();

  await openFirstFreeDay(page, title);
  await expect(slotList(page)).toBeVisible();
  await expectNoAdminLinks();

  await chooseFirstSlot(page);
  await expect(page.getByRole('form', { name: 'Ваши данные' })).toBeVisible();
  await expectNoAdminLinks();

  await submitGuest(page, ANNA);
  const link = await page
    .getByRole('region', { name: 'Вы записаны' })
    .getByLabel('Ссылка на запись')
    .inputValue();
  await expectNoAdminLinks();

  await page.goto(link);
  await expect(page.getByRole('region', { name: 'Ваша запись' })).toBeVisible();
  await expectNoAdminLinks();
});
