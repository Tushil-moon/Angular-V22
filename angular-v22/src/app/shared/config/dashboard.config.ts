import type { IconName } from '@shared/icons';
import type { DashboardStats } from '@utils/api-mappers';

export interface StatCard {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
}

export interface QuickLink {
  label: string;
  icon: IconName;
  route?: string;
  action?: 'toast';
}

export const QUICK_LINKS: QuickLink[] = [
  { label: 'Manage users', icon: 'users', route: '/dashboard/users' },
  { label: 'Roles & permissions', icon: 'shield', route: '/dashboard/roles' },
  { label: 'Account settings', icon: 'settings', route: '/dashboard/settings' },
];

export const STATS_SKELETON_COUNT = 4;
export const ACTIVITY_SKELETON_COUNT = 4;

export function mapDashboardStats(data: DashboardStats): StatCard[] {
  return [
    {
      label: 'Total Users',
      value: data.totalUsers.toLocaleString(),
      detail: 'Registered accounts',
      icon: 'users',
    },
    {
      label: 'Active Sessions',
      value: data.activeSessions.toLocaleString(),
      detail: 'Currently active',
      icon: 'activity',
    },
    {
      label: 'Total Roles',
      value: data.totalRoles.toLocaleString(),
      detail: 'Defined in system',
      icon: 'shield',
    },
    {
      label: 'System Health',
      value: `${data.systemHealth}%`,
      detail: data.systemHealth === 100 ? 'All systems operational' : 'Database unavailable',
      icon: 'layout-dashboard',
    },
  ];
}
