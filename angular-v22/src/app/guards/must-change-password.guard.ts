/**
 * Redirects users who must change their password to Settings → Security.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

export const mustChangePasswordGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.ensureSessionReady();

    if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/auth/signin']);
    }

    if (!auth.mustChangePassword() || router.url.includes('/dashboard/settings')) {
        return true;
    }

    return router.createUrlTree(['/dashboard/settings'], {
        queryParams: { tab: 'security', forcePassword: '1' },
    });
};
