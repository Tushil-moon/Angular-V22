import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

/**
 * Redirects users who must change their password to Settings → Security.
 */
export const mustChangePasswordGuard: CanActivateFn = async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.ensureSessionReady();

    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth/signin']);
    }

    if (!authService.mustChangePassword()) {
        return true;
    }

    if (router.url.includes('/dashboard/settings')) {
        return true;
    }

    return router.createUrlTree(['/dashboard/settings'], {
        queryParams: { tab: 'security', forcePassword: '1' },
    });
};
