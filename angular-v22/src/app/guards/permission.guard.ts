/**
 * Permission Guard — requires route data `permissions: string[]`
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '@services/permission.service';

export const permissionGuard: CanActivateFn = (route) => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);
    const required = route.data['permissions'] as string[] | undefined;

    if (!required?.length || permissionService.hasAny(...required)) {
        return true;
    }

    return router.createUrlTree(['/dashboard']);
};
