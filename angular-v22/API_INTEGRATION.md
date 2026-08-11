# API Integration Guide

Complete guide for integrating your Angular v22 frontend with the Prisma backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Angular Frontend (v22)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Components  │  │   Services   │  │   Guards     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                      │
│                    ┌──────────────┐                             │
│                    │  rxResource  │                             │
│                    │  + Signals   │                             │
│                    └──────────────┘                             │
│                           │                                      │
│                    ┌──────────────┐                             │
│                    │ HttpClient   │                             │
│                    │  + RxJS      │                             │
│                    └──────────────┘                             │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │  API Gateway / Backend     │
              │  (Prisma Backend - Port   │
              │   3000)                   │
              └───────────────────────────┘
```

## API Endpoints Reference

### Authentication Endpoints

#### Sign Up
```
POST /api/auth/signup
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clh7...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2026-06-04T09:30:00Z",
      "updatedAt": "2026-06-04T09:30:00Z"
    }
  }
}
```

#### Sign In
```
POST /api/auth/signin
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

#### Sign Out
```
POST /api/auth/signout
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "Successfully signed out"
}
```

#### Verify Email
```
POST /api/auth/verify-email
Content-Type: application/json

Request:
{
  "token": "verification_token_from_email"
}

Response:
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### Forgot Password
```
POST /api/auth/forgot-password
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

Request:
{
  "token": "reset_token_from_email",
  "password": "NewPassword123"
}

Response:
{
  "success": true,
  "message": "Password reset successfully"
}
```

### User Endpoints

#### Get All Users
```
GET /api/users?page=1&pageSize=10&search=query
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "data": [ ... users array ... ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10,
    "hasMore": true
  }
}
```

#### Get User by ID
```
GET /api/users/{userId}
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "id": "clh7...",
    "email": "user@example.com",
    ...
  }
}
```

#### Create User
```
POST /api/users
Authorization: Bearer <accessToken>
Content-Type: application/json

Request:
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "data": {
    "id": "clh8...",
    "email": "newuser@example.com",
    ...
  }
}
```

#### Update User
```
PUT /api/users/{userId}
Authorization: Bearer <accessToken>
Content-Type: application/json

Request:
{
  "email": "updated@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "isActive": true
}

Response:
{
  "success": true,
  "data": {
    "id": "clh8...",
    "email": "updated@example.com",
    ...
  }
}
```

#### Delete User
```
DELETE /api/users/{userId}
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Role Endpoints

#### Get All Roles
```
GET /api/roles?page=1&pageSize=10
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "data": [ ... roles array ... ],
    "total": 12,
    "page": 1,
    "pageSize": 10,
    "totalPages": 2,
    "hasMore": true
  }
}
```

#### Get Role by ID
```
GET /api/roles/{roleId}
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "id": "clh9...",
    "name": "Admin",
    "description": "Administrator role",
    "isActive": true,
    "permissions": [ ... ]
  }
}
```

#### Create Role
```
POST /api/roles
Authorization: Bearer <accessToken>
Content-Type: application/json

Request:
{
  "name": "Editor",
  "description": "Editor role for content management",
  "isActive": true,
  "permissionIds": ["perm1", "perm2"]
}

Response:
{
  "success": true,
  "data": {
    "id": "clha...",
    "name": "Editor",
    ...
  }
}
```

#### Update Role
```
PUT /api/roles/{roleId}
Authorization: Bearer <accessToken>
Content-Type: application/json

Request:
{
  "name": "Editor",
  "description": "Updated description",
  "isActive": true
}

Response:
{
  "success": true,
  "data": {
    "id": "clha...",
    ...
  }
}
```

#### Delete Role
```
DELETE /api/roles/{roleId}
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "Role deleted successfully"
}
```

### Permission Endpoints

#### Get All Permissions
```
GET /api/permissions
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": [
    {
      "id": "perm1",
      "name": "View Users",
      "code": "users:read",
      "resource": "users",
      "action": "READ"
    },
    ...
  ]
}
```

## Implementation Patterns

This project uses **RxJS Observables** end-to-end. Do **not** use `async`/`await` or `firstValueFrom` in application code.

### Using the HTTP Client Service

`HttpClientService` wraps Angular `HttpClient` and returns `Observable<ApiResponse<T>>`.

```typescript
import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, of, tap } from 'rxjs';
import { HttpClientService } from '@services/http-client.service';

@Injectable({ providedIn: 'root' })
export class MyResourceService {
  private readonly httpClient = inject(HttpClientService);
  private readonly isLoadingSignal = signal(false);

  readonly isLoading = computed(() => this.isLoadingSignal());

  loadData(): void {
    this.isLoadingSignal.set(true);

    this.httpClient
      .get<MyDataType>('/endpoint', { params: { page: 1, limit: 10 } })
      .pipe(
        tap((response) => {
          if (response.data) {
            // Use the data
          }
        }),
        map(() => undefined),
        catchError((error) => {
          console.error('Error:', error);
          return of(undefined);
        }),
        finalize(() => this.isLoadingSignal.set(false)),
      )
      .subscribe();
  }
}
```

### Async reads with `rxResource`

Use **`rxResource`** from `@angular/core/rxjs-interop` for signal-driven data loading (lists, session restore, policy fetch).

```typescript
import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { HttpClientService } from '@services/http-client.service';
import { AuthService } from '@services/auth.service';

@Injectable({ providedIn: 'root' })
export class MyListService {
  private readonly http = inject(HttpClientService);
  private readonly auth = inject(AuthService);

  readonly listResource = rxResource({
    params: () => (this.auth.isAuthenticated() ? { page: 1 } : undefined),
    stream: ({ params, abortSignal }) => {
      if (!params) return of([]);

      return this.http.get<MyType[]>('/endpoint', { params }).pipe(
        map((response) => response.data ?? []),
        catchResourceStreamError<MyType[]>({
          fallback: [],
          logMessage: 'Failed to load list:',
        }),
      );
    },
  });

  readonly items = computed(() => this.listResource.value() ?? []);
  readonly isLoading = computed(() => this.listResource.isLoading());

  reload(): void {
    this.listResource.reload();
  }
}
```

### Mutations (sign-in, save, delete)

Service methods return `Observable<void>` (or the created entity). Components subscribe — no `async` handlers.

```typescript
// Service
signIn(request: SignInRequest): Observable<void> {
  return this.http.post<ApiAuthResponsePayload>('/auth/login', request, { skipAuth: true }).pipe(
    tap((response) => {
      if (response.data) this.applyAuth(response.data);
    }),
    map(() => undefined),
    catchError((error) => {
      this.errorMessage.set(this.toMessage(error, 'Sign in failed.'));
      return throwError(() => error);
    }),
    finalize(() => this.loading.set(false)),
  );
}

// Component
onSubmit(): void {
  this.auth.signIn(this.model()).pipe(
    switchMap(() => from(this.router.navigate(['/dashboard']))),
  ).subscribe({
    error: () => this.toast.error('Sign in failed', this.auth.error() ?? ''),
  });
}
```

### Route guards

Guards return `Observable<boolean | UrlTree>`. Wait for session bootstrap with `ensureSessionReady()`:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@services/index';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSessionReady().pipe(
    map(() => (auth.isAuthenticated() ? true : router.parseUrl('/auth/signin'))),
  );
};
```

### Using data in components

```typescript
export class MyComponent {
  myResourceService = inject(MyListService);

  // Template: {{ myResourceService.items() }}
  // Loading: myResourceService.isLoading()
}
```

## Error Handling

The HTTP client automatically handles errors and provides error objects:

```typescript
{
  code: string;        // Error code from API
  message: string;     // Human-readable message
  statusCode: number;  // HTTP status code
  details?: {          // Field-specific errors
    fieldName: ['error message']
  }
}
```

### Handling validation errors

Handle errors in the Observable chain or in `subscribe({ error })`:

```typescript
this.auth.signUp(data).subscribe({
  next: () => this.router.navigate(['/dashboard']),
  error: (err: unknown) => {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Sign up failed.';
    this.toast.error('Sign up failed', message);
  },
});
```

For `rxResource` streams, use `catchResourceStreamError<T>()` from `@shared/utils/resource-error` to map API errors to `Error` instances or emit a fallback value.

## Authentication Flow

1. **Login**: POST `/api/auth/signin` → Returns `accessToken` and `refreshToken`
2. **Store**: Tokens stored in localStorage
3. **Include**: HTTP client automatically includes `Authorization: Bearer <token>` header
4. **Auto-refresh**: On 401 response, automatically refresh token
5. **Redirect**: If refresh fails, redirect to login

## CORS Configuration

Ensure your backend has CORS enabled:

```typescript
// In Prisma backend
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
```

## Development vs Production URLs

Update in `src/environments/environment.ts` and `src/environments/environment.production.ts`:

```typescript
export const environment = {
  apiBaseUrl: process.env['NG_APP_API_URL'] || 'http://localhost:3000/api'
};
```

## Testing API Calls

Use Postman or similar tool:

1. Set base URL: `http://localhost:3000/api`
2. Add Authorization header: `Bearer <token>`
3. Test endpoints following the patterns above

## Best Practices

1. **Type safety** — Always specify response types in HTTP calls
2. **Observables only** — No `async`/`await` or `firstValueFrom` in app code; use RxJS operators (`pipe`, `tap`, `map`, `switchMap`, `catchError`, `finalize`)
3. **Reads vs writes** — Use `rxResource` for reads; return `Observable` from service mutation methods
4. **Loading state** — Derive from `resource.isLoading()` or service signals updated in `finalize`
5. **Signal-driven UI** — Expose data via signals/computed; templates call `signal()` functions
6. **Separation** — API logic in services, UI in components
7. **Validation** — Validate with Zod + `safeValidate()` before calling the API
8. **Guards** — Return Observables from `CanActivateFn`; use `ensureSessionReady()` before auth checks
9. **Enterprise lists** — Pass `Observable`-returning callbacks to `EnterpriseListShellComponent` (`listFn`, `createFn`, `deleteFn`)

---

For agent conventions, see [`.agent/rules/frontend.md`](./.agent/rules/frontend.md).
