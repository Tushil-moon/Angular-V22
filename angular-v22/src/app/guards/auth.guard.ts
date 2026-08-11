/**
 * Authentication Guard
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/index';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.ensureSessionReady().pipe(
        map(() => (auth.isAuthenticated() ? true : router.parseUrl('/auth/signin'))),
    );
};
