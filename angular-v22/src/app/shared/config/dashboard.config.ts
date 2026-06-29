import { DEAL_STAGE_LABELS } from '@models/index';
import { formatDealValue } from '@shared/config/deals-table.config';
import type { IconName } from '@shared/icons';
import type { DashboardStats } from '@utils/api-mappers';

export interface StatCard {
    label: string;
    value: string;
    detail: string;
    icon: IconName;
    route?: string;
}

export interface QuickLink {
    label: string;
    icon: IconName;
    route?: string;
    action?: 'toast';
}

export const QUICK_LINKS: QuickLink[] = [
    { label: 'Sales Cloud', icon: 'circle-dollar-sign', route: '/dashboard/sales' },
    { label: 'Service desk', icon: 'alert-circle', route: '/dashboard/cases' },
    { label: 'View pipeline', icon: 'briefcase', route: '/dashboard/deals/board' },
    { label: 'Manage contacts', icon: 'contact-round', route: '/dashboard/contacts' },
    { label: 'Calendar', icon: 'calendar', route: '/dashboard/calendar' },
    { label: 'Sticky notes', icon: 'sticky-note', route: '/dashboard/notes' },
    { label: 'All apps', icon: 'panel-left', route: '/dashboard/apps' },
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
            route: '/dashboard/contacts',
        },
        {
            label: 'Open Deals',
            value: data.openDeals.toLocaleString(),
            detail: 'Active pipeline',
            icon: 'briefcase',
            route: '/dashboard/deals',
        },
        {
            label: 'Pipeline Value',
            value: formatDealValue(data.pipelineValue),
            detail: 'Open opportunities',
            icon: 'circle-dollar-sign',
            route: '/dashboard/deals/board',
        },
        {
            label: 'Total Users',
            value: data.totalUsers.toLocaleString(),
            detail: 'Registered accounts',
            icon: 'users',
            route: '/dashboard/users',
        },
        {
            label: 'Active Sessions',
            value: data.activeSessions.toLocaleString(),
            detail: 'Currently active',
            icon: 'activity',
            route: '/dashboard/settings',
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
