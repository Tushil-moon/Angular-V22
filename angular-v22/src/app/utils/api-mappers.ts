/**
 * API mappers — normalize backend payloads to frontend models
 */

import { User, Role, Activity, Contact, Deal } from '@models/index';

export interface ApiUserPayload {
  id: string;
  email?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  roles?: string[];
}

export interface ApiAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUserPayload;
}

export interface ApiRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const mapApiUser = (user: ApiUserPayload): User => ({
  id: user.id,
  email: user.email ?? '',
  phone: user.phone ?? undefined,
  isActive: user.status === 'ACTIVE',
  emailVerified: user.emailVerified ?? false,
  createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
  updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
  roles: user.roles?.map((name) => ({
    id: name,
    name,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

export const mapApiRole = (role: Partial<Role> & { id: string; name: string }): Role => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isActive: role.isActive ?? true,
  createdAt: role.createdAt ? new Date(role.createdAt) : new Date(),
  updatedAt: role.updatedAt ? new Date(role.updatedAt) : new Date(),
  permissions: role.permissions ?? [],
});

export interface DashboardActivity {
  id: string;
  action: string;
  description: string;
  time: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalRoles: number;
  activeSessions: number;
  systemHealth: number;
  totalContacts: number;
  openDeals: number;
  pipelineValue: number;
  pipeline: PipelineStageSummary[];
  recentActivity: DashboardActivity[];
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
  value: number;
}

export interface ApiContactPayload {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  status: string;
  notes?: string | null;
  ownerId?: string | null;
  owner?: { id: string; email: string | null } | null;
  dealCount?: number;
  activityCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ApiDealPayload {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  contactId?: string | null;
  ownerId?: string | null;
  expectedCloseDate?: string | Date | null;
  description?: string | null;
  contact?: { id: string; fullName: string; company?: string | null } | null;
  owner?: { id: string; email: string | null } | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ApiActivityPayload {
  id: string;
  type: string;
  subject: string;
  body?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  userId: string;
  user?: { id: string; email: string | null } | null;
  contact?: { id: string; fullName: string } | null;
  deal?: { id: string; title: string } | null;
  createdAt?: string | Date;
}

export const mapApiContact = (contact: ApiContactPayload): Contact => ({
  id: contact.id,
  firstName: contact.firstName,
  lastName: contact.lastName,
  fullName: contact.fullName,
  email: contact.email,
  phone: contact.phone,
  company: contact.company,
  jobTitle: contact.jobTitle,
  status: contact.status as Contact['status'],
  notes: contact.notes,
  ownerId: contact.ownerId,
  owner: contact.owner,
  dealCount: contact.dealCount,
  activityCount: contact.activityCount,
  createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
  updatedAt: contact.updatedAt ? new Date(contact.updatedAt) : new Date(),
});

export const mapApiDeal = (deal: ApiDealPayload): Deal => ({
  id: deal.id,
  title: deal.title,
  value: deal.value,
  currency: deal.currency,
  stage: deal.stage as Deal['stage'],
  contactId: deal.contactId,
  ownerId: deal.ownerId,
  expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null,
  description: deal.description,
  contact: deal.contact,
  owner: deal.owner,
  createdAt: deal.createdAt ? new Date(deal.createdAt) : new Date(),
  updatedAt: deal.updatedAt ? new Date(deal.updatedAt) : new Date(),
});

export const mapApiActivity = (activity: ApiActivityPayload): Activity => ({
  id: activity.id,
  type: activity.type as Activity['type'],
  subject: activity.subject,
  body: activity.body,
  contactId: activity.contactId,
  dealId: activity.dealId,
  userId: activity.userId,
  user: activity.user,
  contact: activity.contact,
  deal: activity.deal,
  createdAt: activity.createdAt ? new Date(activity.createdAt) : new Date(),
});
