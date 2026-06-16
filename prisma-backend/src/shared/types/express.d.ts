import type { RoleName } from "../constants/roles";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      sessionId: string;
      roles: RoleName[] | string[];
    }

    interface Request {
      user?: AuthUser;
      deviceId?: string;
    }
  }
}

export {};
