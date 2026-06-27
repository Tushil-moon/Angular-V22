/**
 * Common Models and Types
 */

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
    timestamp: string;
}

export interface ApiError {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
}

export interface FilterOptions {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    [key: string]: string | number | boolean | undefined;
}

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

export interface HttpConfig {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
    timeout?: number;
    withCredentials?: boolean;
    skipAuth?: boolean;
    skipOrganization?: boolean;
}
