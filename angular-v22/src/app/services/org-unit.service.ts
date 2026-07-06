import { inject, Injectable } from '@angular/core';
import {
    CreateOrgUnitRequest,
    EmployeeHierarchyNode,
    EmployeeProfile,
    OrgUnit,
    OrgUnitMember,
    OrgUnitNode,
    UpdateEmployeeProfileRequest,
    UpdateOrgUnitRequest,
} from '@models/index';

import { HttpClientService } from './http-client.service';

interface ApiOrgUnitPayload {
    id: string;
    organization_id: string;
    parent_id?: string | null;
    type: OrgUnit['type'];
    name: string;
    code?: string | null;
    description?: string | null;
    manager_user_id?: string | null;
    is_active: boolean;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
    children?: ApiOrgUnitPayload[];
}

interface ApiEmployeePayload {
    user_id: string;
    role: string;
    job_title?: string | null;
    employee_code?: string | null;
    manager_user_id?: string | null;
    joined_at?: string;
    user: { id: string; email: string | null; status: string };
    manager?: { id: string; email: string | null } | null;
    units?: {
        id: string;
        name: string;
        type: OrgUnit['type'];
        code?: string | null;
        is_primary: boolean;
        title?: string | null;
    }[];
    reports?: ApiEmployeePayload[];
}

const mapUnit = (payload: ApiOrgUnitPayload): OrgUnit => ({
    id: payload.id,
    organizationId: payload.organization_id,
    parentId: payload.parent_id,
    type: payload.type,
    name: payload.name,
    code: payload.code,
    description: payload.description,
    managerUserId: payload.manager_user_id,
    isActive: payload.is_active,
    sortOrder: payload.sort_order,
    createdAt: payload.created_at ? new Date(payload.created_at) : new Date(),
    updatedAt: payload.updated_at ? new Date(payload.updated_at) : new Date(),
});

const mapUnitNode = (payload: ApiOrgUnitPayload): OrgUnitNode => ({
    ...mapUnit(payload),
    children: (payload.children ?? []).map(mapUnitNode),
});

const mapEmployee = (payload: ApiEmployeePayload): EmployeeProfile => ({
    userId: payload.user_id,
    role: payload.role,
    jobTitle: payload.job_title,
    employeeCode: payload.employee_code,
    managerUserId: payload.manager_user_id,
    joinedAt: payload.joined_at ? new Date(payload.joined_at) : new Date(),
    user: payload.user,
    manager: payload.manager,
    units: (payload.units ?? []).map((unit) => ({
        id: unit.id,
        name: unit.name,
        type: unit.type,
        code: unit.code,
        isPrimary: unit.is_primary,
        title: unit.title,
    })),
});

const mapHierarchyNode = (payload: ApiEmployeePayload): EmployeeHierarchyNode => ({
    ...mapEmployee(payload),
    reports: (payload.reports ?? []).map(mapHierarchyNode),
});

@Injectable({ providedIn: 'root' })
export class OrgUnitService {
    private readonly http = inject(HttpClientService);

    async getTree(): Promise<OrgUnitNode[]> {
        const response = await this.http.get<ApiOrgUnitPayload[]>('/organizations/current/units/tree');
        return response.data?.map(mapUnitNode) ?? [];
    }

    async listUnits(): Promise<OrgUnit[]> {
        const response = await this.http.get<ApiOrgUnitPayload[]>('/organizations/current/units');
        return response.data?.map(mapUnit) ?? [];
    }

    async createUnit(payload: CreateOrgUnitRequest): Promise<OrgUnit | null> {
        const response = await this.http.post<ApiOrgUnitPayload>('/organizations/current/units', payload);
        return response.data ? mapUnit(response.data) : null;
    }

    async updateUnit(unitId: string, payload: UpdateOrgUnitRequest): Promise<OrgUnit | null> {
        const response = await this.http.patch<ApiOrgUnitPayload>(
            `/organizations/current/units/${unitId}`,
            payload,
        );
        return response.data ? mapUnit(response.data) : null;
    }

    async deleteUnit(unitId: string): Promise<void> {
        await this.http.delete(`/organizations/current/units/${unitId}`);
    }

    async listUnitMembers(unitId: string): Promise<OrgUnitMember[]> {
        const response = await this.http.get<
            {
                id: string;
                user_id: string;
                is_primary: boolean;
                title?: string | null;
                joined_at?: string;
                user: { id: string; email: string | null; status: string };
            }[]
        >(`/organizations/current/units/${unitId}/members`);

        return (
            response.data?.map((member) => ({
                id: member.id,
                userId: member.user_id,
                isPrimary: member.is_primary,
                title: member.title,
                joinedAt: member.joined_at ? new Date(member.joined_at) : new Date(),
                user: member.user,
            })) ?? []
        );
    }

    async addUnitMember(
        unitId: string,
        payload: { userId: string; isPrimary?: boolean; title?: string },
    ): Promise<void> {
        await this.http.post(`/organizations/current/units/${unitId}/members`, payload);
    }

    async removeUnitMember(unitId: string, userId: string): Promise<void> {
        await this.http.delete(`/organizations/current/units/${unitId}/members/${userId}`);
    }

    async listEmployees(): Promise<EmployeeProfile[]> {
        const response = await this.http.get<ApiEmployeePayload[]>('/organizations/current/employees');
        return response.data?.map(mapEmployee) ?? [];
    }

    async getHierarchy(): Promise<EmployeeHierarchyNode[]> {
        const response = await this.http.get<ApiEmployeePayload[]>(
            '/organizations/current/employees/hierarchy',
        );
        return response.data?.map(mapHierarchyNode) ?? [];
    }

    async updateEmployeeProfile(
        userId: string,
        payload: UpdateEmployeeProfileRequest,
    ): Promise<EmployeeProfile | null> {
        const response = await this.http.patch<ApiEmployeePayload>(
            `/organizations/current/employees/${userId}/profile`,
            payload,
        );
        return response.data ? mapEmployee(response.data) : null;
    }
}
