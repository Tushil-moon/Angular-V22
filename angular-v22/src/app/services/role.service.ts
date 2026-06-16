/**
 * Role Service — roles list via Angular resource()
 */

import { Injectable, computed, inject, resource, signal } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { Role, Permission } from '@models/index';
import { mapApiRole, ApiRolePayload } from '@utils/api-mappers';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly permissionsSignal = signal<Permission[]>([]);
  private readonly httpClient = inject(HttpClientService);
  private readonly authService = inject(AuthService);

  readonly rolesResource = resource({
    params: () => (this.authService.isAuthenticated() ? true : undefined),
    loader: async ({ abortSignal }) => {
      return runResourceLoader(
        async () => {
          throwIfAborted(abortSignal);

          const response = await this.httpClient.get<ApiRolePayload[]>('/roles');
          throwIfAborted(abortSignal);

          return response.data?.map(mapApiRole) ?? [];
        },
        {
          fallback: [],
          logMessage: 'Failed to fetch roles:',
        },
      );
    },
  });

  readonly roles = computed(() => {
    if (!this.rolesResource.hasValue()) {
      return [];
    }

    return this.rolesResource.value() ?? [];
  });
  readonly permissions = computed(() => this.permissionsSignal());
  readonly isLoading = computed(() => this.rolesResource.isLoading());
  readonly totalRoles = computed(() => this.roles().length);

  reloadRoles(): void {
    void this.rolesResource.reload();
  }

  async createRole(payload: { name: string; description?: string }): Promise<Role | null> {
    try {
      const response = await this.httpClient.post<ApiRolePayload>('/roles', payload);
      if (response.data) {
        const role = mapApiRole(response.data);
        void this.rolesResource.reload();
        return role;
      }
      return null;
    } catch (error) {
      console.error('Failed to create role:', error);
      throw error;
    }
  }

  async assignRole(userId: string, roleName: string): Promise<boolean> {
    try {
      await this.httpClient.post('/roles/assign', { userId, roleName });
      return true;
    } catch (error) {
      console.error('Failed to assign role:', error);
      return false;
    }
  }

  async removeRoleFromUser(userId: string, roleName: string): Promise<boolean> {
    try {
      await this.httpClient.post('/roles/remove', { userId, roleName });
      return true;
    } catch (error) {
      console.error('Failed to remove role:', error);
      return false;
    }
  }

  async deleteRole(): Promise<boolean> {
    console.warn('Delete role is not supported by the API yet');
    return false;
  }
}
