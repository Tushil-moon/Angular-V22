/**
 * Normalize thrown values for Angular resource() loaders.
 * Resource requires Error instances when rejecting; axios throws plain ApiError objects.
 */

import type { ApiError } from '@models/index';

export function toResourceError(error: unknown, fallback = 'Request failed'): Error {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return error;
  }

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as ApiError).message || fallback);
    return new Error(message, { cause: error });
  }

  return new Error(fallback, { cause: error });
}

/**
 * Run an async loader and map failures to Error instances for resource().
 * Returns the fallback value instead of throwing when returnFallbackOnError is true.
 */
export async function runResourceLoader<T>(
  execute: () => Promise<T>,
  options?: {
    fallback?: T;
    logMessage?: string;
  },
): Promise<T> {
  try {
    return await execute();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    if (options?.logMessage) {
      console.error(options.logMessage, error);
    }

    if (options && 'fallback' in options) {
      return options.fallback as T;
    }

    throw toResourceError(error);
  }
}
