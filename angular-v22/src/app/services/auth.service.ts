/**
 * Authentication Service
 * Signal-driven auth service managing user authentication state and tokens
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClientService } from './http-client.service';
import { TokenService } from './token.service';
import { User, SignInRequest, SignUpRequest, Session, ApiError } from '@models/index';
import {
  mapApiUser,
  ApiUserPayload,
  ApiAuthResponse,
  ApiRefreshResponse,
} from '@utils/api-mappers';
import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient = inject(HttpClientService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<User | null>(this.getUserFromStorage());
  private readonly isAuthenticatedSignal = signal<boolean>(
    this.tokenService.hasAccessToken() && !!this.getUserFromStorage(),
  );
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly sessionSignal = signal<Session | null>(null);

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.isAuthenticatedSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly session = computed(() => this.sessionSignal());
  readonly userInitials = computed(() => {
    const user = this.currentUserSignal();
    if (!user) return '';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  });

  private sessionInitPromise: Promise<void> | null = null;

  constructor() {
    this.httpClient.registerUnauthorizedHandler(() => this.handleUnauthorized());

    const accessToken = this.tokenService.getAccessToken();
    if (accessToken) {
      this.httpClient.setAuthToken(accessToken);
    }

    this.sessionInitPromise = this.bootstrapSession();
  }

  ensureSessionReady(): Promise<void> {
    return this.sessionInitPromise ?? Promise.resolve();
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as ApiError).message);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }

  /**
   * Restore session from storage or refresh token on app load
   */
  private async bootstrapSession(): Promise<void> {
    const user = this.getUserFromStorage();
    const accessToken = this.tokenService.getAccessToken();
    const refreshToken = this.tokenService.getRefreshToken();

    if (accessToken && user) {
      this.httpClient.setAuthToken(accessToken);
      this.currentUserSignal.set(user);
      this.isAuthenticatedSignal.set(true);
      return;
    }

    if (refreshToken && user) {
      try {
        await this.refreshToken();
        await this.refreshProfile();
      } catch {
        this.clearAuth();
      }
      return;
    }

    this.clearAuth();
  }

  /**
   * Attempt session restore for route guards
   */
  async tryRestoreSession(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true;
    }

    if (!this.tokenService.hasRefreshToken()) {
      return false;
    }

    try {
      await this.refreshToken();
      if (!this.currentUserSignal()) {
        await this.refreshProfile();
      }
      return this.isAuthenticated();
    } catch {
      this.clearAuth();
      return false;
    }
  }

  handleUnauthorized(): void {
    this.clearAuth();
    void this.router.navigate(['/auth/signin']);
  }

  async signUp(request: SignUpRequest): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await this.httpClient.post<ApiAuthResponse>(
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
        this.setAuthState(response.data);
      }
    } catch (error: unknown) {
      this.errorSignal.set(this.getErrorMessage(error, 'Sign up failed. Please try again.'));
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async signIn(request: SignInRequest): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await this.httpClient.post<ApiAuthResponse>('/auth/login', request, {
        skipAuth: true,
      });

      if (response.data) {
        this.setAuthState(response.data);
      }
    } catch (error: unknown) {
      this.errorSignal.set(this.getErrorMessage(error, 'Sign in failed. Please try again.'));
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      if (this.tokenService.hasAccessToken()) {
        await this.httpClient.post('/auth/logout', {});
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      this.clearAuth();
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Refresh access token using stored refresh token
   */
  async refreshToken(): Promise<void> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.httpClient.post<ApiRefreshResponse>(
      '/auth/refresh',
      { refreshToken },
      { skipAuth: true },
    );

    if (response.data) {
      this.applyTokens(response.data);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      await this.httpClient.post('/auth/email/verify', { token }, { skipAuth: true });
      const user = this.currentUserSignal();
      if (user) {
        const updated = { ...user, emailVerified: true };
        this.currentUserSignal.set(updated);
        this.saveUserToStorage(updated);
      }
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await this.httpClient.post('/auth/password/forgot', { email }, { skipAuth: true });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Password reset request failed. Please try again.';
      this.errorSignal.set(errorMessage);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await this.httpClient.post(
        '/auth/password/reset',
        { token, password: newPassword },
        { skipAuth: true },
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Password reset failed. Please try again.';
      this.errorSignal.set(errorMessage);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  getCurrentToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  updateCurrentUser(user: User): void {
    this.currentUserSignal.set(user);
    this.saveUserToStorage(user);
  }

  private setAuthState(authResponse: ApiAuthResponse): void {
    this.applyTokens(authResponse);

    const user = mapApiUser(authResponse.user);
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
    this.saveUserToStorage(user);
    this.errorSignal.set(null);
  }

  private applyTokens(tokens: ApiRefreshResponse): void {
    this.httpClient.setAuthToken(tokens.accessToken);
    this.httpClient.setRefreshToken(tokens.refreshToken);
  }

  private clearAuth(): void {
    this.httpClient.removeAuthToken();
    localStorage.removeItem(environment.userStorageKey);
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.sessionSignal.set(null);
    this.errorSignal.set(null);
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem(environment.userStorageKey);
    return user ? JSON.parse(user) : null;
  }

  private saveUserToStorage(user: User): void {
    localStorage.setItem(environment.userStorageKey, JSON.stringify(user));
  }

  async refreshProfile(): Promise<void> {
    try {
      const response = await this.httpClient.get<ApiUserPayload>('/users/me');
      if (response.data) {
        const user = mapApiUser(response.data);
        this.currentUserSignal.set(user);
        this.isAuthenticatedSignal.set(true);
        this.saveUserToStorage(user);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await this.httpClient.post('/auth/password/change', {
        currentPassword,
        newPassword,
      });
    } catch (error: unknown) {
      this.errorSignal.set(this.getErrorMessage(error, 'Failed to change password.'));
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async requestEmailVerification(): Promise<void> {
    await this.httpClient.post('/auth/email/request-verification', {});
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
