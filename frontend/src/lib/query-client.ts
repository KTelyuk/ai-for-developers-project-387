import { QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 3;

// Ответ API с ошибкой (`{ code, message }`: 404, 403, 409…) повторять бессмысленно — экран должен
// сразу показать итог. Повторяются только сбои без ответа сервера, например обрыв сети.
export function shouldRetry(failureCount: number, error: unknown) {
  const isApiError = typeof error === 'object' && error !== null && 'code' in error;
  return !isApiError && failureCount < MAX_RETRIES;
}

export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
}
