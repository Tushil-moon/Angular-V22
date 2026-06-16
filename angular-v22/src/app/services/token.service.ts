/**
 * Token Service — access/refresh token storage
 */

import { Injectable } from '@angular/core';
import { environment } from '@env';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  getAccessToken(): string | null {
    return localStorage.getItem(environment.tokenStorageKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(environment.refreshTokenStorageKey);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(environment.tokenStorageKey, token);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(environment.refreshTokenStorageKey, token);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(environment.tokenStorageKey);
    localStorage.removeItem(environment.refreshTokenStorageKey);
  }

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }
}
