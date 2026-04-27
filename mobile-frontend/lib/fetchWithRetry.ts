import { handleError } from './errorHandler';

type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  context?: string;
  silent?: boolean;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wraps an async function with exponential-backoff retry logic.
 * On final failure, routes through handleError.
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const maxRetries = opts?.maxRetries ?? 2;
  const baseDelay = opts?.baseDelayMs ?? 1000;
  const context = opts?.context ?? 'fetchWithRetry';

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await wait(baseDelay * Math.pow(2, attempt));
      }
    }
  }

  handleError(lastError, context, { silent: opts?.silent });
  throw lastError;
}
