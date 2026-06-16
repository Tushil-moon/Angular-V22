import { User } from '@models/index';

export interface UserDetailFieldView {
  label: string;
  value: string;
  badgeClass?: string;
  type: 'text' | 'badge' | 'date';
}

export function buildUserDetailFields(user: User): UserDetailFieldView[] {
  return [
    { label: 'Phone', value: user.phone || '—', type: 'text' },
    {
      label: 'Status',
      value: user.isActive ? 'Active' : 'Inactive',
      badgeClass: user.isActive ? 'badge badge-success' : 'badge badge-danger',
      type: 'badge',
    },
    {
      label: 'Email verified',
      value: user.emailVerified ? 'Verified' : 'Pending',
      badgeClass: user.emailVerified ? 'badge badge-success' : 'badge badge-warning',
      type: 'badge',
    },
    {
      label: 'Roles',
      value: user.roles?.length ? user.roles.map((role) => role.name).join(', ') : 'User',
      type: 'text',
    },
    {
      label: 'Created',
      value: new Date(user.createdAt).toLocaleString(),
      type: 'date',
    },
    {
      label: 'Updated',
      value: new Date(user.updatedAt).toLocaleString(),
      type: 'date',
    },
  ];
}

export function getUserDisplayName(user: User): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}

export function getUserInitials(user: User): string {
  const first = user.firstName?.[0] || user.email[0] || '';
  const last = user.lastName?.[0] || '';
  return (first + last).toUpperCase();
}

export function formatUserDate(date: string | Date): string {
  return new Date(date).toLocaleDateString();
}
