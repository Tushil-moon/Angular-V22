/**
 * Display formatters shared by admin feature pages.
 */

const EM_DASH = '—';

/** Prisma decimals arrive as strings over the wire. */
export function toNumber(value: number | string | null | undefined): number {
    if (value == null) return 0;
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(
    value: number | string | null | undefined,
    currencyCode = 'USD',
): string {
    if (value == null) return EM_DASH;
    const amount = toNumber(value);
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode || 'USD',
        maximumFractionDigits: 2,
    }).format(amount);
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return EM_DASH;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return EM_DASH;
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return EM_DASH;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return EM_DASH;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

/** Figma order table date — DD-MM-YYYY */
export function formatShortDate(value: string | null | undefined): string {
    if (!value) return EM_DASH;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return EM_DASH;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

export function formatDecimal(value: number | string | null | undefined): string {
    if (value == null) return EM_DASH;
    return toNumber(value).toFixed(2);
}

export function orDash(value: string | null | undefined): string {
    return value?.trim() ? value : EM_DASH;
}

export function titleCase(value: string | null | undefined): string {
    if (!value) return EM_DASH;
    return value
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/** Extracts a user-facing message from an `ApiError`-shaped rejection. */
export function apiErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    return fallback;
}
