/**
 * Authentication Guard
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/index';

export const authGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.ensureSessionReady();
    return auth.isAuthenticated() ? true : router.parseUrl('/auth/signin');
};
