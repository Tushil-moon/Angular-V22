import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { guestGuard } from '@guards/guest.guard';
import { mustChangePasswordGuard } from '@guards/must-change-password.guard';
import { permissionGuard } from '@guards/permission.guard';
import { Permissions } from '@shared/constants/permissions';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full',
    },
    {
        path: 'auth',
        loadComponent: () =>
            import('@shared/layouts/auth-layout.component').then((m) => m.AuthLayoutComponent),
        canActivate: [guestGuard],
        children: [
            {
                path: 'signin',
                loadComponent: () =>
                    import('@features/auth/signin.component').then((m) => m.SignInComponent),
            },
            {
                path: 'signup',
                loadComponent: () =>
                    import('@features/auth/signup.component').then((m) => m.SignUpComponent),
            },
            {
                path: 'forgot-password',
                loadComponent: () =>
                    import('@features/auth/forgot-password.component').then(
                        (m) => m.ForgotPasswordComponent,
                    ),
            },
            {
                path: 'reset-password',
                loadComponent: () =>
                    import('@features/auth/reset-password.component').then(
                        (m) => m.ResetPasswordComponent,
                    ),
            },
            {
                path: 'verify-email',
                loadComponent: () =>
                    import('@features/auth/verify-email.component').then(
                        (m) => m.VerifyEmailComponent,
                    ),
            },
            { path: '', redirectTo: 'signin', pathMatch: 'full' },
        ],
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('@shared/layouts/admin-layout.component').then((m) => m.AdminLayoutComponent),
        canActivate: [authGuard, mustChangePasswordGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('@features/dashboard/home.component').then(
                        (m) => m.DashboardHomeComponent,
                    ),
            },
            {
                path: 'settings',
                loadComponent: () =>
                    import('@features/settings/settings.component').then(
                        (m) => m.SettingsComponent,
                    ),
            },
            {
                path: 'products',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadProducts] },
                loadComponent: () =>
                    import('@features/products/pages/product-list.component').then(
                        (m) => m.ProductListComponent,
                    ),
            },
            {
                path: 'products/new',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ManageProducts] },
                loadComponent: () =>
                    import('@features/products/pages/product-form.component').then(
                        (m) => m.ProductFormComponent,
                    ),
            },
            {
                path: 'products/:id',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadProducts, Permissions.ManageProducts] },
                loadComponent: () =>
                    import('@features/products/pages/product-form.component').then(
                        (m) => m.ProductFormComponent,
                    ),
            },
            {
                path: 'categories',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCategories] },
                loadComponent: () =>
                    import('@features/categories/pages/category-list.component').then(
                        (m) => m.CategoryListComponent,
                    ),
            },
            {
                path: 'categories/new',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ManageCategories] },
                loadComponent: () =>
                    import('@features/categories/pages/category-form.component').then(
                        (m) => m.CategoryFormComponent,
                    ),
            },
            {
                path: 'categories/:id',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCategories, Permissions.ManageCategories] },
                loadComponent: () =>
                    import('@features/categories/pages/category-form.component').then(
                        (m) => m.CategoryFormComponent,
                    ),
            },
            {
                path: 'brands',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadBrands] },
                loadComponent: () =>
                    import('@features/brands/pages/brand-list.component').then(
                        (m) => m.BrandListComponent,
                    ),
            },
            {
                path: 'brands/new',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ManageBrands] },
                loadComponent: () =>
                    import('@features/brands/pages/brand-form.component').then(
                        (m) => m.BrandFormComponent,
                    ),
            },
            {
                path: 'brands/:id',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadBrands, Permissions.ManageBrands] },
                loadComponent: () =>
                    import('@features/brands/pages/brand-form.component').then(
                        (m) => m.BrandFormComponent,
                    ),
            },
            {
                path: 'collections',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCollections] },
                loadComponent: () =>
                    import('@features/collections/pages/collection-list.component').then(
                        (m) => m.CollectionListComponent,
                    ),
            },
            {
                path: 'collections/new',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ManageCollections] },
                loadComponent: () =>
                    import('@features/collections/pages/collection-form-launcher.component').then(
                        (m) => m.CollectionFormLauncherComponent,
                    ),
            },
            {
                path: 'collections/:id',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ManageCollections] },
                loadComponent: () =>
                    import('@features/collections/pages/collection-form.component').then(
                        (m) => m.CollectionFormComponent,
                    ),
            },
            {
                path: 'orders',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadOrders] },
                loadComponent: () =>
                    import('@features/orders/pages/order-list.component').then(
                        (m) => m.OrderListComponent,
                    ),
            },
            {
                path: 'orders/:id',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadOrders, Permissions.ManageOrders] },
                loadComponent: () =>
                    import('@features/orders/pages/order-detail.component').then(
                        (m) => m.OrderDetailComponent,
                    ),
            },
            {
                path: 'payments',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadPayments] },
                loadComponent: () =>
                    import('@features/payments/pages/payment-list.component').then(
                        (m) => m.PaymentListComponent,
                    ),
            },
            {
                path: 'refunds',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadRefunds] },
                loadComponent: () =>
                    import('@features/refunds/pages/refund-list.component').then(
                        (m) => m.RefundListComponent,
                    ),
            },
            {
                path: 'customers',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCustomers] },
                loadComponent: () =>
                    import('@features/customers/pages/customer-list.component').then(
                        (m) => m.CustomerListComponent,
                    ),
            },
            {
                path: 'customers/:id',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCustomers, Permissions.ManageCustomers] },
                loadComponent: () =>
                    import('@features/customers/pages/customer-detail.component').then(
                        (m) => m.CustomerDetailComponent,
                    ),
            },
            {
                path: 'inventory',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadInventory] },
                loadComponent: () =>
                    import('@features/inventory/pages/inventory-list.component').then(
                        (m) => m.InventoryListComponent,
                    ),
            },
            {
                path: 'warehouses',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadWarehouses] },
                loadComponent: () =>
                    import('@features/warehouses/pages/warehouse-list.component').then(
                        (m) => m.WarehouseListComponent,
                    ),
            },
            {
                path: 'suppliers',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadSuppliers] },
                loadComponent: () =>
                    import('@features/suppliers/pages/supplier-list.component').then(
                        (m) => m.SupplierListComponent,
                    ),
            },
            {
                path: 'purchase-orders',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadPurchaseOrders] },
                loadComponent: () =>
                    import('@features/purchase-orders/pages/purchase-order-list.component').then(
                        (m) => m.PurchaseOrderListComponent,
                    ),
            },
            {
                path: 'promotions',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadPromotions] },
                loadComponent: () =>
                    import('@features/promotions/pages/promotion-list.component').then(
                        (m) => m.PromotionListComponent,
                    ),
            },
            {
                path: 'coupons',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCoupons] },
                loadComponent: () =>
                    import('@features/coupons/pages/coupon-list.component').then(
                        (m) => m.CouponListComponent,
                    ),
            },
            {
                path: 'gift-cards',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadGiftCards] },
                loadComponent: () =>
                    import('@features/gift-cards/pages/gift-card-list.component').then(
                        (m) => m.GiftCardListComponent,
                    ),
            },
            {
                path: 'reviews',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadReviews] },
                loadComponent: () =>
                    import('@features/reviews/pages/review-list.component').then(
                        (m) => m.ReviewListComponent,
                    ),
            },
            {
                path: 'cms/pages',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCms] },
                loadComponent: () =>
                    import('@features/cms/pages/cms-pages-list.component').then(
                        (m) => m.CmsPagesListComponent,
                    ),
            },
            {
                path: 'cms/banners',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCms] },
                loadComponent: () =>
                    import('@features/cms/pages/cms-banners-list.component').then(
                        (m) => m.CmsBannersListComponent,
                    ),
            },
            {
                path: 'cms/menus',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadCms] },
                loadComponent: () =>
                    import('@features/cms/pages/cms-menus-list.component').then(
                        (m) => m.CmsMenusListComponent,
                    ),
            },
            {
                path: 'media',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadMedia] },
                loadComponent: () =>
                    import('@features/media/pages/media-list.component').then(
                        (m) => m.MediaListComponent,
                    ),
            },
            {
                path: 'analytics',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadAnalytics] },
                loadComponent: () =>
                    import('@features/analytics/analytics-page.component').then(
                        (m) => m.AnalyticsPageComponent,
                    ),
            },
            {
                path: 'reports',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadReports] },
                loadComponent: () =>
                    import('@features/reports/pages/report-list.component').then(
                        (m) => m.ReportListComponent,
                    ),
            },
            {
                path: 'notifications',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadNotifications] },
                loadComponent: () =>
                    import('@features/notifications/pages/notification-list.component').then(
                        (m) => m.NotificationListComponent,
                    ),
            },
            {
                path: 'users',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadUsers] },
                loadComponent: () =>
                    import('@features/users/pages/user-list.component').then(
                        (m) => m.UserListComponent,
                    ),
            },
            {
                path: 'roles',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadRoles] },
                loadComponent: () =>
                    import('@features/roles/pages/role-list.component').then(
                        (m) => m.RoleListComponent,
                    ),
            },
            {
                path: 'audit-logs',
                canActivate: [permissionGuard],
                data: { permissions: [Permissions.ReadAuditLogs] },
                loadComponent: () =>
                    import('@features/audit-logs/pages/audit-log-list.component').then(
                        (m) => m.AuditLogListComponent,
                    ),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '/dashboard',
    },
];
