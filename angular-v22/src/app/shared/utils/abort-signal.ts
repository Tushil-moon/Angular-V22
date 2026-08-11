/**
 * AbortSignal helpers for Angular rxResource() streams
 */

export function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
}
