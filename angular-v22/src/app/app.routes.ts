import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { guestGuard } from '@guards/guest.guard';
import { mustChangePasswordGuard } from '@guards/must-change-password.guard';

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
        ],
    },
    {
        path: '**',
        redirectTo: '/dashboard',
    },
];
