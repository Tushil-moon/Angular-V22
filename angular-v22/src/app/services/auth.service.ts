/**
 * Authentication Service — signals for state, resource for session restore
 */

import { computed, inject, resource, Service, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { environment } from '@env';
import { ApiError, SignInRequest, SignUpRequest, User } from '@models/index';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
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
import { filter, firstValueFrom, map, take } from 'rxjs';

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
    readonly sessionResource = resource({
        loader: ({ abortSignal }) =>
            runResourceLoader(() => this.restoreSession(abortSignal), {
                fallback: null,
                logMessage: 'Session restore failed:',
            }),
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

    constructor() {
        this.http.registerUnauthorizedHandler(() => this.handleUnauthorized());
        const accessToken = this.tokens.getAccessToken();
        if (accessToken) {
            this.http.setAuthToken(accessToken);
        }
    }

    /** Wait until session restore has finished (for route guards). */
    ensureSessionReady(): Promise<void> {
        return firstValueFrom(this.sessionReady$);
    }

    async signIn(request: SignInRequest): Promise<void> {
        await this.run('Sign in failed. Please try again.', async () => {
            const response = await this.http.post<ApiAuthResponsePayload>(
                '/auth/login',
                { ...request, deviceName: request.deviceName ?? getDeviceName() },
                { skipAuth: true },
            );
            if (response.data) {
                this.applyAuth(response.data);
            }
        });
    }

    async signUp(request: SignUpRequest): Promise<void> {
        await this.run('Sign up failed. Please try again.', async () => {
            const response = await this.http.post<ApiAuthResponsePayload>(
                '/auth/register',
                {
                    email: request.email,
                    password: request.password,
                    firstName: request.firstName,
                    lastName: request.lastName,
                },
                { skipAuth: true },
            );
            if (response.data) {
                this.applyAuth(response.data);
            }
        });
    }

    async signOut(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.tokens.hasAccessToken()) {
                await this.http.post('/auth/logout', {});
            }
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            this.clearAuth();
            this.loading.set(false);
        }
    }

    async signOutAll(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.tokens.hasAccessToken()) {
                await this.http.post('/auth/logout-all', {});
            }
        } catch (error) {
            console.error('Sign out all error:', error);
        } finally {
            this.clearAuth();
            this.loading.set(false);
        }
    }

    async requestPasswordReset(email: string): Promise<void> {
        await this.run('Password reset request failed. Please try again.', () =>
            this.http.post('/auth/password/forgot', { email }, { skipAuth: true }),
        );
    }

    async resetPassword(token: string, password: string): Promise<void> {
        await this.run('Password reset failed. Please try again.', () =>
            this.http.post('/auth/password/reset', { token, password }, { skipAuth: true }),
        );
    }

    async verifyEmail(token: string): Promise<void> {
        await this.run('Email verification failed.', async () => {
            await this.http.post('/auth/email/verify', { token }, { skipAuth: true });
            const current = this.user();
            if (current) {
                this.setUser({ ...current, emailVerified: true });
            }
        });
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await this.run('Failed to change password.', async () => {
            await this.http.post('/auth/password/change', { currentPassword, newPassword });
            const current = this.user();
            if (current) {
                this.setUser({ ...current, mustChangePassword: false });
            }
        });
    }

    async requestEmailVerification(): Promise<void> {
        await this.http.post('/auth/email/request-verification', {});
    }

    async refreshProfile(): Promise<void> {
        try {
            const response = await this.http.get<ApiUserPayload>('/users/me');
            if (response.data) {
                this.setUser(mapApiUser(response.data));
            }
        } catch (error) {
            console.error('Failed to refresh profile:', error);
        }
    }

    async refreshToken(): Promise<void> {
        const refreshToken = this.tokens.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await this.http.post<ApiRefreshResponsePayload>(
            '/auth/refresh',
            { refreshToken },
            { skipAuth: true },
        );
        if (response.data) {
            this.applyTokens(mapApiRefreshResponse(response.data));
        }
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

    private async restoreSession(abortSignal: AbortSignal): Promise<User | null> {
        throwIfAborted(abortSignal);

        const storedUser = this.readStoredUser();
        const accessToken = this.tokens.getAccessToken();
        const refreshToken = this.tokens.getRefreshToken();

        if (accessToken && storedUser) {
            this.http.setAuthToken(accessToken);
            this.user.set(storedUser);
            this.tokenVersion.update((v) => v + 1);

            if (!storedUser.permissions?.length) {
                await this.refreshProfile();
                throwIfAborted(abortSignal);
            }
            return this.user();
        }

        if (refreshToken && storedUser) {
            try {
                await this.refreshToken();
                throwIfAborted(abortSignal);
                await this.refreshProfile();
                throwIfAborted(abortSignal);
                return this.user();
            } catch {
                this.clearAuth();
                return null;
            }
        }

        this.clearAuth();
        return null;
    }

    private async run(fallbackError: string, action: () => Promise<unknown>): Promise<void> {
        this.loading.set(true);
        this.errorMessage.set(null);
        try {
            await action();
        } catch (error: unknown) {
            this.errorMessage.set(this.toMessage(error, fallbackError));
            throw error;
        } finally {
            this.loading.set(false);
        }
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
