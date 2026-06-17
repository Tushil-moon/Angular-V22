export interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
  organizationId?: string;
  organizationRole?: "OWNER" | "ADMIN" | "MEMBER";
}
