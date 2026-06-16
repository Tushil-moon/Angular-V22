import type { FlexTableColumn } from '@shared/components/flex-table.types';
import type { ContactStatus } from '@models/index';
import { CONTACT_STATUS_LABELS } from '@models/index';

export const CONTACT_TABLE_COLUMNS: FlexTableColumn[] = [
  {
    key: 'name',
    label: 'Name',
    grid: 'minmax(10rem, 1.4fr)',
    skeletonClass: 'h-4 w-full max-w-[9rem]',
  },
  {
    key: 'company',
    label: 'Company',
    grid: 'minmax(8rem, 1.2fr)',
    hideBelow: 'md',
    skeletonClass: 'h-4 w-full max-w-[7rem]',
  },
  {
    key: 'email',
    label: 'Email',
    grid: 'minmax(10rem, 1.4fr)',
    hideBelow: 'lg',
    skeletonClass: 'h-4 w-full max-w-[9rem]',
  },
  {
    key: 'status',
    label: 'Status',
    grid: 'minmax(5.5rem, 0.75fr)',
    skeletonClass: 'h-5 w-16 rounded-full',
  },
  {
    key: 'deals',
    label: 'Deals',
    grid: 'minmax(4rem, 0.5fr)',
    hideBelow: 'md',
    skeletonClass: 'h-4 w-8',
  },
  {
    key: 'actions',
    label: 'Actions',
    align: 'right',
    grid: '5.5rem',
    skeletonClass: 'h-8 w-14 ml-auto',
  },
];

export const contactStatusBadgeClass = (status: ContactStatus): string => {
  switch (status) {
    case 'CUSTOMER':
      return 'badge badge-success';
    case 'PROSPECT':
      return 'badge badge-warning';
    case 'INACTIVE':
      return 'badge badge-danger';
    default:
      return 'badge';
  }
};

export const formatContactStatus = (status: ContactStatus): string =>
  CONTACT_STATUS_LABELS[status] ?? status;

export const formatContactDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
