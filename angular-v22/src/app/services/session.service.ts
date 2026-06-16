/**
 * Session Service — active device sessions
 */

import { Injectable, computed, inject, resource } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { AuthService } from './auth.service';
import { runResourceLoader } from '@shared/utils/resource-error';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { mapApiSession, ApiSessionPayload } from '@utils/api-mappers';

export type UserSession = ReturnType<typeof mapApiSession>;

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
          const response = await this.httpClient.get<ApiSessionPayload[]>('/sessions');
          throwIfAborted(abortSignal);
          return response.data?.map(mapApiSession) ?? [];
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
