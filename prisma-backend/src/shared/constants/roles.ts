export const Roles = {
  Admin: "Admin",
  Manager: "Manager",
  User: "User",
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];
