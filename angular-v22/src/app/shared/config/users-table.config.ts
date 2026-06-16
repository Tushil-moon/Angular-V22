import type { FlexTableColumn } from '@shared/components/flex-table.types';

export type UserTableColumn = FlexTableColumn;

export const USER_TABLE_COLUMNS: UserTableColumn[] = [
  {
    key: 'email',
    label: 'Email',
    grid: 'minmax(10rem, 1.6fr)',
    skeletonClass: 'h-4 w-full max-w-[9rem]',
  },
  {
    key: 'phone',
    label: 'Phone',
    grid: 'minmax(7rem, 1fr)',
    hideBelow: 'md',
    skeletonClass: 'h-4 w-full max-w-[5rem]',
  },
  {
    key: 'status',
    label: 'Status',
    grid: 'minmax(5.5rem, 0.75fr)',
    hideBelow: 'lg',
    skeletonClass: 'h-5 w-14 rounded-full',
  },
  {
    key: 'verified',
    label: 'Verified',
    grid: 'minmax(5.5rem, 0.75fr)',
    hideBelow: 'lg',
    skeletonClass: 'h-5 w-16 rounded-full',
  },
  {
    key: 'createdAt',
    label: 'Created',
    grid: 'minmax(6.5rem, 0.9fr)',
    hideBelow: 'md',
    skeletonClass: 'h-4 w-full max-w-[4.5rem]',
  },
  {
    key: 'actions',
    label: 'Actions',
    align: 'right',
    grid: '5.5rem',
    skeletonClass: 'h-8 w-14 ml-auto',
  },
];

export interface UserDetailField {
  key: string;
  label: string;
  type: 'text' | 'badge' | 'date';
}

export const USER_DETAIL_FIELDS: UserDetailField[] = [
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'emailVerified', label: 'Email verified', type: 'badge' },
  { key: 'roles', label: 'Roles', type: 'text' },
  { key: 'createdAt', label: 'Created', type: 'date' },
  { key: 'updatedAt', label: 'Updated', type: 'date' },
];
