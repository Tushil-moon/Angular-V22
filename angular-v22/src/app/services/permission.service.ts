/**
 * Permission Service — RBAC checks for UI and route guards
 */

import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { hasAnyPermission, hasPermission } from '@shared/constants/permissions';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private readonly authService = inject(AuthService);

  readonly permissions = computed(() => this.authService.currentUser()?.permissions ?? []);
  readonly roles = computed(() => this.authService.currentUser()?.roles?.map((role) => role.name) ?? []);

  hasPermission(required: string): boolean {
    return hasPermission(this.permissions(), required);
  }

  hasAny(...required: string[]): boolean {
    return hasAnyPermission(this.permissions(), required);
  }

  hasRole(roleName: string): boolean {
    return this.roles().includes(roleName);
  }

  isAdmin(): boolean {
    return this.hasRole('Admin') || this.hasPermission('manage:all');
  }
}
