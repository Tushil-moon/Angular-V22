import type { RoleName } from "../constants/roles";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      sessionId: string;
      roles: RoleName[] | string[];
      permissions: string[];
      organizationId?: string;
      organizationRole?: "OWNER" | "ADMIN" | "MEMBER";
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
