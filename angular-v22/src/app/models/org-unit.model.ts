/**
 * Organization structure models — branches, departments, teams, employees
 */

export type OrgUnitType = 'BRANCH' | 'DEPARTMENT' | 'TEAM';

export interface OrgUnit {
    id: string;
    organizationId: string;
    parentId?: string | null;
    type: OrgUnitType;
    name: string;
    code?: string | null;
    description?: string | null;
    managerUserId?: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrgUnitNode extends OrgUnit {
    children: OrgUnitNode[];
}

export interface OrgUnitMember {
    id: string;
    userId: string;
    isPrimary: boolean;
    title?: string | null;
    joinedAt: Date;
    user: {
        id: string;
        email: string | null;
        status: string;
    };
}

export interface EmployeeUnitAssignment {
    id: string;
    name: string;
    type: OrgUnitType;
    code?: string | null;
    isPrimary: boolean;
    title?: string | null;
}

export interface EmployeeProfile {
    userId: string;
    role: string;
    jobTitle?: string | null;
    employeeCode?: string | null;
    managerUserId?: string | null;
    joinedAt: Date;
    user: {
        id: string;
        email: string | null;
        status: string;
    };
    manager?: {
        id: string;
        email: string | null;
    } | null;
    units: EmployeeUnitAssignment[];
}

export interface EmployeeHierarchyNode extends EmployeeProfile {
    reports: EmployeeHierarchyNode[];
}

export interface CreateOrgUnitRequest {
    type: OrgUnitType;
    name: string;
    code?: string;
    description?: string;
    parentId?: string;
    managerUserId?: string;
    sortOrder?: number;
}

export interface UpdateOrgUnitRequest {
    name?: string;
    code?: string;
    description?: string | null;
    parentId?: string | null;
    managerUserId?: string | null;
    isActive?: boolean;
    sortOrder?: number;
}

export interface UpdateEmployeeProfileRequest {
    managerUserId?: string | null;
    jobTitle?: string | null;
    employeeCode?: string | null;
}
