import { inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { map, Observable } from 'rxjs';

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

    readonly policyResource = rxResource({
        stream: ({ abortSignal }) => {
            throwIfAborted(abortSignal);
            return this.http
                .get<ApiSecurityPolicyPayload>('/auth/security-policy', { skipAuth: true })
                .pipe(
                    map((response) => (response.data ? mapPolicy(response.data) : null)),
                    catchResourceStreamError<SecurityPolicy | null>({
                        fallback: null,
                        logMessage: 'Failed to load security policy:',
                    }),
                );
        },
    });

    fetchSecurityStatus(): Observable<SecurityStatus | null> {
        return this.http
            .get<ApiSecurityStatusPayload>('/auth/security-status')
            .pipe(map((response) => (response.data ? mapStatus(response.data) : null)));
    }
}
