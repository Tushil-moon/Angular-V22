/**
 * HTTP Client Service — Angular HttpClient wrapper for the backend API
 */

import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env';
import { ApiError, ApiResponse, HttpConfig } from '@models/index';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';

import { SKIP_AUTH, SKIP_ORGANIZATION } from './http/http-context.tokens';
import { HttpUnauthorizedRegistry } from './http/http-unauthorized.registry';
import { TokenService } from './token.service';

@Injectable({
    providedIn: 'root',
})
export class HttpClientService {
    private readonly http = inject(HttpClient);
    private readonly tokenService = inject(TokenService);
    private readonly unauthorizedRegistry = inject(HttpUnauthorizedRegistry);

    registerUnauthorizedHandler(handler: () => void): void {
        this.unauthorizedRegistry.register(handler);
    }

    async get<T>(url: string, config?: HttpConfig): Promise<ApiResponse<T>> {
        return this.request<T>('GET', url, undefined, config);
    }

    async post<T>(url: string, data?: unknown, config?: HttpConfig): Promise<ApiResponse<T>> {
        return this.request<T>('POST', url, data, config);
    }

    async put<T>(url: string, data?: unknown, config?: HttpConfig): Promise<ApiResponse<T>> {
        return this.request<T>('PUT', url, data, config);
    }

    async patch<T>(url: string, data?: unknown, config?: HttpConfig): Promise<ApiResponse<T>> {
        return this.request<T>('PATCH', url, data, config);
    }

    async delete<T>(url: string, config?: HttpConfig): Promise<ApiResponse<T>> {
        return this.request<T>('DELETE', url, undefined, config);
    }

    setAuthToken(token: string): void {
        this.tokenService.setAccessToken(token);
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
    }

    private async request<T>(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: string,
        body?: unknown,
        config?: HttpConfig,
    ): Promise<ApiResponse<T>> {
        const endpoint = `${environment.apiBaseUrl}${url}`;
        const options = this.buildRequestOptions(config);
        const requestTimeout = config?.timeout ?? environment.apiTimeout;

        try {
            const request$ = (() => {
                switch (method) {
                    case 'GET':
                        return this.http.get<ApiResponse<T>>(endpoint, options);
                    case 'POST':
                        return this.http.post<ApiResponse<T>>(endpoint, body, options);
                    case 'PUT':
                        return this.http.put<ApiResponse<T>>(endpoint, body, options);
                    case 'PATCH':
                        return this.http.patch<ApiResponse<T>>(endpoint, body, options);
                    case 'DELETE':
                        return this.http.delete<ApiResponse<T>>(endpoint, options);
                }
            })();

            return await firstValueFrom(request$.pipe(timeout(requestTimeout)));
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private buildRequestOptions(config?: HttpConfig): {
        context: HttpContext;
        params?: HttpParams;
        headers?: HttpHeaders;
        withCredentials: boolean;
    } {
        let context = new HttpContext();

        if (config?.skipAuth) {
            context = context.set(SKIP_AUTH, true);
        }

        if (config?.skipOrganization) {
            context = context.set(SKIP_ORGANIZATION, true);
        }

        let params: HttpParams | undefined;
        if (config?.params) {
            let httpParams = new HttpParams();
            for (const [key, value] of Object.entries(config.params)) {
                if (value !== undefined) {
                    httpParams = httpParams.set(key, String(value));
                }
            }
            params = httpParams;
        }

        return {
            context,
            params,
            headers: config?.headers ? new HttpHeaders(config.headers) : undefined,
            withCredentials: config?.withCredentials ?? true,
        };
    }

    private handleError(error: unknown): ApiError {
        if (error instanceof TimeoutError) {
            return {
                code: 'TIMEOUT',
                message: 'The request timed out. Please try again.',
                statusCode: 0,
            };
        }

        if (error instanceof HttpErrorResponse) {
            const data = error.error as ApiResponse<unknown> | undefined;
            const status = error.status || 0;

            return {
                code: (data as { code?: string } | undefined)?.code || data?.message || 'UNKNOWN_ERROR',
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
