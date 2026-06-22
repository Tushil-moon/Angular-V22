import {
    format,
    isValid,
    parse,
    subDays,
    startOfMonth,
    endOfMonth,
    startOfDay,
    isWithinInterval,
    isBefore,
    isAfter,
} from 'date-fns';

/** Form/API date string (YYYY-MM-DD). */
export type IsoDateString = string;

export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

export interface DateRangeValue {
    from: IsoDateString;
    to: IsoDateString;
}

export const EMPTY_DATE_RANGE: DateRangeValue = { from: '', to: '' };

export function parseIsoDate(value: string | null | undefined): Date | null {
    if (!value?.trim()) return null;
    const parsed = parse(value, ISO_DATE_FORMAT, new Date());
    return isValid(parsed) ? parsed : null;
}

export function toIsoDateString(value: Date | null | undefined): IsoDateString {
    if (!value || !isValid(value)) return '';
    return format(value, ISO_DATE_FORMAT);
}

export function formatDisplayDate(value: string | null | undefined): string {
    const date = parseIsoDate(value);
    if (!date) return '';
    return format(date, 'PPP');
}

export function formatDisplayDateRange(range: DateRangeValue | null | undefined): string {
    if (!range) return '';
    const fromLabel = formatDisplayDate(range.from);
    const toLabel = formatDisplayDate(range.to);
    if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
    if (fromLabel) return fromLabel;
    return '';
}

export function normalizeDateRange(
    from: string | null | undefined,
    to: string | null | undefined,
): DateRangeValue {
    const fromDate = parseIsoDate(from);
    const toDate = parseIsoDate(to);
    if (!fromDate) return EMPTY_DATE_RANGE;
    if (!toDate) return { from: toIsoDateString(fromDate), to: '' };
    if (isBefore(toDate, fromDate)) {
        return { from: toIsoDateString(toDate), to: toIsoDateString(fromDate) };
    }
    return { from: toIsoDateString(fromDate), to: toIsoDateString(toDate) };
}

export function isCompleteDateRange(range: DateRangeValue | null | undefined): boolean {
    return !!(range?.from && range?.to);
}

export function isDateWithinRange(
    value: Date | string | null | undefined,
    range: DateRangeValue | null | undefined,
): boolean {
    if (!isCompleteDateRange(range)) return true;
    const date = value instanceof Date ? startOfDay(value) : parseIsoDate(value as string);
    const from = parseIsoDate(range!.from);
    const to = parseIsoDate(range!.to);
    if (!from || !to) return true;
    if (!date) return false;
    return isWithinInterval(date, { start: startOfDay(from), end: startOfDay(to) });
}

export function isSameIsoDate(a: string | null | undefined, b: Date): boolean {
    return toIsoDateString(parseIsoDate(a)) === toIsoDateString(b);
}

export interface DateRangePreset {
    label: string;
    getValue: () => DateRangeValue;
}

export function getDefaultDateRangePresets(): DateRangePreset[] {
    const today = startOfDay(new Date());
    return [
        {
            label: 'All time',
            getValue: () => EMPTY_DATE_RANGE,
        },
        {
            label: 'Today',
            getValue: () => ({ from: toIsoDateString(today), to: toIsoDateString(today) }),
        },
        {
            label: 'Yesterday',
            getValue: () => {
                const day = subDays(today, 1);
                return { from: toIsoDateString(day), to: toIsoDateString(day) };
            },
        },
        {
            label: 'Last 7 days',
            getValue: () => ({
                from: toIsoDateString(subDays(today, 6)),
                to: toIsoDateString(today),
            }),
        },
        {
            label: 'Last 30 days',
            getValue: () => ({
                from: toIsoDateString(subDays(today, 29)),
                to: toIsoDateString(today),
            }),
        },
        {
            label: 'This month',
            getValue: () => ({
                from: toIsoDateString(startOfMonth(today)),
                to: toIsoDateString(endOfMonth(today)),
            }),
        },
        {
            label: 'Last month',
            getValue: () => {
                const lastMonth = subDays(startOfMonth(today), 1);
                return {
                    from: toIsoDateString(startOfMonth(lastMonth)),
                    to: toIsoDateString(endOfMonth(lastMonth)),
                };
            },
        },
    ];
}

export function isDayInRangeSelection(
    date: Date,
    from: Date | null,
    to: Date | null,
): 'none' | 'start' | 'end' | 'middle' | 'single' {
    if (!from) return 'none';
    const day = startOfDay(date);
    const start = startOfDay(from);
    if (!to) {
        return isSameDay(day, start) ? 'single' : 'none';
    }
    const end = startOfDay(to);
    if (isBefore(day, start) || isAfter(day, end)) return 'none';
    if (isSameDay(day, start) && isSameDay(day, end)) return 'single';
    if (isSameDay(day, start)) return 'start';
    if (isSameDay(day, end)) return 'end';
    return 'middle';
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}
