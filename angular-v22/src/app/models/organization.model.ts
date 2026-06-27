/**
 * Organization models
 */

export type OrganizationMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrganizationMembership {
    organizationId: string;
    role: OrganizationMemberRole;
    joinedAt: Date;
    organization: Organization;
}

export interface OrganizationMember {
    userId: string;
    role: OrganizationMemberRole;
    joinedAt: Date;
    user: {
        id: string;
        email: string | null;
        status: string;
    };
}

export interface OrganizationInvite {
    id: string;
    email: string;
    role: OrganizationMemberRole;
    expiresAt: Date;
    createdAt: Date;
    token?: string;
}
