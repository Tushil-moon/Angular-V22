export const Permissions = {
  ManageAll: "manage:all",
  ReadUsers: "read:users",
  ManageUsers: "manage:users",
  ReadRoles: "read:roles",
  ManageRoles: "manage:roles",
  ReadSessions: "read:sessions",
  ManageSessions: "manage:sessions",
  ReadOrganizations: "read:organizations",
  ManageOrganizations: "manage:organizations",
  ReadOrgUnits: "read:org_units",
  ManageOrgUnits: "manage:org_units",
  ReadContacts: "read:contacts",
  ManageContacts: "manage:contacts",
  ReadLeads: "read:leads",
  ManageLeads: "manage:leads",
  ReadDeals: "read:deals",
  ManageDeals: "manage:deals",
  ReadActivities: "read:activities",
  ManageActivities: "manage:activities",
  ReadCompanies: "read:companies",
  ManageCompanies: "manage:companies",
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS = Object.values(Permissions);
