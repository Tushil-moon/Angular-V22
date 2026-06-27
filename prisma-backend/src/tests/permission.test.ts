import { Permissions } from "../shared/constants/permissions";
import { formatPermissionCode, hasAnyPermission, hasPermission, shouldScopeToOwner } from "../shared/utils/permission";
import { Roles } from "../shared/constants/roles";

describe("permission utils", () => {
  it("formats permission codes", () => {
    expect(formatPermissionCode("read", "contacts")).toBe("read:contacts");
  });

  it("grants all actions when manage:all is present", () => {
    expect(hasPermission([Permissions.ManageAll], Permissions.ReadContacts)).toBe(true);
    expect(hasPermission([Permissions.ManageAll], Permissions.ManageUsers)).toBe(true);
  });

  it("treats manage as read for the same subject", () => {
    expect(hasPermission([Permissions.ManageContacts], Permissions.ReadContacts)).toBe(true);
    expect(hasPermission([Permissions.ReadContacts], Permissions.ManageContacts)).toBe(false);
  });

  it("checks any permission", () => {
    expect(
      hasAnyPermission([Permissions.ReadContacts], [Permissions.ReadContacts, Permissions.ManageUsers]),
    ).toBe(true);
  });

  it("scopes standard users to owned records", () => {
    expect(shouldScopeToOwner([Roles.User], [Permissions.ReadContacts])).toBe(true);
    expect(shouldScopeToOwner([Roles.Manager], [Permissions.ManageContacts])).toBe(false);
    expect(shouldScopeToOwner([Roles.Admin], [Permissions.ManageAll])).toBe(false);
  });
});
