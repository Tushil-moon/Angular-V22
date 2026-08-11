/**
 * Redirects users who must change their password to Settings → Security.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { map } from 'rxjs';

export const mustChangePasswordGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.ensureSessionReady().pipe(
        map(() => {
            if (!auth.isAuthenticated()) {
                return router.createUrlTree(['/auth/signin']);
            }

            const onSettings =
                state.url.includes('/dashboard/settings') ||
                router.url.includes('/dashboard/settings');

            if (!auth.mustChangePassword() || onSettings) {
                return true;
            }

            return router.createUrlTree(['/dashboard/settings'], {
                queryParams: { tab: 'security', forcePassword: '1' },
            });
        }),
    );
};
