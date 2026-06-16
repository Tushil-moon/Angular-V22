const SNAKE_CASE_KEY = /[A-Z]/g;

/** Converts a camelCase or PascalCase string to snake_case. */
export const toSnakeCaseKey = (key: string): string =>
  key.replace(SNAKE_CASE_KEY, (char) => `_${char.toLowerCase()}`);

/** Recursively converts all object keys in API payloads to snake_case. */
export const toSnakeCaseDeep = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCaseDeep(item)) as T;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        toSnakeCaseKey(key),
        toSnakeCaseDeep(nested),
      ]),
    ) as T;
  }

  return value;
};
