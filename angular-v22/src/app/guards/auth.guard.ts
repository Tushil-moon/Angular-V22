/**
 * Authentication Guard
 * Protects routes that require authentication
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@services/index';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureSessionReady();

  if (authService.isAuthenticated()) {
    return true;
  }

  const restored = await authService.tryRestoreSession();
  if (restored) {
    return true;
  }

  return router.parseUrl('/auth/signin');
};
