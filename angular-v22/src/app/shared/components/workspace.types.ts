import type { IconName } from '@shared/icons';

export interface WorkspaceKpi {
    label: string;
    value: string;
    detail?: string;
    icon: IconName;
    route?: string;
}

export interface WorkspaceNavItem {
    label: string;
    route: string;
    icon?: IconName;
}
