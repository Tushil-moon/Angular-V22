export const Permissions = {
    ManageAll: 'manage:all',
    ReadUsers: 'read:users',
    ManageUsers: 'manage:users',
    ReadRoles: 'read:roles',
    ManageRoles: 'manage:roles',
    ManageSessions: 'manage:sessions',
    ReadContacts: 'read:contacts',
    ManageContacts: 'manage:contacts',
    ReadDeals: 'read:deals',
    ManageDeals: 'manage:deals',
    ReadActivities: 'read:activities',
    ManageActivities: 'manage:activities',
    ReadCompanies: 'read:companies',
    ManageCompanies: 'manage:companies',
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

export const hasPermission = (userPermissions: readonly string[], required: string): boolean => {
    if (userPermissions.includes(Permissions.ManageAll)) return true;
    if (userPermissions.includes(required)) return true;

    const [action, subject] = required.split(':');
    if (action === 'read' && subject) {
        return userPermissions.includes(`manage:${subject}`);
    }

    return false;
};

export const hasAnyPermission = (userPermissions: readonly string[], required: string[]): boolean =>
    required.some((permission) => hasPermission(userPermissions, permission));
