import type { IconName } from '@shared/icons';

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  disabled?: boolean;
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
  { label: 'Users', route: '/dashboard/users', icon: 'users' },
  { label: 'Roles & Permissions', route: '/dashboard/roles', icon: 'shield' },
  { label: 'Settings', route: '/dashboard/settings', icon: 'settings' },
];

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
  { label: 'Settings', route: '/dashboard/settings', icon: 'settings' },
  { label: 'Log out', icon: 'log-out', destructive: true, action: 'logout' },
];

export const PAGE_TITLES: Record<string, string> = {
  users: 'Users',
  roles: 'Roles & Permissions',
  settings: 'Settings',
  default: 'Dashboard',
};

export function resolvePageTitle(url: string): string {
  if (url.includes('/users')) return PAGE_TITLES['users'];
  if (url.includes('/roles')) return PAGE_TITLES['roles'];
  if (url.includes('/settings')) return PAGE_TITLES['settings'];
  return PAGE_TITLES['default'];
}
