/**
 * Environment Configuration
 */

export const environment = {
    production: false,
    /** Direct backend URL in local dev (avoids relying on ng-serve proxy / wrong app port). */
    apiBaseUrl: 'http://localhost:3000/api/v1',
    /** Origin for static uploads — no /api suffix. */
    assetBaseUrl: 'http://localhost:3000',
    apiTimeout: 30000,
    tokenStorageKey: 'auth_token',
    refreshTokenStorageKey: 'refresh_token',
    userStorageKey: 'current_user',
};

export default environment;
