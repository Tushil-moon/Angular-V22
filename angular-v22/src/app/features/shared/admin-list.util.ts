/**
 * Shared helpers for admin list features — status tabs, slug/code derivation and
 * re-exports of the query-param, formatting and dialog utilities.
 */

import type { FilterOptions, PaginatedResponse } from '@models/index';
import type { BadgeVariant } from '@shared/components';
import { catchError, map, type Observable, of } from 'rxjs';

export {
    apiErrorMessage,
    formatDate,
    formatDateTime,
    formatMoney,
    orDash,
    titleCase,
    toNumber,
} from './format.util';
export { buildListParams, type ListQueryParams, readFilter } from './list-params.util';
export { openNameSlugDialog } from './name-slug-dialog.util';

export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Catalog status shared by categories, brands and collections. */
export type CatalogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const CATALOG_STATUS_TABS = [
    { label: 'All', value: 'ALL' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Archived', value: 'ARCHIVED' },
];

export function optionalString(value: string | number | boolean | undefined): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
}

export function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/** Uppercase alphanumeric code derived from a name, used when the API requires a code. */
export function codify(value: string, maxLength = 20): string {
    return (
        value
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, maxLength) || `CODE-${Date.now()}`
    );
}

export function catalogStatusVariant(status: CatalogStatus | string): BadgeVariant {
    switch (status) {
        case 'PUBLISHED':
        case 'ACTIVE':
        case 'APPROVED':
        case 'COMPLETED':
        case 'CAPTURED':
        case 'RECEIVED':
            return 'success';
        case 'ARCHIVED':
        case 'INACTIVE':
        case 'CANCELLED':
            return 'secondary';
        case 'REJECTED':
        case 'FAILED':
        case 'EXPIRED':
        case 'BLOCKED':
            return 'destructive';
        case 'PENDING':
        case 'FLAGGED':
        case 'REQUESTED':
            return 'warning';
        default:
            return 'outline';
    }
}

export function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / Math.pow(1024, exponent);
    return `${exponent === 0 ? size : size.toFixed(1)} ${units[exponent]}`;
}

/** Page-size-1 total count helper for Figma-style KPI strips. */
export function listTotalCount(
    listFn: (filters: FilterOptions) => Observable<PaginatedResponse<unknown>>,
    status?: string,
): Observable<number> {
    const filters: FilterOptions = { page: 1, pageSize: 1 };
    if (status) filters['status'] = status;
    return listFn(filters).pipe(
        map((result) => result.total),
        catchError(() => of(0)),
    );
}

/** Count with an arbitrary extra filter (e.g. enabled=true). */
export function listFilteredCount(
    listFn: (filters: FilterOptions) => Observable<PaginatedResponse<unknown>>,
    extra: FilterOptions = {},
): Observable<number> {
    return listFn({ page: 1, pageSize: 1, ...extra }).pipe(
        map((result) => result.total),
        catchError(() => of(0)),
    );
}

/** Shared status tabs for Active / Inactive style entities. */
export const ACTIVE_STATUS_TABS = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
];

export const COUPON_STATUS_TABS = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Expired', value: 'EXPIRED' },
];
