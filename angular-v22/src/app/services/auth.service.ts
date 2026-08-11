/**
 * Authentication Service — signals for state, rxResource for session restore
 */

import { computed, inject, Service, signal } from '@angular/core';
import { rxResource, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { environment } from '@env';
import { ApiError, SignInRequest, SignUpRequest, User } from '@models/index';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import {
    ApiAuthResponsePayload,
    ApiRefreshResponsePayload,
    ApiUserPayload,
    mapApiAuthResponse,
    mapApiRefreshResponse,
    mapApiUser,
} from '@utils/api-mappers';
import { getDeviceName } from '@utils/device-id.util';
import { ignorePromise } from '@utils/form-display.util';
import {
    catchError,
    filter,
    finalize,
    map,
    Observable,
    of,
    switchMap,
    take,
    tap,
    throwError,
} from 'rxjs';

import { HttpClientService } from './http-client.service';
import { TokenService } from './token.service';

@Service()
export class AuthService {
    private readonly http = inject(HttpClientService);
    private readonly tokens = inject(TokenService);
    private readonly router = inject(Router);

    private readonly user = signal<User | null>(this.readStoredUser());
    private readonly loading = signal(false);
    private readonly errorMessage = signal<string | null>(null);
    private readonly tokenVersion = signal(0);

    /** Restores session from storage / refresh token on first use. */
    readonly sessionResource = rxResource({
        stream: ({ abortSignal }) =>
            this.restoreSession(abortSignal).pipe(
                catchResourceStreamError<User | null>({
                    fallback: null,
                    logMessage: 'Session restore failed:',
                }),
            ),
    });

    readonly currentUser = this.user.asReadonly();
    readonly error = this.errorMessage.asReadonly();
    readonly isLoading = computed(() => this.loading() || this.sessionResource.isLoading());
    readonly isAuthenticated = computed(() => {
        this.tokenVersion();
        return this.tokens.hasAccessToken() && !!this.user();
    });
    readonly mustChangePassword = computed(() => this.user()?.mustChangePassword ?? false);
    readonly userInitials = computed(() => {
        const u = this.user();
        if (!u) return '';
        const initials = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
        return initials || u.email[0].toUpperCase();
    });

    private readonly sessionReady$ = toObservable(this.sessionResource.status).pipe(
        filter((status) => status !== 'loading' && status !== 'reloading'),
        take(1),
        map(() => undefined),
    );

    private readonly bootstrapAuthSession = this.initializeAuthSession();

    /** Wait until session restore has finished (for route guards). */
    ensureSessionReady(): Observable<void> {
        return this.sessionReady$;
    }

    signIn(request: SignInRequest): Observable<void> {
        return this.run(
            'Sign in failed. Please try again.',
            this.http
                .post<ApiAuthResponsePayload>(
                    '/auth/login',
                    { ...request, deviceName: request.deviceName ?? getDeviceName() },
                    { skipAuth: true },
                )
                .pipe(
                    tap((response) => {
                        if (response.data) {
                            this.applyAuth(response.data);
                        }
                    }),
                ),
        );
    }

    signUp(request: SignUpRequest): Observable<void> {
        return this.run(
            'Sign up failed. Please try again.',
            this.http
                .post<ApiAuthResponsePayload>(
                    '/auth/register',
                    {
                        email: request.email,
                        password: request.password,
                        firstName: request.firstName,
                        lastName: request.lastName,
                    },
                    { skipAuth: true },
                )
                .pipe(
                    tap((response) => {
                        if (response.data) {
                            this.applyAuth(response.data);
                        }
                    }),
                ),
        );
    }

    signOut(): Observable<void> {
        this.loading.set(true);

        const logout$ = this.tokens.hasAccessToken()
            ? this.http.post('/auth/logout', {}).pipe(
                  catchError((error) => {
                      console.error('Sign out error:', error);
                      return of(undefined);
                  }),
              )
            : of(undefined);

        return logout$.pipe(
            tap(() => this.clearAuth()),
            map(() => undefined),
            finalize(() => this.loading.set(false)),
        );
    }

    signOutAll(): Observable<void> {
        this.loading.set(true);

        const logout$ = this.tokens.hasAccessToken()
            ? this.http.post('/auth/logout-all', {}).pipe(
                  catchError((error) => {
                      console.error('Sign out all error:', error);
                      return of(undefined);
                  }),
              )
            : of(undefined);

        return logout$.pipe(
            tap(() => this.clearAuth()),
            map(() => undefined),
            finalize(() => this.loading.set(false)),
        );
    }

    requestPasswordReset(email: string): Observable<void> {
        return this.run(
            'Password reset request failed. Please try again.',
            this.http.post('/auth/password/forgot', { email }, { skipAuth: true }),
        );
    }

    resetPassword(token: string, password: string): Observable<void> {
        return this.run(
            'Password reset failed. Please try again.',
            this.http.post('/auth/password/reset', { token, password }, { skipAuth: true }),
        );
    }

    verifyEmail(token: string): Observable<void> {
        return this.run(
            'Email verification failed.',
            this.http.post('/auth/email/verify', { token }, { skipAuth: true }).pipe(
                tap(() => {
                    const current = this.user();
                    if (current) {
                        this.setUser({ ...current, emailVerified: true });
                    }
                }),
            ),
        );
    }

    changePassword(currentPassword: string, newPassword: string): Observable<void> {
        return this.run(
            'Failed to change password.',
            this.http.post('/auth/password/change', { currentPassword, newPassword }).pipe(
                tap(() => {
                    const current = this.user();
                    if (current) {
                        this.setUser({ ...current, mustChangePassword: false });
                    }
                }),
            ),
        );
    }

    requestEmailVerification(): Observable<void> {
        return this.http.post('/auth/email/request-verification', {}).pipe(map(() => undefined));
    }

    refreshProfile(): Observable<void> {
        return this.http.get<ApiUserPayload>('/users/me').pipe(
            tap((response) => {
                if (response.data) {
                    this.setUser(mapApiUser(response.data));
                }
            }),
            map(() => undefined),
            catchError((error) => {
                console.error('Failed to refresh profile:', error);
                return of(undefined);
            }),
        );
    }

    refreshToken(): Observable<void> {
        const refreshToken = this.tokens.getRefreshToken();
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }

        return this.http
            .post<ApiRefreshResponsePayload>('/auth/refresh', { refreshToken }, { skipAuth: true })
            .pipe(
                tap((response) => {
                    if (response.data) {
                        this.applyTokens(mapApiRefreshResponse(response.data));
                    }
                }),
                map(() => undefined),
            );
    }

    handleUnauthorized(): void {
        this.clearAuth();
        ignorePromise(this.router.navigate(['/auth/signin']));
    }

    getCurrentToken(): string | null {
        return this.tokens.getAccessToken();
    }

    updateCurrentUser(user: User): void {
        this.setUser(user);
    }

    clearError(): void {
        this.errorMessage.set(null);
    }

    private initializeAuthSession(): void {
        this.http.registerUnauthorizedHandler(() => this.handleUnauthorized());
        const accessToken = this.tokens.getAccessToken();
        if (accessToken) {
            this.http.setAuthToken(accessToken);
        }
    }

    private restoreSession(abortSignal: AbortSignal): Observable<User | null> {
        throwIfAborted(abortSignal);

        const storedUser = this.readStoredUser();
        const accessToken = this.tokens.getAccessToken();
        const refreshToken = this.tokens.getRefreshToken();

        if (accessToken && storedUser) {
            this.http.setAuthToken(accessToken);
            this.user.set(storedUser);
            this.tokenVersion.update((v) => v + 1);

            if (!storedUser.permissions?.length) {
                return this.refreshProfile().pipe(map(() => this.user()));
            }
            return of(this.user());
        }

        if (refreshToken && storedUser) {
            return this.refreshToken().pipe(
                switchMap(() => this.refreshProfile()),
                map(() => this.user()),
                catchError(() => {
                    this.clearAuth();
                    return of(null);
                }),
            );
        }

        this.clearAuth();
        return of(null);
    }

    private run(fallbackError: string, action$: Observable<unknown>): Observable<void> {
        this.loading.set(true);
        this.errorMessage.set(null);

        return action$.pipe(
            map(() => undefined),
            catchError((error: unknown) => {
                this.errorMessage.set(this.toMessage(error, fallbackError));
                return throwError(() => error);
            }),
            finalize(() => this.loading.set(false)),
        );
    }

    private applyAuth(payload: ApiAuthResponsePayload): void {
        const mapped = mapApiAuthResponse(payload);
        this.applyTokens(mapped);
        this.setUser(mapped.user);
        this.errorMessage.set(null);
    }

    private applyTokens(tokens: { accessToken: string; refreshToken: string }): void {
        this.http.setAuthToken(tokens.accessToken);
        this.http.setRefreshToken(tokens.refreshToken);
        this.tokenVersion.update((v) => v + 1);
    }

    private setUser(user: User): void {
        this.user.set(user);
        localStorage.setItem(environment.userStorageKey, JSON.stringify(user));
    }

    private clearAuth(): void {
        this.http.removeAuthToken();
        localStorage.removeItem(environment.userStorageKey);
        this.user.set(null);
        this.errorMessage.set(null);
        this.tokenVersion.update((v) => v + 1);
    }

    private readStoredUser(): User | null {
        const raw = localStorage.getItem(environment.userStorageKey);
        return raw ? (JSON.parse(raw) as User) : null;
    }

    private toMessage(error: unknown, fallback: string): string {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            return String((error as ApiError).message);
        }
        if (error instanceof Error) {
            return error.message;
        }
        return fallback;
    }
}
