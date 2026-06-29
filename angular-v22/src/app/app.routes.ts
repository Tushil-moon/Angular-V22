import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { guestGuard } from '@guards/guest.guard';
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
            {
                path: '',
                redirectTo: 'signin',
                pathMatch: 'full',
            },
        ],
    },
    {
        path: 'auth/accept-invite',
        canActivate: [authGuard],
        loadComponent: () =>
            import('@features/auth/accept-invite.component').then((m) => m.AcceptInviteComponent),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('@shared/layouts/admin-layout.component').then((m) => m.AdminLayoutComponent),
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('@features/dashboard/home.component').then(
                        (m) => m.DashboardHomeComponent,
                    ),
            },
            {
                path: 'contacts',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadContacts },
                loadComponent: () =>
                    import('@features/contacts/list.component').then(
                        (m) => m.ContactsListComponent,
                    ),
            },
            {
                path: 'companies',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadCompanies },
                loadComponent: () =>
                    import('@features/companies/list.component').then(
                        (m) => m.CompaniesListComponent,
                    ),
            },
            {
                path: 'deals',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/deals/list.component').then((m) => m.DealsListComponent),
            },
            {
                path: 'deals/board',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/deals/board.component').then((m) => m.DealsBoardComponent),
            },
            {
                path: 'activities',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadActivities },
                loadComponent: () =>
                    import('@features/activities/list.component').then(
                        (m) => m.ActivitiesListComponent,
                    ),
            },
            {
                path: 'notes',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadActivities },
                loadComponent: () =>
                    import('@features/sticky-notes/sticky-notes-board.component').then(
                        (m) => m.StickyNotesBoardComponent,
                    ),
            },
            {
                path: 'tags',
                canActivate: [permissionGuard],
                data: { permission: [Permissions.ReadContacts, Permissions.ReadDeals] },
                loadComponent: () =>
                    import('@features/tags/list.component').then((m) => m.TagsListComponent),
            },
            {
                path: 'users',
                canActivate: [permissionGuard],
                data: { permission: [Permissions.ReadUsers, Permissions.ManageUsers] },
                loadComponent: () =>
                    import('@features/users/list.component').then((m) => m.UsersListComponent),
            },
            {
                path: 'roles',
                canActivate: [permissionGuard],
                data: { permission: [Permissions.ReadRoles, Permissions.ManageRoles] },
                loadComponent: () =>
                    import('@features/roles/list.component').then((m) => m.RolesListComponent),
            },
            {
                path: 'settings',
                loadComponent: () =>
                    import('@features/settings/settings.component').then(
                        (m) => m.SettingsComponent,
                    ),
            },
            {
                path: 'sales',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/workspaces/sales-workspace.component').then(
                        (m) => m.SalesWorkspaceComponent,
                    ),
            },
            {
                path: 'marketing',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/workspaces/marketing-workspace.component').then(
                        (m) => m.MarketingWorkspaceComponent,
                    ),
            },
            {
                path: 'service',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/workspaces/service-workspace.component').then(
                        (m) => m.ServiceWorkspaceComponent,
                    ),
            },
            {
                path: 'analytics',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/workspaces/analytics-workspace.component').then(
                        (m) => m.AnalyticsWorkspaceComponent,
                    ),
            },
            {
                path: 'automation',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ManageDeals },
                loadComponent: () =>
                    import('@features/workspaces/automation-workspace.component').then(
                        (m) => m.AutomationWorkspaceComponent,
                    ),
            },
            {
                path: 'apps',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/enterprise/hub.component').then(
                        (m) => m.EnterpriseHubComponent,
                    ),
            },
            {
                path: 'enterprise',
                redirectTo: 'apps',
                pathMatch: 'full',
            },
            {
                path: 'quotes',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/quotes/list.component').then((m) => m.QuotesListComponent),
            },
            {
                path: 'forecasting',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/forecasting/list.component').then(
                        (m) => m.ForecastingListComponent,
                    ),
            },
            {
                path: 'lead-scoring',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/lead-scoring/list.component').then(
                        (m) => m.LeadScoringListComponent,
                    ),
            },
            {
                path: 'calendar',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/calendar/list.component').then(
                        (m) => m.CalendarListComponent,
                    ),
            },
            {
                path: 'campaigns',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/campaigns/list.component').then(
                        (m) => m.CampaignsListComponent,
                    ),
            },
            {
                path: 'cases',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/cases/list.component').then((m) => m.CasesListComponent),
            },
            {
                path: 'knowledge',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/knowledge/list.component').then(
                        (m) => m.KnowledgeListComponent,
                    ),
            },
            {
                path: 'reports',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/reports/list.component').then(
                        (m) => m.ReportsListComponent,
                    ),
            },
            {
                path: 'report-layouts',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/report-layouts/list.component').then(
                        (m) => m.ReportLayoutsListComponent,
                    ),
            },
            {
                path: 'workflows',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ManageDeals },
                loadComponent: () =>
                    import('@features/workflows/list.component').then(
                        (m) => m.WorkflowsListComponent,
                    ),
            },
            {
                path: 'webhooks',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ManageDeals },
                loadComponent: () =>
                    import('@features/webhooks/list.component').then(
                        (m) => m.WebhooksListComponent,
                    ),
            },
            {
                path: 'ai-flags',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ManageDeals },
                loadComponent: () =>
                    import('@features/ai-flags/list.component').then(
                        (m) => m.AiFlagsListComponent,
                    ),
            },
            {
                path: 'ai-insights',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ReadDeals },
                loadComponent: () =>
                    import('@features/ai-insights/list.component').then(
                        (m) => m.AiInsightsListComponent,
                    ),
            },
            {
                path: 'api-keys',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ManageDeals },
                loadComponent: () =>
                    import('@features/api-keys/list.component').then(
                        (m) => m.ApiKeysListComponent,
                    ),
            },
            {
                path: 'custom-fields',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ManageDeals },
                loadComponent: () =>
                    import('@features/custom-fields/list.component').then(
                        (m) => m.CustomFieldsListComponent,
                    ),
            },
            {
                path: 'territories',
                canActivate: [permissionGuard],
                data: { permission: Permissions.ManageDeals },
                loadComponent: () =>
                    import('@features/territories/list.component').then(
                        (m) => m.TerritoriesListComponent,
                    ),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '/dashboard',
    },
];
