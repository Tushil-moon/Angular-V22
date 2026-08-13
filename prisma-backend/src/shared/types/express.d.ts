import type { RoleName } from "../constants/roles";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      sessionId: string;
      roles: RoleName[] | string[];
      permissions: string[];
      storeId?: string;
    }

    interface Request {
      user?: AuthUser;
      deviceId?: string;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
