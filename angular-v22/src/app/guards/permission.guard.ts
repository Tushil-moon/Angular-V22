/**
 * Permission Guard — protects routes by required permission codes
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { PermissionService } from '@services/permission.service';

export const permissionGuard: CanActivateFn = async (route) => {
    const authService = inject(AuthService);
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    await authService.ensureSessionReady();

    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth/signin']);
    }

    const required = route.data['permission'];
    if (!required) return true;

    const permissions = Array.isArray(required) ? required : [required];
    if (permissionService.hasAny(...permissions)) {
        return true;
    }

    return router.createUrlTree(['/dashboard']);
};
