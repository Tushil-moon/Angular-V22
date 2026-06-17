import type { IconName } from '@shared/icons';
import { Permissions } from '@shared/constants/permissions';

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  disabled?: boolean;
  permission?: string | string[];
}

export interface ProfileMenuItem {
  label: string;
  route?: string;
  icon: IconName;
  destructive?: boolean;
  action?: 'logout';
}

export const PLATFORM_NAV_ITEMS: NavItem[] = [
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
  {
    label: 'Deals',
    route: '/dashboard/deals',
    icon: 'briefcase',
    permission: Permissions.ReadDeals,
  },
  {
    label: 'Activities',
    route: '/dashboard/activities',
    icon: 'activity',
    permission: Permissions.ReadActivities,
  },
  {
    label: 'Users',
    route: '/dashboard/users',
    icon: 'users',
    permission: [Permissions.ReadUsers, Permissions.ManageUsers],
  },
  {
    label: 'Roles & Permissions',
    route: '/dashboard/roles',
    icon: 'shield',
    permission: [Permissions.ReadRoles, Permissions.ManageRoles],
  },
  { label: 'Settings', route: '/dashboard/settings', icon: 'settings' },
];

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
  { label: 'Settings', route: '/dashboard/settings', icon: 'settings' },
  { label: 'Log out', icon: 'log-out', destructive: true, action: 'logout' },
];

export const PAGE_TITLES: Record<string, string> = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
  activities: 'Activities',
  users: 'Users',
  roles: 'Roles & Permissions',
  settings: 'Settings',
  default: 'Dashboard',
};

export function resolvePageTitle(url: string): string {
  if (url.includes('/contacts')) return PAGE_TITLES['contacts'];
  if (url.includes('/companies')) return PAGE_TITLES['companies'];
  if (url.includes('/deals')) return PAGE_TITLES['deals'];
  if (url.includes('/activities')) return PAGE_TITLES['activities'];
  if (url.includes('/users')) return PAGE_TITLES['users'];
  if (url.includes('/roles')) return PAGE_TITLES['roles'];
  if (url.includes('/settings')) return PAGE_TITLES['settings'];
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
