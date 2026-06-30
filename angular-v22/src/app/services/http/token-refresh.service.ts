import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env';
import { ApiResponse } from '@models/index';
import { ApiRefreshResponsePayload, mapApiRefreshResponse } from '@utils/api-mappers';
import { finalize, Observable, shareReplay, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { TokenService } from '../token.service';
import { SKIP_AUTH } from './http-context.tokens';

@Injectable({
    providedIn: 'root',
})
export class TokenRefreshService {
    private readonly http = inject(HttpClient);
    private readonly tokenService = inject(TokenService);

    private refresh$: Observable<string> | null = null;

    refresh(): Observable<string> {
        if (!this.refresh$) {
            this.refresh$ = this.performRefresh().pipe(
                finalize(() => {
                    this.refresh$ = null;
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        }

        return this.refresh$;
    }

    private performRefresh(): Observable<string> {
        const refreshToken = this.tokenService.getRefreshToken();
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }

        const url = `${environment.apiBaseUrl}/auth/refresh`;
        const context = new HttpContext().set(SKIP_AUTH, true);

        return this.http
            .post<ApiResponse<ApiRefreshResponsePayload>>(
                url,
                { refreshToken },
                { context, withCredentials: true },
            )
            .pipe(
                map((response) => {
                    const tokens = response.data ? mapApiRefreshResponse(response.data) : null;
                    if (!tokens?.accessToken || !tokens?.refreshToken) {
                        throw new Error('Invalid refresh token response');
                    }

                    this.tokenService.setTokens(tokens.accessToken, tokens.refreshToken);
                    return tokens.accessToken;
                }),
            );
    }
}
