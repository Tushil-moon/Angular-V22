import type { IconName } from '@shared/icons';
import type { DashboardStats } from '@utils/api-mappers';
import { DEAL_STAGE_LABELS } from '@models/index';
import { formatDealValue } from '@shared/config/deals-table.config';

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
  { label: 'Manage contacts', icon: 'contact-round', route: '/dashboard/contacts' },
  { label: 'View pipeline', icon: 'briefcase', route: '/dashboard/deals' },
  { label: 'Manage users', icon: 'users', route: '/dashboard/users' },
  { label: 'Account settings', icon: 'settings', route: '/dashboard/settings' },
];

export const STATS_SKELETON_COUNT = 6;
export const ACTIVITY_SKELETON_COUNT = 4;

export function mapDashboardStats(data: DashboardStats): StatCard[] {
  return [
    {
      label: 'Contacts',
      value: data.totalContacts.toLocaleString(),
      detail: 'People in CRM',
      icon: 'contact-round',
    },
    {
      label: 'Open Deals',
      value: data.openDeals.toLocaleString(),
      detail: 'Active pipeline',
      icon: 'briefcase',
    },
    {
      label: 'Pipeline Value',
      value: formatDealValue(data.pipelineValue),
      detail: 'Open opportunities',
      icon: 'circle-dollar-sign',
    },
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
      label: 'System Health',
      value: `${data.systemHealth}%`,
      detail: data.systemHealth === 100 ? 'All systems operational' : 'Database unavailable',
      icon: 'layout-dashboard',
    },
  ];
}

export function formatPipelineStageLabel(stage: string): string {
  return DEAL_STAGE_LABELS[stage as keyof typeof DEAL_STAGE_LABELS] ?? stage;
}
