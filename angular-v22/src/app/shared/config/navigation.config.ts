import type { IconName } from '@shared/icons';
import { Permissions } from '@shared/constants/permissions';

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

export const SIDEBAR_NAV_GROUPS: NavGroup[] = [
    {
        label: 'Overview',
        items: [{ label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' }],
    },
    {
        label: 'Catalog',
        items: [
            {
                label: 'Products',
                route: '/dashboard/products',
                icon: 'package',
                permission: Permissions.ReadProducts,
            },
            {
                label: 'Categories',
                route: '/dashboard/categories',
                icon: 'folder-open',
                permission: Permissions.ReadCategories,
            },
            {
                label: 'Brands',
                route: '/dashboard/brands',
                icon: 'tags',
                permission: Permissions.ReadBrands,
            },
            {
                label: 'Collections',
                route: '/dashboard/collections',
                icon: 'layers',
                permission: Permissions.ReadCollections,
            },
        ],
    },
    {
        label: 'Sales',
        items: [
            {
                label: 'Orders',
                route: '/dashboard/orders',
                icon: 'shopping-cart',
                permission: Permissions.ReadOrders,
            },
            {
                label: 'Transactions',
                route: '/dashboard/payments',
                icon: 'credit-card',
                permission: Permissions.ReadPayments,
            },
            {
                label: 'Refunds',
                route: '/dashboard/refunds',
                icon: 'undo-2',
                permission: Permissions.ReadRefunds,
            },
        ],
    },
    {
        label: 'Customers',
        items: [
            {
                label: 'Customers',
                route: '/dashboard/customers',
                icon: 'users',
                permission: Permissions.ReadCustomers,
            },
        ],
    },
    {
        label: 'Inventory',
        items: [
            {
                label: 'Inventory',
                route: '/dashboard/inventory',
                icon: 'boxes',
                permission: Permissions.ReadInventory,
            },
            {
                label: 'Warehouses',
                route: '/dashboard/warehouses',
                icon: 'warehouse',
                permission: Permissions.ReadWarehouses,
            },
            {
                label: 'Suppliers',
                route: '/dashboard/suppliers',
                icon: 'truck',
                permission: Permissions.ReadSuppliers,
            },
            {
                label: 'Purchase Orders',
                route: '/dashboard/purchase-orders',
                icon: 'clipboard-list',
                permission: Permissions.ReadPurchaseOrders,
            },
        ],
    },
    {
        label: 'Marketing',
        items: [
            {
                label: 'Promotions',
                route: '/dashboard/promotions',
                icon: 'megaphone',
                permission: Permissions.ReadPromotions,
            },
            {
                label: 'Coupons',
                route: '/dashboard/coupons',
                icon: 'ticket',
                permission: Permissions.ReadCoupons,
            },
            {
                label: 'Gift Cards',
                route: '/dashboard/gift-cards',
                icon: 'gift',
                permission: Permissions.ReadGiftCards,
            },
        ],
    },
    {
        label: 'Reviews',
        items: [
            {
                label: 'Reviews',
                route: '/dashboard/reviews',
                icon: 'star',
                permission: Permissions.ReadReviews,
            },
        ],
    },
    {
        label: 'CMS',
        items: [
            {
                label: 'Pages',
                route: '/dashboard/cms/pages',
                icon: 'file-text',
                permission: Permissions.ReadCms,
            },
            {
                label: 'Banners',
                route: '/dashboard/cms/banners',
                icon: 'panel-top',
                permission: Permissions.ReadCms,
            },
            {
                label: 'Menus',
                route: '/dashboard/cms/menus',
                icon: 'menu',
                permission: Permissions.ReadCms,
            },
            {
                label: 'Media',
                route: '/dashboard/media',
                icon: 'image',
                permission: Permissions.ReadMedia,
            },
        ],
    },
    {
        label: 'Insights',
        items: [
            {
                label: 'Analytics',
                route: '/dashboard/analytics',
                icon: 'chart-column',
                permission: Permissions.ReadAnalytics,
            },
            {
                label: 'Reports',
                route: '/dashboard/reports',
                icon: 'scroll-text',
                permission: Permissions.ReadReports,
            },
            {
                label: 'Notifications',
                route: '/dashboard/notifications',
                icon: 'bell',
                permission: Permissions.ReadNotifications,
            },
        ],
    },
    {
        label: 'Administration',
        items: [
            {
                label: 'Users',
                route: '/dashboard/users',
                icon: 'users',
                permission: Permissions.ReadUsers,
            },
            {
                label: 'Roles',
                route: '/dashboard/roles',
                icon: 'shield',
                permission: Permissions.ReadRoles,
            },
            {
                label: 'Audit Logs',
                route: '/dashboard/audit-logs',
                icon: 'clipboard-list',
                permission: Permissions.ReadAuditLogs,
            },
            {
                label: 'Settings',
                route: '/dashboard/settings',
                icon: 'settings',
                permission: Permissions.ManageSettings,
            },
        ],
    },
];

/** @deprecated Prefer SIDEBAR_NAV_GROUPS — kept for any residual imports */
export const CRM_NAV_ITEMS: NavItem[] = SIDEBAR_NAV_GROUPS.flatMap((group) => group.items);

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Settings', route: '/dashboard/settings', icon: 'settings' },
    { label: 'Log out', icon: 'log-out', destructive: true, action: 'logout' },
];

export const PAGE_TITLES: Record<string, string> = {
    default: 'Dashboard',
    products: 'Products',
    categories: 'Categories',
    brands: 'Brands',
    collections: 'Collections',
    orders: 'Orders',
    payments: 'Transactions',
    refunds: 'Refunds',
    customers: 'Customers',
    inventory: 'Inventory',
    warehouses: 'Warehouses',
    suppliers: 'Suppliers',
    'purchase-orders': 'Purchase Orders',
    promotions: 'Promotions',
    coupons: 'Coupons',
    'gift-cards': 'Gift Cards',
    reviews: 'Reviews',
    pages: 'Pages',
    banners: 'Banners',
    menus: 'Menus',
    media: 'Media',
    analytics: 'Analytics',
    reports: 'Reports',
    notifications: 'Notifications',
    users: 'Users',
    roles: 'Roles',
    'audit-logs': 'Audit Logs',
    settings: 'Settings',
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
