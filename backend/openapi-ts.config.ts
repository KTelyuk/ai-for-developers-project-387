import { defineConfig } from '@hey-api/openapi-ts';

// Типы бэкенда из контракта: только модели и тела запросов, без клиента.
export default defineConfig({
  input: '../openapi/openapi.yaml',
  // Бэкенд запускается из .ts без сборки: относительные импорты нужны с расширением.
  output: { path: 'src/api', importFileExtension: '.ts' },
  plugins: ['@hey-api/typescript'],
});
