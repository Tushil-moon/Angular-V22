/**
 * AbortSignal helpers for Angular resource() loaders
 */

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}
