import type { WorkspaceNavItem } from '@shared/components/module-workspace-shell.component';

export const SERVICE_NAV: WorkspaceNavItem[] = [
    { label: 'Overview', route: '/dashboard/service', icon: 'layout-dashboard' },
    { label: 'Case board', route: '/dashboard/cases', icon: 'alert-circle' },
    { label: 'Knowledge', route: '/dashboard/knowledge', icon: 'list' },
    { label: 'SLA & queues', route: '/dashboard/sla', icon: 'activity' },
];
