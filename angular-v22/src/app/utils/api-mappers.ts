/**
 * API mappers — normalize snake_case backend payloads to frontend models
 */

import type { Role, User } from '@models/index';

/** Raw API payloads use snake_case keys (see backend api-design rule). */

export interface ApiUserPayload {
    id: string;
    email?: string | null;
    phone?: string | null;
    email_verified?: boolean;
    phone_verified?: boolean;
    must_change_password?: boolean;
    password_changed_at?: string | null;
    two_factor_enabled?: boolean;
    status?: string;
    created_at?: string | Date;
    updated_at?: string | Date;
    roles?: string[];
    permissions?: string[];
}

export interface ApiAuthResponsePayload {
    access_token: string;
    refresh_token: string;
    user: ApiUserPayload;
}

export interface ApiRefreshResponsePayload {
    access_token: string;
    refresh_token: string;
}

export interface ApiRolePayload {
    id: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
    created_at?: string | Date;
    updated_at?: string | Date;
    permissions?: { id: string; action: string; subject: string; code?: string }[];
}

export interface ApiSessionPayload {
    id: string;
    device_id: string;
    device_name?: string | null;
    user_agent?: string | null;
    ip_address?: string | null;
    created_at: string;
    last_active_at: string;
    revoked_at?: string | null;
    current?: boolean;
}

export interface ApiPaginatedPayload<T> {
    data: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_more: boolean;
}

export const mapApiAuthResponse = (
    payload: ApiAuthResponsePayload,
): { accessToken: string; refreshToken: string; user: User } => ({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    user: mapApiUser(payload.user),
});

export const mapApiRefreshResponse = (
    payload: ApiRefreshResponsePayload,
): { accessToken: string; refreshToken: string } => ({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
});

export const mapApiUser = (user: ApiUserPayload): User => ({
    id: user.id,
    email: user.email ?? '',
    phone: user.phone ?? undefined,
    isActive: (user.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE',
    emailVerified: Boolean(user.email_verified),
    mustChangePassword: Boolean(user.must_change_password),
    twoFactorEnabled: Boolean(user.two_factor_enabled),
    createdAt: user.created_at ? new Date(user.created_at) : new Date(),
    updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
    permissions: user.permissions ?? [],
    roles: (user.roles ?? []).map((name) => ({
        id: name,
        name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    })),
});

export const mapApiRole = (role: ApiRolePayload): Role => ({
    id: role.id,
    name: role.name,
    description: role.description ?? undefined,
    isActive: role.is_active ?? true,
    createdAt: role.created_at ? new Date(role.created_at) : new Date(),
    updatedAt: role.updated_at ? new Date(role.updated_at) : new Date(),
    permissions: (role.permissions ?? []).map((permission) => ({
        id: permission.id,
        name: permission.code ?? `${permission.action}:${permission.subject}`,
        code: permission.code ?? `${permission.action}:${permission.subject}`,
        resource: permission.subject,
        action: 'READ',
        createdAt: new Date(),
        updatedAt: new Date(),
    })),
});

export const mapApiSession = (session: ApiSessionPayload) => ({
    id: session.id,
    deviceId: session.device_id,
    deviceName: session.device_name ?? null,
    userAgent: session.user_agent ?? null,
    ipAddress: session.ip_address ?? null,
    createdAt: session.created_at,
    lastActiveAt: session.last_active_at,
    revokedAt: session.revoked_at ?? null,
    current: Boolean(session.current),
});

export const mapApiPaginated = <TApi, TModel>(
    payload: ApiPaginatedPayload<TApi> | null | undefined,
    mapItem: (item: TApi) => TModel,
) => ({
    data: (payload?.data ?? []).map(mapItem),
    total: payload?.total ?? 0,
    page: payload?.page ?? 1,
    pageSize: payload?.page_size ?? 10,
    totalPages: payload?.total_pages ?? 0,
    hasMore: Boolean(payload?.has_more),
});
