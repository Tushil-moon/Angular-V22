/**
 * Role and Permission Models
 * Defines types for role-based access control (RBAC)
 */

export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
  users?: UserRole[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  code: string;
  resource: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  createdAt: Date;
  updatedAt: Date;
  roles?: Role[];
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
  role?: Role;
  permission?: Permission;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  createdAt: Date;
}
