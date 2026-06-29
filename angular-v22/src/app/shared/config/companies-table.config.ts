import type { FlexTableColumn } from '@shared/components/flex-table.types';

export const COMPANY_TABLE_COLUMNS: FlexTableColumn[] = [
    {
        key: 'name',
        label: 'Company',
        grid: 'minmax(10rem, 1.5fr)',
        skeletonClass: 'h-4 w-full max-w-[10rem]',
    },
    {
        key: 'domain',
        label: 'Domain',
        grid: 'minmax(8rem, 1fr)',
        hideBelow: 'md',
        skeletonClass: 'h-4 w-24',
    },
    {
        key: 'industry',
        label: 'Industry',
        grid: 'minmax(7rem, 0.9fr)',
        hideBelow: 'lg',
        skeletonClass: 'h-4 w-20',
    },
    {
        key: 'contacts',
        label: 'Contacts',
        align: 'right',
        grid: 'minmax(5rem, 0.6fr)',
        skeletonClass: 'h-4 w-8 ml-auto',
    },
    {
        key: 'owner',
        label: 'Owner',
        grid: 'minmax(8rem, 1fr)',
        hideBelow: 'md',
        skeletonClass: 'h-4 w-24',
    },
    {
        key: 'actions',
        label: '',
        align: 'right',
        grid: '3rem',
        skeletonClass: 'h-8 w-8 ml-auto',
    },
];

export const formatCompanyDate = (date: Date | null | undefined): string =>
    date
        ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';
