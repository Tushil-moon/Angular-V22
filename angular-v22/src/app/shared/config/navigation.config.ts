import type { IconName } from '@shared/icons';

export interface NavItem {
    label: string;
    route: string;
    icon: IconName;
    disabled?: boolean;
    permission?: string | string[];
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

export interface ProfileMenuItem {
    label: string;
    route?: string;
    icon: IconName;
    destructive?: boolean;
    action?: 'logout';
}

export const CRM_NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
];

export const SIDEBAR_NAV_GROUPS: NavGroup[] = [{ label: 'Workspace', items: CRM_NAV_ITEMS }];

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Log out', icon: 'log-out', destructive: true, action: 'logout' },
];

export const PAGE_TITLES: Record<string, string> = {
    default: 'Dashboard',
};

export function resolvePageTitle(url: string): string {
    for (const [segment, title] of Object.entries(PAGE_TITLES)) {
        if (segment !== 'default' && url.includes(`/${segment}`)) return title;
    }
    return PAGE_TITLES['default'];
}

export function filterNavItemsByPermission(
    items: NavItem[],
    hasAny: (...permissions: string[]) => boolean,
): NavItem[] {
    return items.filter((item) => {
        if (!item.permission) return true;
        const required = Array.isArray(item.permission) ? item.permission : [item.permission];
        return hasAny(...required);
    });
}

export function filterNavGroupsByPermission(
    groups: NavGroup[],
    hasAny: (...permissions: string[]) => boolean,
): NavGroup[] {
    return groups
        .map((group) => ({
            ...group,
            items: filterNavItemsByPermission(group.items, hasAny),
        }))
        .filter((group) => group.items.length > 0);
}
