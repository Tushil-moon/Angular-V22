/**
 * Authentication Models
 * Defines types for user authentication and authorization
 */

import type { Role } from './rbac.model';

export interface SignUpRequest {
    email: string;
    password: string;
    confirmPassword: string;
    firstName?: string;
    lastName?: string;
}

export interface SignInRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface TokenPayload {
    sub: string;
    email: string;
    iat: number;
    exp: number;
}

export interface User {
    id: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    permissions?: string[];
    roles?: Role[];
    sessions?: Session[];
}

export interface Session {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface VerificationToken {
    id: string;
    email: string;
    token: string;
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
    expiresAt: Date;
    createdAt: Date;
}

export interface OtpCode {
    id: string;
    userId: string;
    code: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface RefreshToken {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt?: Date;
}
