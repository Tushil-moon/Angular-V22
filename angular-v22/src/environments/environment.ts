/**
 * Environment Configuration
 */

export const environment = {
    production: false,
    apiBaseUrl: '/api/v1',
    apiTimeout: 30000,
    tokenStorageKey: 'auth_token',
    refreshTokenStorageKey: 'refresh_token',
    userStorageKey: 'current_user',
};

export default environment;
