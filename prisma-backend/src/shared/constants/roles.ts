export const Roles = {
  SuperAdmin: "Super Admin",
  Admin: "Admin",
  Manager: "Manager",
  Sales: "Sales",
  Support: "Support",
  Finance: "Finance",
  Marketing: "Marketing",
  User: "User",
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];
