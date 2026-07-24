/**
 * Guest Guard — redirect authenticated users away from auth pages
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/index';

export const guestGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.ensureSessionReady();
    return auth.isAuthenticated() ? router.parseUrl('/dashboard') : true;
};
