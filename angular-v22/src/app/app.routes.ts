import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { guestGuard } from '@guards/guest.guard';
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
        loadComponent: () =>
          import('@features/contacts/list.component').then((m) => m.ContactsListComponent),
      },
      {
        path: 'deals',
        loadComponent: () =>
          import('@features/deals/list.component').then((m) => m.DealsListComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('@features/users/list.component').then((m) => m.UsersListComponent),
      },
      {
        path: 'roles',
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
