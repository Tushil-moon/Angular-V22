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
│                    │  Signals     │                             │
│                    │ (State Mgmt) │                             │
│                    └──────────────┘                             │
│                           │                                      │
│                    ┌──────────────┐                             │
│                    │ HTTP Client  │                             │
│                    │  (Axios)     │                             │
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

### Using the HTTP Client Service

```typescript
// In a component or service
constructor(private httpClient: HttpClientService) {}

async loadData(): Promise<void> {
  try {
    const response = await this.httpClient.get<MyDataType>('/endpoint', {
      params: { page: 1, limit: 10 }
    });
    
    if (response.data) {
      // Use the data
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Creating Services for API Resources

```typescript
@Injectable({ providedIn: 'root' })
export class MyResourceService {
  private readonly dataSignal = signal<MyType[]>([]);
  readonly data = computed(() => this.dataSignal());

  constructor(private httpClient: HttpClientService) {}

  async fetch(): Promise<void> {
    try {
      const response = await this.httpClient.get<MyType[]>('/endpoint');
      if (response.data) {
        this.dataSignal.set(response.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }
}
```

### Using Data in Components

```typescript
export class MyComponent {
  myResourceService = inject(MyResourceService);

  // Access in template: {{ myResourceService.data() }}
  // Reactively updates when signal changes
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

### Handling Validation Errors

```typescript
try {
  await this.authService.signUp(data);
} catch (error: unknown) {
  if (error instanceof Error && error.message.includes('validation')) {
    // Handle validation errors
  }
}
```

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

1. **Type Safety**: Always specify response types in HTTP calls
2. **Error Handling**: Always wrap API calls in try-catch
3. **Loading States**: Use service signals for loading state
4. **Signal-Driven**: Keep all data in signals for reactivity
5. **Separation**: Keep API logic in services, UI in components
6. **Validation**: Validate data before sending to API
7. **Documentation**: Document custom endpoints in your code

---

For more information, see [DEVELOPMENT.md](./DEVELOPMENT.md)
