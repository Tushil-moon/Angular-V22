/**
 * API mappers — normalize snake_case backend payloads to frontend models
 */

import { User, Role, Activity, Contact, Deal, Company, PaginatedResponse, CrmTag, SearchResult, SavedView } from '@models/index';

/** Raw API payloads use snake_case keys (see backend api-design rule). */

export interface ApiUserPayload {
  id: string;
  email?: string | null;
  phone?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  status?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  roles?: string[];
  permissions?: string[];
}

export interface ApiAuthResponsePayload {
  access_token: string;
  refresh_token: string;
  user: ApiUserPayload;
}

export interface ApiRefreshResponsePayload {
  access_token: string;
  refresh_token: string;
}

export interface ApiRolePayload {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
  permissions?: Array<{ id: string; action: string; subject: string; code?: string }>;
}

export interface ApiSessionPayload {
  id: string;
  device_id: string;
  device_name?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  created_at: string;
  last_active_at: string;
  revoked_at?: string | null;
  current?: boolean;
}

export interface ApiPaginatedPayload<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_more: boolean;
}

export interface ApiDashboardActivityPayload {
  id: string;
  action: string;
  description: string;
  time: string;
  created_at: string;
}

export interface ApiPipelineStagePayload {
  stage: string;
  count: number;
  value: number;
}

export interface ApiDashboardStatsPayload {
  total_users: number;
  total_roles: number;
  active_sessions: number;
  system_health: number;
  total_contacts: number;
  open_deals: number;
  pipeline_value: number;
  pipeline: ApiPipelineStagePayload[];
  recent_activity: ApiDashboardActivityPayload[];
}

export interface ApiTagPayload {
  id: string;
  name: string;
  color: string;
  created_at?: string | Date;
}

export interface ApiCompanyPayload {
  id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  size?: string | null;
  website?: string | null;
  address?: string | null;
  owner_id?: string | null;
  notes?: string | null;
  owner?: { id: string; email: string | null } | null;
  contact_count?: number;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ApiContactPayload {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  company_id?: string | null;
  company_ref?: { id: string; name: string; domain?: string | null } | null;
  job_title?: string | null;
  status: string;
  notes?: string | null;
  owner_id?: string | null;
  owner?: { id: string; email: string | null } | null;
  tags?: ApiTagPayload[];
  deal_count?: number;
  activity_count?: number;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ApiDealContactPayload {
  id: string;
  full_name: string;
  company?: string | null;
}

export interface ApiDealPayload {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  contact_id?: string | null;
  owner_id?: string | null;
  expected_close_date?: string | Date | null;
  description?: string | null;
  contact?: ApiDealContactPayload | null;
  owner?: { id: string; email: string | null } | null;
  tags?: ApiTagPayload[];
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ApiActivityPayload {
  id: string;
  type: string;
  subject: string;
  body?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  user_id: string;
  due_at?: string | Date | null;
  completed_at?: string | Date | null;
  user?: { id: string; email: string | null } | null;
  contact?: { id: string; full_name: string } | null;
  deal?: { id: string; title: string } | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

/** Frontend-facing dashboard types (camelCase). */
export interface DashboardActivity {
  id: string;
  action: string;
  description: string;
  time: string;
  createdAt: string;
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
  value: number;
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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** @deprecated Use ApiAuthResponsePayload — kept for gradual migration */
export type ApiAuthResponse = ApiAuthResponsePayload;

/** @deprecated Use ApiRefreshResponsePayload */
export type ApiRefreshResponse = ApiRefreshResponsePayload;

export const mapApiAuthResponse = (payload: ApiAuthResponsePayload): AuthTokens & { user: User } => ({
  accessToken: payload.access_token,
  refreshToken: payload.refresh_token,
  user: mapApiUser(payload.user),
});

export const mapApiRefreshResponse = (payload: ApiRefreshResponsePayload): AuthTokens => ({
  accessToken: payload.access_token,
  refreshToken: payload.refresh_token,
});

export const mapApiUser = (user: ApiUserPayload): User => ({
  id: user.id,
  email: user.email ?? '',
  phone: user.phone ?? undefined,
  isActive: user.status === 'ACTIVE',
  emailVerified: user.email_verified ?? false,
  createdAt: user.created_at ? new Date(user.created_at) : new Date(),
  updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
  permissions: user.permissions ?? [],
  roles: user.roles?.map((name) => ({
    id: name,
    name,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

export const mapApiRole = (role: ApiRolePayload): Role => ({
  id: role.id,
  name: role.name,
  description: role.description ?? undefined,
  isActive: role.is_active ?? true,
  createdAt: role.created_at ? new Date(role.created_at) : new Date(),
  updatedAt: role.updated_at ? new Date(role.updated_at) : new Date(),
  permissions: role.permissions?.map((permission) => ({
    id: permission.id,
    name: permission.code ?? `${permission.action}:${permission.subject}`,
    code: permission.code ?? `${permission.action}:${permission.subject}`,
    resource: permission.subject,
    action: 'READ' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

export const mapApiSession = (session: ApiSessionPayload) => ({
  id: session.id,
  deviceId: session.device_id,
  deviceName: session.device_name,
  userAgent: session.user_agent,
  ipAddress: session.ip_address,
  createdAt: session.created_at,
  lastActiveAt: session.last_active_at,
  revokedAt: session.revoked_at,
  current: session.current,
});

export const mapApiDashboardStats = (stats: ApiDashboardStatsPayload): DashboardStats => ({
  totalUsers: stats.total_users,
  totalRoles: stats.total_roles,
  activeSessions: stats.active_sessions,
  systemHealth: stats.system_health,
  totalContacts: stats.total_contacts,
  openDeals: stats.open_deals,
  pipelineValue: stats.pipeline_value,
  pipeline: stats.pipeline,
  recentActivity: stats.recent_activity.map((item) => ({
    id: item.id,
    action: item.action,
    description: item.description,
    time: item.time,
    createdAt: item.created_at,
  })),
});

export const mapApiPaginated = <TApi, TModel>(
  payload: ApiPaginatedPayload<TApi>,
  mapItem: (item: TApi) => TModel,
): PaginatedResponse<TModel> => ({
  data: payload.data.map(mapItem),
  total: payload.total,
  page: payload.page,
  pageSize: payload.page_size,
  totalPages: payload.total_pages,
  hasMore: payload.has_more,
});

export const mapApiTag = (tag: ApiTagPayload): CrmTag => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
});

export const mapApiCompany = (company: ApiCompanyPayload): Company => ({
  id: company.id,
  name: company.name,
  domain: company.domain,
  industry: company.industry,
  size: company.size,
  website: company.website,
  address: company.address,
  ownerId: company.owner_id,
  notes: company.notes,
  owner: company.owner,
  contactCount: company.contact_count,
  createdAt: company.created_at ? new Date(company.created_at) : new Date(),
  updatedAt: company.updated_at ? new Date(company.updated_at) : new Date(),
});

export const mapApiContact = (contact: ApiContactPayload): Contact => ({
  id: contact.id,
  firstName: contact.first_name,
  lastName: contact.last_name,
  fullName: contact.full_name,
  email: contact.email,
  phone: contact.phone,
  company: contact.company,
  companyId: contact.company_id,
  companyRef: contact.company_ref,
  jobTitle: contact.job_title,
  status: contact.status as Contact['status'],
  notes: contact.notes,
  ownerId: contact.owner_id,
  owner: contact.owner,
  tags: contact.tags?.map(mapApiTag),
  dealCount: contact.deal_count,
  activityCount: contact.activity_count,
  createdAt: contact.created_at ? new Date(contact.created_at) : new Date(),
  updatedAt: contact.updated_at ? new Date(contact.updated_at) : new Date(),
});

export const mapApiDeal = (deal: ApiDealPayload): Deal => ({
  id: deal.id,
  title: deal.title,
  value: deal.value,
  currency: deal.currency,
  stage: deal.stage as Deal['stage'],
  contactId: deal.contact_id,
  ownerId: deal.owner_id,
  expectedCloseDate: deal.expected_close_date ? new Date(deal.expected_close_date) : null,
  description: deal.description,
  contact: deal.contact
    ? {
        id: deal.contact.id,
        fullName: deal.contact.full_name,
        company: deal.contact.company,
      }
    : null,
  owner: deal.owner,
  tags: deal.tags?.map(mapApiTag),
  createdAt: deal.created_at ? new Date(deal.created_at) : new Date(),
  updatedAt: deal.updated_at ? new Date(deal.updated_at) : new Date(),
});

export const mapApiActivity = (activity: ApiActivityPayload): Activity => ({
  id: activity.id,
  type: activity.type as Activity['type'],
  subject: activity.subject,
  body: activity.body,
  contactId: activity.contact_id,
  dealId: activity.deal_id,
  userId: activity.user_id,
  dueAt: activity.due_at ? new Date(activity.due_at) : null,
  completedAt: activity.completed_at ? new Date(activity.completed_at) : null,
  user: activity.user,
  contact: activity.contact
    ? {
        id: activity.contact.id,
        fullName: activity.contact.full_name,
      }
    : null,
  deal: activity.deal,
  createdAt: activity.created_at ? new Date(activity.created_at) : new Date(),
  updatedAt: activity.updated_at ? new Date(activity.updated_at) : new Date(),
});

export const mapApiSearchResult = (result: {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  route: string;
}): SearchResult => ({
  type: result.type as SearchResult['type'],
  id: result.id,
  title: result.title,
  subtitle: result.subtitle,
  route: result.route,
});

export const mapApiSavedView = (view: {
  id: string;
  user_id: string;
  entity_type: string;
  name: string;
  filters: Record<string, unknown>;
  sort?: Record<string, unknown> | null;
  columns?: string[] | null;
  is_default: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}): SavedView => ({
  id: view.id,
  userId: view.user_id,
  entityType: view.entity_type as SavedView['entityType'],
  name: view.name,
  filters: view.filters,
  sort: view.sort,
  columns: view.columns,
  isDefault: view.is_default,
  createdAt: view.created_at ? new Date(view.created_at) : new Date(),
  updatedAt: view.updated_at ? new Date(view.updated_at) : new Date(),
});
