/**
 * Dashboard Service — async stats via Angular resource()
 */

import { Injectable, computed, inject, resource } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { DashboardStats } from '@utils/api-mappers';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { AuthService } from './auth.service';

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  totalRoles: 0,
  activeSessions: 0,
  systemHealth: 0,
  totalContacts: 0,
  openDeals: 0,
  pipelineValue: 0,
  pipeline: [],
  recentActivity: [],
};

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly httpClient = inject(HttpClientService);
  private readonly authService = inject(AuthService);

  readonly statsResource = resource({
    params: () => (this.authService.isAuthenticated() ? true : undefined),
    loader: async ({ abortSignal }) => {
      return runResourceLoader(
        async () => {
          throwIfAborted(abortSignal);

          const response = await this.httpClient.get<DashboardStats>('/dashboard/stats');
          throwIfAborted(abortSignal);

          if (response.data) {
            return response.data;
          }

          return EMPTY_STATS;
        },
        {
          fallback: EMPTY_STATS,
          logMessage: 'Failed to load dashboard stats:',
        },
      );
    },
  });

  readonly stats = computed(() => {
    if (!this.statsResource.hasValue()) {
      return null;
    }

    return this.statsResource.value() ?? null;
  });
  readonly isLoading = computed(() => this.statsResource.isLoading());
  readonly statsError = computed(() => this.statsResource.error());

  reloadStats(): void {
    void this.statsResource.reload();
  }
}
