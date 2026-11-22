import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: { NODE_ENV: 'test' },
    // Под нагрузкой на процессор (параллельные проверки) тест бывает дольше стандартных 5 с.
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Точка входа только слушает порт; всё остальное собирается через buildApp. Типы из контракта сгенерированы.
      exclude: ['src/server.ts', 'src/api/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        // Правила расписания, пересечений и отмены гостем и владельцем покрываются полностью
        // (docs/spec.md, «Testing Decisions»).
        'src/{schedule,overlap,guest-bookings,owner-bookings}.ts': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
});
