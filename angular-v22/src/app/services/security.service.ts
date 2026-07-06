import { inject, Injectable, resource } from '@angular/core';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

import { HttpClientService } from './http-client.service';

export interface PasswordPolicyRule {
    id: string;
    label: string;
}

export interface SecurityPolicy {
    minLength: number;
    rules: PasswordPolicyRule[];
    historyCount: number;
    maxLoginAttempts: number;
    lockoutMinutes: number;
}

export interface SecurityStatus {
    emailVerified: boolean;
    phoneVerified: boolean;
    mustChangePassword: boolean;
    passwordChangedAt?: string | null;
    twoFactorEnabled: boolean;
    twoFactorReady: boolean;
}

interface ApiSecurityPolicyPayload {
    min_length: number;
    rules: PasswordPolicyRule[];
    history_count: number;
    max_login_attempts: number;
    lockout_minutes: number;
}

interface ApiSecurityStatusPayload {
    email_verified: boolean;
    phone_verified: boolean;
    must_change_password: boolean;
    password_changed_at?: string | null;
    two_factor_enabled: boolean;
    two_factor_ready: boolean;
}

const mapPolicy = (payload: ApiSecurityPolicyPayload): SecurityPolicy => ({
    minLength: payload.min_length,
    rules: payload.rules,
    historyCount: payload.history_count,
    maxLoginAttempts: payload.max_login_attempts,
    lockoutMinutes: payload.lockout_minutes,
});

const mapStatus = (payload: ApiSecurityStatusPayload): SecurityStatus => ({
    emailVerified: payload.email_verified,
    phoneVerified: payload.phone_verified,
    mustChangePassword: payload.must_change_password,
    passwordChangedAt: payload.password_changed_at,
    twoFactorEnabled: payload.two_factor_enabled,
    twoFactorReady: payload.two_factor_ready,
});

@Injectable({ providedIn: 'root' })
export class SecurityService {
    private readonly http = inject(HttpClientService);

    readonly policyResource = resource({
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const response = await this.http.get<ApiSecurityPolicyPayload>(
                        '/auth/security-policy',
                        { skipAuth: true },
                    );
                    return response.data ? mapPolicy(response.data) : null;
                },
                { fallback: null, logMessage: 'Failed to load security policy:' },
            ),
    });

    async fetchSecurityStatus(): Promise<SecurityStatus | null> {
        const response = await this.http.get<ApiSecurityStatusPayload>('/auth/security-status');
        return response.data ? mapStatus(response.data) : null;
    }
}
