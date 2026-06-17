export const Permissions = {
  ManageAll: "manage:all",
  ReadUsers: "read:users",
  ManageUsers: "manage:users",
  ReadRoles: "read:roles",
  ManageRoles: "manage:roles",
  ManageSessions: "manage:sessions",
  ReadContacts: "read:contacts",
  ManageContacts: "manage:contacts",
  ReadDeals: "read:deals",
  ManageDeals: "manage:deals",
  ReadActivities: "read:activities",
  ManageActivities: "manage:activities",
  ReadCompanies: "read:companies",
  ManageCompanies: "manage:companies",
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS = Object.values(Permissions);
