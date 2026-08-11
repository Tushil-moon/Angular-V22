/**
 * Normalize thrown values for Angular rxResource() streams.
 * Resource requires Error instances when rejecting; API layer throws plain ApiError objects.
 */

import type { ApiError } from '@models/index';
import { catchError, Observable, of, throwError } from 'rxjs';

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
 * Map stream failures to Error instances for rxResource(), or emit a fallback value.
 */
export function catchResourceStreamError<T>(options?: {
    fallback?: T;
    logMessage?: string;
}): (source: Observable<T>) => Observable<T> {
    return (source) =>
        source.pipe(
            catchError((error) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return throwError(() => error);
                }

                if (options?.logMessage) {
                    console.error(options.logMessage, error);
                }

                if (options && 'fallback' in options) {
                    return of(options.fallback as T);
                }

                return throwError(() => toResourceError(error));
            }),
        );
}
