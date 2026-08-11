/**
 * Guest Guard — redirect authenticated users away from auth pages
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/index';
import { map } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.ensureSessionReady().pipe(
        map(() => (auth.isAuthenticated() ? router.parseUrl('/dashboard') : true)),
    );
};
