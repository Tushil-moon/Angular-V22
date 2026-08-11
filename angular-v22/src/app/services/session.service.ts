/**
 * Session Service — active device sessions
 */

import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { ApiSessionPayload, mapApiSession } from '@utils/api-mappers';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { AuthService } from './auth.service';
import { HttpClientService } from './http-client.service';

export type UserSession = ReturnType<typeof mapApiSession>;

@Injectable({
    providedIn: 'root',
})
export class SessionService {
    private readonly httpClient = inject(HttpClientService);
    private readonly authService = inject(AuthService);

    readonly sessionsResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ abortSignal }) => {
            throwIfAborted(abortSignal);
            return this.httpClient.get<ApiSessionPayload[]>('/sessions').pipe(
                map((response) => response.data?.map(mapApiSession) ?? []),
                catchResourceStreamError<UserSession[]>({
                    fallback: [],
                    logMessage: 'Failed to load sessions:',
                }),
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
        this.sessionsResource.reload();
    }

    revokeSession(sessionId: string): Observable<boolean> {
        return this.httpClient.delete(`/sessions/${sessionId}`).pipe(
            tap(() => this.reload()),
            map(() => true),
            catchError((error) => {
                console.error('Failed to revoke session:', error);
                return of(false);
            }),
        );
    }
}
