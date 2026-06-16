/**
 * Production Environment Configuration
 */

export const environment = {
  production: true,
  apiBaseUrl: 'https://api.example.com/api/v1',
  apiTimeout: 30000,
  tokenStorageKey: 'auth_token',
  refreshTokenStorageKey: 'refresh_token',
  userStorageKey: 'current_user',
};

export default environment;
