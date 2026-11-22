import { describe, expect, it } from 'vitest';
import { createQueryClient, shouldRetry } from './query-client.ts';

describe('shouldRetry', () => {
  it('does not retry API error responses', () => {
    expect(shouldRetry(0, { code: 'NOT_FOUND', message: 'Запись не найдена' })).toBe(false);
  });

  it('retries failures without a server response up to three times', () => {
    const networkError = new TypeError('Failed to fetch');
    expect(shouldRetry(0, networkError)).toBe(true);
    expect(shouldRetry(2, networkError)).toBe(true);
    expect(shouldRetry(3, networkError)).toBe(false);
  });

  it('is the default retry policy of the app query client', () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });
});
