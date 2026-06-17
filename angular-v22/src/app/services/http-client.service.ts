/**
 * HTTP Client Service
 * Provides typed HTTP communication with the backend API
 */

import { Injectable, Injector, inject } from '@angular/core';
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { environment } from '@env';
import { ApiResponse, ApiError, HttpConfig } from '@models/index';
import { ApiRefreshResponsePayload, mapApiRefreshResponse } from '@utils/api-mappers';
import { TokenService } from './token.service';
import { OrganizationContextService } from './organization-context.service';

type AuthRequestConfig = InternalAxiosRequestConfig & {
  skipAuth?: boolean;
  skipOrganization?: boolean;
  _retry?: boolean;
};

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/email/verify',
  '/auth/otp/request',
  '/auth/otp/verify',
];

@Injectable({
  providedIn: 'root',
})
export class HttpClientService {
  private readonly tokenService = inject(TokenService);
  private readonly organizationContext = inject(OrganizationContextService);
  private readonly injector = inject(Injector);
  private readonly axiosInstance: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  private unauthorizedHandler: (() => void) | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: environment.apiBaseUrl,
      timeout: environment.apiTimeout,
      withCredentials: true,
    });

    this.setupInterceptors();
    this.syncAuthHeaderFromStorage();
  }

  registerUnauthorizedHandler(handler: () => void): void {
    this.unauthorizedHandler = handler;
  }

  async get<T>(url: string, config?: HttpConfig): Promise<ApiResponse<T>> {
    return this.request<T>(() =>
      this.axiosInstance.get<ApiResponse<T>>(url, this.buildAxiosConfig(config)),
    );
  }

  async post<T>(url: string, data?: unknown, config?: HttpConfig): Promise<ApiResponse<T>> {
    return this.request<T>(() =>
      this.axiosInstance.post<ApiResponse<T>>(url, data, this.buildAxiosConfig(config)),
    );
  }

  async put<T>(url: string, data?: unknown, config?: HttpConfig): Promise<ApiResponse<T>> {
    return this.request<T>(() =>
      this.axiosInstance.put<ApiResponse<T>>(url, data, this.buildAxiosConfig(config)),
    );
  }

  async patch<T>(url: string, data?: unknown, config?: HttpConfig): Promise<ApiResponse<T>> {
    return this.request<T>(() =>
      this.axiosInstance.patch<ApiResponse<T>>(url, data, this.buildAxiosConfig(config)),
    );
  }

  async delete<T>(url: string, config?: HttpConfig): Promise<ApiResponse<T>> {
    return this.request<T>(() =>
      this.axiosInstance.delete<ApiResponse<T>>(url, this.buildAxiosConfig(config)),
    );
  }

  setAuthToken(token: string): void {
    this.tokenService.setAccessToken(token);
    this.applyAuthHeader(token);
  }

  setRefreshToken(token: string): void {
    this.tokenService.setRefreshToken(token);
  }

  getAuthToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.tokenService.getRefreshToken();
  }

  removeAuthToken(): void {
    this.tokenService.clearTokens();
    this.clearAuthHeader();
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use((config: AuthRequestConfig) => {
      if (config.skipAuth || this.isPublicAuthRequest(config.url)) {
        return config;
      }

      const token = this.tokenService.getAccessToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }

      if (!config.skipOrganization) {
        const organizationId = this.organizationContext.activeOrganizationId();
        if (organizationId) {
          config.headers.set('X-Organization-Id', organizationId);
        }
      }

      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AuthRequestConfig | undefined;

        if (
          error.response?.status !== 401 ||
          !originalRequest ||
          originalRequest._retry ||
          originalRequest.skipAuth ||
          this.isPublicAuthRequest(originalRequest.url)
        ) {
          return Promise.reject(this.handleError(error));
        }

        originalRequest._retry = true;

        try {
          const accessToken = await this.refreshAccessToken();
          originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
          return this.axiosInstance.request(originalRequest);
        } catch (refreshError) {
          this.handleUnauthorized();
          return Promise.reject(this.handleError(refreshError));
        }
      },
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post<ApiResponse<ApiRefreshResponsePayload>>(
      `${environment.apiBaseUrl}/auth/refresh`,
      { refreshToken },
      {
        withCredentials: true,
        timeout: environment.apiTimeout,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const tokens = response.data.data ? mapApiRefreshResponse(response.data.data) : null;
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid refresh token response');
    }

    this.tokenService.setTokens(tokens.accessToken, tokens.refreshToken);
    this.applyAuthHeader(tokens.accessToken);
    return tokens.accessToken;
  }

  private handleUnauthorized(): void {
    this.tokenService.clearTokens();
    this.clearAuthHeader();

    if (this.unauthorizedHandler) {
      this.unauthorizedHandler();
      return;
    }

    void import('./auth.service').then(({ AuthService }) => {
      this.injector.get(AuthService).handleUnauthorized();
    });
  }

  private isPublicAuthRequest(url?: string): boolean {
    if (!url) return false;
    return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
  }

  private syncAuthHeaderFromStorage(): void {
    const token = this.tokenService.getAccessToken();
    if (token) {
      this.applyAuthHeader(token);
    }
  }

  private applyAuthHeader(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  private clearAuthHeader(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  private buildAxiosConfig(config?: HttpConfig): AxiosRequestConfig {
    const params = config?.params
      ? Object.fromEntries(Object.entries(config.params).filter(([, value]) => value !== undefined))
      : undefined;

    return {
      params,
      headers: config?.headers,
      timeout: config?.timeout,
      withCredentials: config?.withCredentials,
      skipAuth: config?.skipAuth,
      skipOrganization: config?.skipOrganization,
    } as AxiosRequestConfig & { skipAuth?: boolean; skipOrganization?: boolean };
  }

  private async request<T>(
    execute: () => Promise<{ data: ApiResponse<T> }>,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await execute();
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse<unknown>>;
      const status = axiosError.response?.status || 0;
      const data = axiosError.response?.data;

      return {
        code: (data as { code?: string })?.code || data?.message || 'UNKNOWN_ERROR',
        message: data?.message || error.message || 'An unexpected error occurred',
        statusCode: status,
        details: data?.errors,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'CLIENT_ERROR',
        message: error.message,
        statusCode: 0,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 0,
    };
  }
}
