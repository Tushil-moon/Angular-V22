import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { OrganizationContextService } from '../organization-context.service';
import { TokenService } from '../token.service';
import {
    isPublicAuthRequest,
    RETRY_REQUEST,
    SKIP_AUTH,
    SKIP_ORGANIZATION,
} from './http-context.tokens';
import { HttpUnauthorizedRegistry } from './http-unauthorized.registry';
import { TokenRefreshService } from './token-refresh.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
    const tokenService = inject(TokenService);
    const organizationContext = inject(OrganizationContextService);
    const tokenRefresh = inject(TokenRefreshService);
    const unauthorizedRegistry = inject(HttpUnauthorizedRegistry);
    const injector = inject(Injector);

    const skipAuth = req.context.get(SKIP_AUTH) || isPublicAuthRequest(req.url);
    let authReq = req;

    if (!skipAuth) {
        let headers = req.headers;
        const token = tokenService.getAccessToken();

        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }

        if (!req.context.get(SKIP_ORGANIZATION)) {
            const organizationId = organizationContext.activeOrganizationId();
            if (organizationId) {
                headers = headers.set('X-Organization-Id', organizationId);
            }
        }

        authReq = req.clone({ headers });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            const shouldRefresh =
                error.status === 401 &&
                !authReq.context.get(SKIP_AUTH) &&
                !authReq.context.get(RETRY_REQUEST) &&
                !isPublicAuthRequest(authReq.url);

            if (!shouldRefresh) {
                return throwError(() => error);
            }

            return tokenRefresh.refresh().pipe(
                switchMap((accessToken) =>
                    next(
                        authReq.clone({
                            headers: authReq.headers.set('Authorization', `Bearer ${accessToken}`),
                            context: authReq.context.set(RETRY_REQUEST, true),
                        }),
                    ),
                ),
                catchError((refreshError) => {
                    unauthorizedRegistry.handleUnauthorized(injector);
                    return throwError(() => refreshError);
                }),
            );
        }),
    );
};
