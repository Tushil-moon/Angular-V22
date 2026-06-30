import { HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
export const SKIP_ORGANIZATION = new HttpContextToken<boolean>(() => false);
export const RETRY_REQUEST = new HttpContextToken<boolean>(() => false);

export const PUBLIC_AUTH_PATHS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/password/forgot',
    '/auth/password/reset',
    '/auth/email/verify',
    '/auth/otp/request',
    '/auth/otp/verify',
] as const;

export function isPublicAuthRequest(url: string): boolean {
    return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}
