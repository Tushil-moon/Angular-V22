import { Permissions } from '@shared/constants/permissions';
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

const dealRead = Permissions.ReadDeals;
const dealManage = Permissions.ManageDeals;

/** Core CRM — daily workflow */
export const CRM_NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
    {
        label: 'Contacts',
        route: '/dashboard/contacts',
        icon: 'contact-round',
        permission: Permissions.ReadContacts,
    },
    {
        label: 'Companies',
        route: '/dashboard/companies',
        icon: 'building-2',
        permission: Permissions.ReadCompanies,
    },
    { label: 'Deals', route: '/dashboard/deals', icon: 'briefcase', permission: dealRead },
    {
        label: 'Deal board',
        route: '/dashboard/deals/board',
        icon: 'list',
        permission: dealRead,
    },
    {
        label: 'Activities',
        route: '/dashboard/activities',
        icon: 'activity',
        permission: Permissions.ReadActivities,
    },
    {
        label: 'Sticky notes',
        route: '/dashboard/notes',
        icon: 'sticky-note',
        permission: Permissions.ReadActivities,
    },
];

/** Cloud apps — workspace landing pages */
export const APPS_NAV_ITEMS: NavItem[] = [
    { label: 'Sales', route: '/dashboard/sales', icon: 'circle-dollar-sign', permission: dealRead },
    { label: 'Marketing', route: '/dashboard/marketing', icon: 'bookmark', permission: dealRead },
    { label: 'Service', route: '/dashboard/service', icon: 'alert-circle', permission: dealRead },
    {
        label: 'Analytics',
        route: '/dashboard/analytics',
        icon: 'layout-dashboard',
        permission: dealRead,
    },
    {
        label: 'Automation',
        route: '/dashboard/automation',
        icon: 'activity',
        permission: dealManage,
    },
    { label: 'All apps', route: '/dashboard/apps', icon: 'panel-left', permission: dealRead },
];

/** Admin & configuration */
export const ADMIN_NAV_ITEMS: NavItem[] = [
    {
        label: 'Tags',
        route: '/dashboard/tags',
        icon: 'tag',
        permission: [Permissions.ReadContacts, Permissions.ReadDeals],
    },
    {
        label: 'Users',
        route: '/dashboard/users',
        icon: 'users',
        permission: [Permissions.ReadUsers, Permissions.ManageUsers],
    },
    {
        label: 'Roles',
        route: '/dashboard/roles',
        icon: 'shield',
        permission: [Permissions.ReadRoles, Permissions.ManageRoles],
    },
    { label: 'Settings', route: '/dashboard/settings', icon: 'settings' },
];

export const SIDEBAR_NAV_GROUPS: NavGroup[] = [
    { label: 'CRM', items: CRM_NAV_ITEMS },
    { label: 'Apps', items: APPS_NAV_ITEMS },
    { label: 'Admin', items: ADMIN_NAV_ITEMS },
];

/** @deprecated Use SIDEBAR_NAV_GROUPS */
export const PLATFORM_NAV_ITEMS = CRM_NAV_ITEMS;

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
    { label: 'All apps', route: '/dashboard/apps', icon: 'panel-left' },
    { label: 'Settings', route: '/dashboard/settings', icon: 'settings' },
    { label: 'Log out', icon: 'log-out', destructive: true, action: 'logout' },
];

export const PAGE_TITLES: Record<string, string> = {
    contacts: 'Contacts',
    companies: 'Companies',
    deals: 'Deals',
    activities: 'Activities',
    notes: 'Sticky notes',
    tags: 'Tags',
    users: 'Users',
    roles: 'Roles & Permissions',
    settings: 'Settings',
    apps: 'App launcher',
    sales: 'Sales Cloud',
    marketing: 'Marketing Cloud',
    service: 'Service Cloud',
    analytics: 'Analytics',
    automation: 'Automation',
    quotes: 'Quotes',
    forecasting: 'Forecasting',
    'lead-scoring': 'Lead scoring',
    calendar: 'Calendar',
    campaigns: 'Campaigns',
    cases: 'Cases',
    knowledge: 'Knowledge base',
    reports: 'Reports',
    'report-layouts': 'Dashboard layouts',
    workflows: 'Workflows',
    webhooks: 'Webhooks',
    'ai-flags': 'AI feature flags',
    'ai-insights': 'AI insights',
    'api-keys': 'API keys',
    'custom-fields': 'Custom fields',
    territories: 'Territories',
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
