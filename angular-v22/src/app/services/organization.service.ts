import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import {
  Organization,
  OrganizationMember,
  OrganizationMembership,
  OrganizationInvite,
} from '@models/index';

const mapOrganization = (payload: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}): Organization => ({
  id: payload.id,
  name: payload.name,
  slug: payload.slug,
  timezone: payload.timezone,
  currency: payload.currency,
  createdAt: payload.created_at ? new Date(payload.created_at) : new Date(),
  updatedAt: payload.updated_at ? new Date(payload.updated_at) : new Date(),
});

const mapMembership = (payload: {
  organization_id: string;
  role: OrganizationMembership['role'];
  joined_at?: string | Date;
  organization: Parameters<typeof mapOrganization>[0];
}): OrganizationMembership => ({
  organizationId: payload.organization_id,
  role: payload.role,
  joinedAt: payload.joined_at ? new Date(payload.joined_at) : new Date(),
  organization: mapOrganization(payload.organization),
});

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly httpClient = inject(HttpClientService);

  async listOrganizations(): Promise<OrganizationMembership[]> {
    const response = await this.httpClient.get<
      Array<{
        organization_id: string;
        role: OrganizationMembership['role'];
        joined_at?: string;
        organization: Parameters<typeof mapOrganization>[0];
      }>
    >('/organizations', { skipOrganization: true });
    return response.data?.map(mapMembership) ?? [];
  }

  async getCurrentOrganization(): Promise<OrganizationMembership | null> {
    const response = await this.httpClient.get<{
      organization_id: string;
      role: OrganizationMembership['role'];
      joined_at?: string;
      organization: Parameters<typeof mapOrganization>[0];
    }>('/organizations/current');
    return response.data ? mapMembership(response.data) : null;
  }

  async createOrganization(payload: {
    name: string;
    slug?: string;
    timezone?: string;
    currency?: string;
  }): Promise<Organization | null> {
    const response = await this.httpClient.post<Parameters<typeof mapOrganization>[0]>(
      '/organizations',
      payload,
      { skipOrganization: true },
    );
    return response.data ? mapOrganization(response.data) : null;
  }

  async updateOrganization(payload: {
    name?: string;
    timezone?: string;
    currency?: string;
  }): Promise<Organization | null> {
    const response = await this.httpClient.patch<Parameters<typeof mapOrganization>[0]>(
      '/organizations/current',
      payload,
    );
    return response.data ? mapOrganization(response.data) : null;
  }

  async listMembers(): Promise<OrganizationMember[]> {
    const response = await this.httpClient.get<
      Array<{
        user_id: string;
        role: OrganizationMember['role'];
        joined_at?: string;
        user: { id: string; email: string | null; status: string };
      }>
    >('/organizations/current/members');
    return (
      response.data?.map((member) => ({
        userId: member.user_id,
        role: member.role,
        joinedAt: member.joined_at ? new Date(member.joined_at) : new Date(),
        user: member.user,
      })) ?? []
    );
  }

  async inviteMember(email: string, role?: OrganizationInvite['role']): Promise<OrganizationInvite | null> {
    const response = await this.httpClient.post<{
      id: string;
      email: string;
      role: OrganizationInvite['role'];
      expires_at?: string;
      created_at?: string;
      token?: string;
    }>('/organizations/current/members/invite', { email, role });
    if (!response.data) return null;
    return {
      id: response.data.id,
      email: response.data.email,
      role: response.data.role,
      expiresAt: response.data.expires_at ? new Date(response.data.expires_at) : new Date(),
      createdAt: response.data.created_at ? new Date(response.data.created_at) : new Date(),
      token: response.data.token,
    };
  }

  async acceptInvite(token: string): Promise<Organization | null> {
    const response = await this.httpClient.post<Parameters<typeof mapOrganization>[0]>(
      `/organizations/invites/${token}/accept`,
      {},
      { skipOrganization: true },
    );
    return response.data ? mapOrganization(response.data) : null;
  }
}
