/** Shared date/currency helpers for enterprise list pages */

export const formatEnterpriseDate = (value?: string | null): string => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export const formatEnterpriseCurrency = (amount: number, currency = 'USD'): string =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

export const formatEnterpriseBool = (value: boolean): string => (value ? 'Yes' : 'No');
