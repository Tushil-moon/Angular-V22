import type { FlexTableColumn } from '@shared/components/flex-table.types';
import type { ActivityType } from '@models/index';
import { ACTIVITY_TYPE_LABELS } from '@models/index';

export const ACTIVITY_TABLE_COLUMNS: FlexTableColumn[] = [
  {
    key: 'subject',
    label: 'Subject',
    grid: 'minmax(10rem, 1.4fr)',
    skeletonClass: 'h-4 w-full max-w-[10rem]',
  },
  {
    key: 'type',
    label: 'Type',
    grid: 'minmax(5rem, 0.7fr)',
    skeletonClass: 'h-5 w-16 rounded-full',
  },
  {
    key: 'contact',
    label: 'Contact',
    grid: 'minmax(8rem, 1fr)',
    hideBelow: 'md',
    skeletonClass: 'h-4 w-24',
  },
  {
    key: 'deal',
    label: 'Deal',
    grid: 'minmax(8rem, 1fr)',
    hideBelow: 'lg',
    skeletonClass: 'h-4 w-24',
  },
  {
    key: 'dueAt',
    label: 'Due',
    grid: 'minmax(6rem, 0.8fr)',
    skeletonClass: 'h-4 w-20',
  },
  {
    key: 'createdAt',
    label: 'Logged',
    grid: 'minmax(6rem, 0.8fr)',
    hideBelow: 'md',
    skeletonClass: 'h-4 w-20',
  },
];

export const formatActivityType = (type: ActivityType): string =>
  ACTIVITY_TYPE_LABELS[type] ?? type;

export const formatActivityDate = (date: Date | null | undefined): string =>
  date
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
