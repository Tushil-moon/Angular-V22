import type { AuthContext } from "../types/auth-context";

export interface OrganizationContext {
  organizationId: string;
  organizationRole: "OWNER" | "ADMIN" | "MEMBER";
}

export type ScopedAuthContext = AuthContext & OrganizationContext;
