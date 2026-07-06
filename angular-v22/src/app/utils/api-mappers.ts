/**
 * API mappers — normalize snake_case backend payloads to frontend models
 */

import {
    Activity,
    Company,
    Contact,
    ContactAddressType,
    ContactEmailType,
    ContactPhoneType,
    CrmTag,
    Deal,
    Lead,
    LeadHistoryEntry,
    PaginatedResponse,
    Role,
    SavedView,
    SavedViewFilters,
    SearchResult,
    SocialPlatform,
    User,
} from '@models/index';

/** Raw API payloads use snake_case keys (see backend api-design rule). */

export interface ApiUserPayload {
    id: string;
    email?: string | null;
    phone?: string | null;
    email_verified?: boolean;
    phone_verified?: boolean;
    must_change_password?: boolean;
    password_changed_at?: string | null;
    two_factor_enabled?: boolean;
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
    permissions?: { id: string; action: string; subject: string; code?: string }[];
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

export interface ApiSavedViewPayload {
    id: string;
    user_id: string;
    entity_type: string;
    name: string;
    filters: Record<string, unknown>;
    sort?: Record<string, unknown> | null;
    columns?: string[] | null;
    is_default: boolean;
    created_at: string | Date;
    updated_at: string | Date;
}

export interface ApiCompanyPayload {
    id: string;
    name: string;
    domain?: string | null;
    industry?: string | null;
    size?: string | null;
    website?: string | null;
    address?: string | null;
    parent_company_id?: string | null;
    parent_company?: { id: string; name: string; domain?: string | null } | null;
    employee_count?: number | null;
    annual_revenue?: number | null;
    revenue_currency?: string | null;
    ownership_percent?: number | null;
    owner_id?: string | null;
    notes?: string | null;
    owner?: { id: string; email: string | null } | null;
    locations?: {
        id: string;
        label?: string | null;
        line1: string;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
        is_primary: boolean;
        is_headquarters: boolean;
    }[];
    contact_count?: number;
    subsidiary_count?: number;
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
    lead_source?: string | null;
    source_detail?: string | null;
    notes?: string | null;
    owner_id?: string | null;
    owner?: { id: string; email: string | null } | null;
    tags?: ApiTagPayload[];
    emails?: {
        id: string;
        email: string;
        type: string;
        is_primary: boolean;
    }[];
    phones?: {
        id: string;
        phone: string;
        type: string;
        is_primary: boolean;
    }[];
    addresses?: {
        id: string;
        label?: string | null;
        line1: string;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
        type: string;
        is_primary: boolean;
    }[];
    social_links?: {
        id: string;
        platform: string;
        url: string;
    }[];
    deal_count?: number;
    activity_count?: number;
    created_at?: string | Date;
    updated_at?: string | Date;
}

export interface ApiDealContactPayload {
    id: string;
    full_name: string;
    company?: string | null;
    email?: string | null;
}

export interface ApiDealPayload {
    id: string;
    title: string;
    value: number;
    currency: string;
    stage: string;
    pipeline_id?: string | null;
    pipeline_stage_id?: string | null;
    contact_id?: string | null;
    company_id?: string | null;
    lead_id?: string | null;
    owner_id?: string | null;
    probability?: number;
    weighted_value?: number;
    expected_close_date?: string | Date | null;
    description?: string | null;
    win_reason?: string | null;
    loss_reason?: string | null;
    competitor?: string | null;
    closed_at?: string | Date | null;
    sort_order?: number;
    contact?: ApiDealContactPayload | null;
    company?: { id: string; name: string; domain?: string | null } | null;
    pipeline_stage?: {
        id: string;
        name: string;
        stage_key: string;
        probability: number;
        is_closed: boolean;
        is_won: boolean;
    } | null;
    owner?: { id: string; email: string | null } | null;
    tags?: ApiTagPayload[];
    created_at?: string | Date;
    updated_at?: string | Date;
}

export interface ApiActivityPayload {
    id: string;
    type: string;
    status: string;
    priority: string;
    subject: string;
    body?: string | null;
    contact_id?: string | null;
    deal_id?: string | null;
    company_id?: string | null;
    lead_id?: string | null;
    user_id: string;
    assignee_id?: string | null;
    due_at?: string | Date | null;
    started_at?: string | Date | null;
    completed_at?: string | Date | null;
    reminder_at?: string | Date | null;
    duration_minutes?: number | null;
    location?: string | null;
    series_id?: string | null;
    recurrence_frequency?: string | null;
    recurrence_interval?: number | null;
    recurrence_end_at?: string | Date | null;
    is_recurrence_template?: boolean;
    user?: { id: string; email: string | null } | null;
    assignee?: { id: string; email: string | null } | null;
    contact?: { id: string; full_name: string } | null;
    deal?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    lead?: { id: string; full_name: string } | null;
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

export const mapApiAuthResponse = (
    payload: ApiAuthResponsePayload,
): AuthTokens & { user: User } => ({
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
    mustChangePassword: user.must_change_password ?? false,
    twoFactorEnabled: user.two_factor_enabled ?? false,
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

export const mapApiSavedView = (view: ApiSavedViewPayload): SavedView => ({
    id: view.id,
    userId: view.user_id,
    entityType: view.entity_type as SavedView['entityType'],
    name: view.name,
    filters: (view.filters ?? {}) as SavedViewFilters,
    sort: view.sort ?? null,
    columns: view.columns ?? null,
    isDefault: view.is_default,
    createdAt: String(view.created_at),
    updatedAt: String(view.updated_at),
});

export const mapApiCompany = (company: ApiCompanyPayload): Company => ({
    id: company.id,
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    size: company.size,
    website: company.website,
    address: company.address,
    parentCompanyId: company.parent_company_id,
    parentCompany: company.parent_company,
    employeeCount: company.employee_count,
    annualRevenue: company.annual_revenue,
    revenueCurrency: company.revenue_currency,
    ownershipPercent: company.ownership_percent,
    ownerId: company.owner_id,
    notes: company.notes,
    owner: company.owner,
    locations: company.locations?.map((entry) => ({
        id: entry.id,
        label: entry.label,
        line1: entry.line1,
        line2: entry.line2,
        city: entry.city,
        state: entry.state,
        postalCode: entry.postal_code,
        country: entry.country,
        isPrimary: entry.is_primary,
        isHeadquarters: entry.is_headquarters,
    })),
    contactCount: company.contact_count,
    subsidiaryCount: company.subsidiary_count,
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
    leadSource: contact.lead_source as Contact['leadSource'],
    sourceDetail: contact.source_detail,
    notes: contact.notes,
    ownerId: contact.owner_id,
    owner: contact.owner,
    tags: contact.tags?.map(mapApiTag),
    emails: contact.emails?.map((entry) => ({
        id: entry.id,
        email: entry.email,
        type: entry.type as ContactEmailType,
        isPrimary: entry.is_primary,
    })),
    phones: contact.phones?.map((entry) => ({
        id: entry.id,
        phone: entry.phone,
        type: entry.type as ContactPhoneType,
        isPrimary: entry.is_primary,
    })),
    addresses: contact.addresses?.map((entry) => ({
        id: entry.id,
        label: entry.label,
        line1: entry.line1,
        line2: entry.line2,
        city: entry.city,
        state: entry.state,
        postalCode: entry.postal_code,
        country: entry.country,
        type: entry.type as ContactAddressType,
        isPrimary: entry.is_primary,
    })),
    socialLinks: contact.social_links?.map((entry) => ({
        id: entry.id,
        platform: entry.platform as SocialPlatform,
        url: entry.url,
    })),
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
    pipelineId: deal.pipeline_id,
    pipelineStageId: deal.pipeline_stage_id,
    contactId: deal.contact_id,
    companyId: deal.company_id,
    leadId: deal.lead_id,
    ownerId: deal.owner_id,
    probability: deal.probability ?? deal.pipeline_stage?.probability ?? 0,
    weightedValue: deal.weighted_value ?? 0,
    expectedCloseDate: deal.expected_close_date ? new Date(deal.expected_close_date) : null,
    description: deal.description,
    winReason: deal.win_reason,
    lossReason: deal.loss_reason,
    competitor: deal.competitor,
    closedAt: deal.closed_at ? new Date(deal.closed_at) : null,
    sortOrder: deal.sort_order,
    contact: deal.contact
        ? {
              id: deal.contact.id,
              fullName: deal.contact.full_name,
              company: deal.contact.company,
              email: deal.contact.email,
          }
        : null,
    company: deal.company
        ? {
              id: deal.company.id,
              name: deal.company.name,
              domain: deal.company.domain,
          }
        : null,
    pipelineStage: deal.pipeline_stage
        ? {
              id: deal.pipeline_stage.id,
              name: deal.pipeline_stage.name,
              stageKey: deal.pipeline_stage.stage_key as Deal['stage'],
              probability: deal.pipeline_stage.probability,
              isClosed: deal.pipeline_stage.is_closed,
              isWon: deal.pipeline_stage.is_won,
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
    status: activity.status as Activity['status'],
    priority: activity.priority as Activity['priority'],
    subject: activity.subject,
    body: activity.body,
    contactId: activity.contact_id,
    dealId: activity.deal_id,
    companyId: activity.company_id,
    leadId: activity.lead_id,
    userId: activity.user_id,
    assigneeId: activity.assignee_id,
    dueAt: activity.due_at ? new Date(activity.due_at) : null,
    startedAt: activity.started_at ? new Date(activity.started_at) : null,
    completedAt: activity.completed_at ? new Date(activity.completed_at) : null,
    reminderAt: activity.reminder_at ? new Date(activity.reminder_at) : null,
    durationMinutes: activity.duration_minutes ?? null,
    location: activity.location ?? null,
    seriesId: activity.series_id ?? null,
    recurrenceFrequency: (activity.recurrence_frequency as Activity['recurrenceFrequency']) ?? null,
    recurrenceInterval: activity.recurrence_interval ?? null,
    recurrenceEndAt: activity.recurrence_end_at ? new Date(activity.recurrence_end_at) : null,
    isRecurrenceTemplate: activity.is_recurrence_template ?? false,
    user: activity.user,
    assignee: activity.assignee,
    contact: activity.contact
        ? {
              id: activity.contact.id,
              fullName: activity.contact.full_name,
          }
        : null,
    deal: activity.deal,
    company: activity.company ?? null,
    lead: activity.lead
        ? {
              id: activity.lead.id,
              fullName: activity.lead.full_name,
          }
        : null,
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

export interface ApiLeadPayload {
    id: string;
    organization_id: string;
    contact_id: string;
    stage: string;
    score: number;
    rating?: string | null;
    next_follow_up_at?: string | Date | null;
    qualified_at?: string | Date | null;
    converted_at?: string | Date | null;
    lost_at?: string | Date | null;
    lost_reason?: string | null;
    qualification_notes?: string | null;
    last_scored_at?: string | Date | null;
    contact: ApiContactPayload;
    created_at?: string | Date;
    updated_at?: string | Date;
}

export const mapApiLead = (lead: ApiLeadPayload): Lead => ({
    id: lead.id,
    organizationId: lead.organization_id,
    contactId: lead.contact_id,
    stage: lead.stage as Lead['stage'],
    score: lead.score,
    rating: (lead.rating as Lead['rating']) ?? null,
    nextFollowUpAt: lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null,
    qualifiedAt: lead.qualified_at ? new Date(lead.qualified_at) : null,
    convertedAt: lead.converted_at ? new Date(lead.converted_at) : null,
    lostAt: lead.lost_at ? new Date(lead.lost_at) : null,
    lostReason: lead.lost_reason,
    qualificationNotes: lead.qualification_notes,
    lastScoredAt: lead.last_scored_at ? new Date(lead.last_scored_at) : null,
    contact: mapApiContact(lead.contact),
    createdAt: lead.created_at ? new Date(lead.created_at) : new Date(),
    updatedAt: lead.updated_at ? new Date(lead.updated_at) : new Date(),
});

export const mapApiLeadHistory = (entry: {
    id: string;
    action: string;
    details: Record<string, unknown>;
    created_at?: string | Date;
    user?: { id: string; email: string | null } | null;
}): LeadHistoryEntry => ({
    id: entry.id,
    action: entry.action as LeadHistoryEntry['action'],
    details: entry.details ?? {},
    createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
    user: entry.user ?? null,
});
