/**
 * Guest Guard — redirect authenticated users away from auth pages
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@services/index';

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureSessionReady();

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/dashboard');
};
