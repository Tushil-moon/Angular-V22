/**
 * Session Service — active device sessions
 */

import { Injectable, computed, inject, resource } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { AuthService } from './auth.service';
import { runResourceLoader } from '@shared/utils/resource-error';
import { throwIfAborted } from '@shared/utils/abort-signal';

export interface UserSession {
  id: string;
  deviceId: string;
  deviceName?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastActiveAt: string;
  revokedAt?: string | null;
  current?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly httpClient = inject(HttpClientService);
  private readonly authService = inject(AuthService);

  readonly sessionsResource = resource({
    params: () => (this.authService.isAuthenticated() ? true : undefined),
    loader: async ({ abortSignal }) => {
      return runResourceLoader(
        async () => {
          throwIfAborted(abortSignal);
          const response = await this.httpClient.get<UserSession[]>('/sessions');
          throwIfAborted(abortSignal);
          return response.data ?? [];
        },
        { fallback: [], logMessage: 'Failed to load sessions:' },
      );
    },
  });

  readonly sessions = computed(() => {
    if (!this.sessionsResource.hasValue()) {
      return [];
    }
    return this.sessionsResource.value() ?? [];
  });

  readonly isLoading = computed(() => this.sessionsResource.isLoading());

  reload(): void {
    void this.sessionsResource.reload();
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      await this.httpClient.delete(`/sessions/${sessionId}`);
      this.reload();
      return true;
    } catch (error) {
      console.error('Failed to revoke session:', error);
      return false;
    }
  }
}
