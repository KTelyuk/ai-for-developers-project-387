import { defineConfig, devices } from '@playwright/test';

// E2E против запущенного приложения: бэкенд раздаёт собранный фронтенд.
// В CI `E2E_BASE_URL` указывает на контейнер. Локально без него Playwright сам запускает
// `node backend/src/server.ts` на порту 3100 (перед этим нужен `mise run build`) и останавливает его.
const baseURL = process.env.E2E_BASE_URL;
const localPort = 3100;

export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  // Данные общие на весь сервер (в памяти), а запись любого типа занимает время для всех типов:
  // сценарии идут по одному, иначе они отбирают друг у друга свободные слоты.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: baseURL ?? `http://127.0.0.1:${localPort}`,
    locale: 'ru-RU',
    // Трасса нужна для разбора падений в CI. Локально выключена: WebKit под Windows сохраняет
    // трассу второго контекста (сценарий с двумя гостями) по 20+ секунд.
    trace: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: baseURL
    ? undefined
    : {
        command: 'node backend/src/server.ts',
        cwd: '..',
        env: { PORT: String(localPort), NODE_ENV: 'production' },
        url: `http://127.0.0.1:${localPort}/api/health`,
        reuseExistingServer: false,
        stdout: 'ignore',
      },
});
