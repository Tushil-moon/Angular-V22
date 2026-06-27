/**
 * Production Environment Configuration
 */

import { buildApiBaseUrl } from './build-env';

export const environment = {
    production: true,
    apiBaseUrl: buildApiBaseUrl,
    apiTimeout: 30000,
    tokenStorageKey: 'auth_token',
    refreshTokenStorageKey: 'refresh_token',
    userStorageKey: 'current_user',
};

export default environment;
