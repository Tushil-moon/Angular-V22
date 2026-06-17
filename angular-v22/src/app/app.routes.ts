import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { guestGuard } from '@guards/guest.guard';
import { permissionGuard } from '@guards/permission.guard';
import { Permissions } from '@shared/constants/permissions';
import { AuthLayoutComponent, AdminLayoutComponent } from '@shared/layouts/layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
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
          import('@features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('@features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
      {
        path: '',
        redirectTo: 'signin',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'dashboard',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@features/dashboard/home.component').then((m) => m.DashboardHomeComponent),
      },
      {
        path: 'contacts',
        canActivate: [permissionGuard],
        data: { permission: Permissions.ReadContacts },
        loadComponent: () =>
          import('@features/contacts/list.component').then((m) => m.ContactsListComponent),
      },
      {
        path: 'companies',
        canActivate: [permissionGuard],
        data: { permission: Permissions.ReadCompanies },
        loadComponent: () =>
          import('@features/companies/list.component').then((m) => m.CompaniesListComponent),
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
          import('@features/activities/list.component').then((m) => m.ActivitiesListComponent),
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
          import('@features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
