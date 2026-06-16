/**
 * API mappers — normalize backend payloads to frontend models
 */

import { User, Role } from '@models/index';

export interface ApiUserPayload {
  id: string;
  email?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  roles?: string[];
}

export interface ApiAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUserPayload;
}

export interface ApiRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const mapApiUser = (user: ApiUserPayload): User => ({
  id: user.id,
  email: user.email ?? '',
  phone: user.phone ?? undefined,
  isActive: user.status === 'ACTIVE',
  emailVerified: user.emailVerified ?? false,
  createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
  updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
  roles: user.roles?.map((name) => ({
    id: name,
    name,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

export const mapApiRole = (role: Partial<Role> & { id: string; name: string }): Role => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isActive: role.isActive ?? true,
  createdAt: role.createdAt ? new Date(role.createdAt) : new Date(),
  updatedAt: role.updatedAt ? new Date(role.updatedAt) : new Date(),
  permissions: role.permissions ?? [],
});

export interface DashboardActivity {
  id: string;
  action: string;
  description: string;
  time: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalRoles: number;
  activeSessions: number;
  systemHealth: number;
  recentActivity: DashboardActivity[];
}
