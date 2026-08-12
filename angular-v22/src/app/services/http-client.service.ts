/**
 * HTTP Client Service — Angular HttpClient wrapper for the backend API
 */

import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env';
import { ApiError, ApiResponse, HttpConfig } from '@models/index';
import { catchError, Observable, throwError, timeout, TimeoutError } from 'rxjs';

import { SKIP_AUTH } from './http/http-context.tokens';
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

    get<T>(url: string, config?: HttpConfig): Observable<ApiResponse<T>> {
        return this.request<T>('GET', url, undefined, config);
    }

    getText(url: string, config?: HttpConfig): Observable<string> {
        const endpoint = `${environment.apiBaseUrl}${url}`;
        const options = this.buildRequestOptions(config);
        const requestTimeout = config?.timeout ?? environment.apiTimeout;

        return this.http.get(endpoint, { ...options, responseType: 'text' }).pipe(
            timeout(requestTimeout),
            catchError((error) => throwError(() => this.handleError(error))),
        );
    }

    post<T>(url: string, data?: unknown, config?: HttpConfig): Observable<ApiResponse<T>> {
        return this.request<T>('POST', url, data, config);
    }

    put<T>(url: string, data?: unknown, config?: HttpConfig): Observable<ApiResponse<T>> {
        return this.request<T>('PUT', url, data, config);
    }

    patch<T>(url: string, data?: unknown, config?: HttpConfig): Observable<ApiResponse<T>> {
        return this.request<T>('PATCH', url, data, config);
    }

    delete<T>(url: string, data?: unknown, config?: HttpConfig): Observable<ApiResponse<T>> {
        return this.request<T>('DELETE', url, data, config);
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

    private request<T>(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: string,
        body?: unknown,
        config?: HttpConfig,
    ): Observable<ApiResponse<T>> {
        const endpoint = `${environment.apiBaseUrl}${url}`;
        const options = this.buildRequestOptions(config);
        const requestTimeout = config?.timeout ?? environment.apiTimeout;

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
                    return body !== undefined
                        ? this.http.request<ApiResponse<T>>('DELETE', endpoint, {
                              ...options,
                              body,
                          })
                        : this.http.delete<ApiResponse<T>>(endpoint, options);
            }
        })();

        return request$.pipe(
            timeout(requestTimeout),
            catchError((error) => throwError(() => this.handleError(error))),
        );
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
                details: data?.errors ?? (data as { details?: unknown } | undefined)?.details,
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
