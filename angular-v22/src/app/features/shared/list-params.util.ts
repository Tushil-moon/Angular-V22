/**
 * Shared query-param builders for paginated admin list endpoints.
 */

import type { FilterOptions } from '@models/index';

export type ListQueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Backend list schemas validate `pageSize`, while the rest of the app sends the
 * snake_case `page_size`. Both keys are emitted so either contract resolves.
 */
export function buildListParams(
    filters: object = {},
    extra: ListQueryParams = {},
): ListQueryParams {
    const f = filters as Record<string, unknown>;
    const pageSize = typeof f['pageSize'] === 'number' ? f['pageSize'] : 10;
    const page = typeof f['page'] === 'number' ? f['page'] : 1;
    const searchRaw = f['search'];
    const search = typeof searchRaw === 'string' ? searchRaw.trim() : '';

    return {
        page,
        page_size: pageSize,
        pageSize,
        search: search || undefined,
        ...extra,
    };
}

/** Reads a shell-provided dynamic filter (status tabs write arbitrary keys). */
export function readFilter(filters: FilterOptions, key: string): string | undefined {
    const value = filters[key];
    return typeof value === 'string' && value ? value : undefined;
}
