/**
 * Enterprise CRM models (phases 2–8)
 */

export interface QuoteLineItem {
    id: string;
    productId?: string | null;
    sku?: string | null;
    name?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
    sortOrder: number;
}

export interface Quote {
    id: string;
    title: string;
    quoteNumber?: string | null;
    status: string;
    subtotal: number;
    discountPercent: number;
    taxPercent: number;
    total: number;
    currency: string;
    validUntil?: string | null;
    notes?: string | null;
    dealId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    ownerId?: string | null;
    deal?: { id: string; title: string } | null;
    contact?: { id: string; fullName: string } | null;
    company?: { id: string; name: string } | null;
    lineItems?: QuoteLineItem[];
    sentAt?: string | null;
    acceptedAt?: string | null;
    rejectedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface Product {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    unitPrice: number;
    currency: string;
    category?: string | null;
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface QuoteHistoryEntry {
    id: string;
    action: string;
    details?: Record<string, unknown>;
    createdAt: string;
    user?: { id: string; email: string | null } | null;
}

export interface ForecastPeriod {
    id: string;
    userId: string;
    periodStart: string;
    periodEnd: string;
    quota: number;
    closedAmount: number;
    createdAt?: string;
}

export interface LeadScoreRule {
    id: string;
    name: string;
    field: string;
    operator: string;
    value: string;
    points: number;
    active: boolean;
    createdAt?: string;
}

export interface CalendarEvent {
    id: string;
    organizationId?: string;
    userId: string;
    title: string;
    type: string;
    status: string;
    description?: string | null;
    location?: string | null;
    timezone?: string;
    isAllDay?: boolean;
    startsAt: string;
    endsAt: string;
    contactId?: string | null;
    dealId?: string | null;
    companyId?: string | null;
    leadId?: string | null;
    activityId?: string | null;
    syncProvider?: string;
    externalCalendarId?: string | null;
    externalEventId?: string | null;
    lastSyncedAt?: string | null;
    contact?: { id: string; fullName: string } | null;
    deal?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    attendees?: {
        id: string;
        userId?: string | null;
        email?: string | null;
        name?: string | null;
        status: string;
    }[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CalendarAvailabilityRule {
    id: string;
    userId: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    timezone: string;
    isActive: boolean;
}

export interface CalendarHistoryEntry {
    id: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: string;
    user?: { id: string; email: string | null } | null;
}

export interface CampaignMember {
    id: string;
    campaignId: string;
    contactId: string;
    status: string;
    contact?: { id: string; fullName: string; email?: string | null } | null;
}

export interface CampaignHistoryEntry {
    id: string;
    action: string;
    details?: Record<string, unknown>;
    createdAt: string;
    user?: { id: string; email: string | null } | null;
}

export interface Campaign {
    id: string;
    name: string;
    description?: string | null;
    type: string;
    status: string;
    budget?: number | null;
    ownerId?: string | null;
    emailTemplateId?: string | null;
    emailSequenceId?: string | null;
    sentCount?: number;
    openedCount?: number;
    clickedCount?: number;
    startDate?: string | null;
    endDate?: string | null;
    activatedAt?: string | null;
    completedAt?: string | null;
    owner?: { id: string; email: string | null } | null;
    emailTemplate?: { id: string; name: string; subject: string } | null;
    emailSequence?: { id: string; name: string } | null;
    members?: CampaignMember[];
    createdAt?: string;
    updatedAt?: string;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    bodyHtml: string;
    category?: string | null;
    previewText?: string | null;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface SequenceStep {
    id: string;
    sequenceId: string;
    order: number;
    delayDays: number;
    templateId: string;
    template?: { id: string; name: string; subject: string } | null;
}

export interface EmailSequence {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
    steps?: SequenceStep[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CaseComment {
    id: string;
    caseId: string;
    userId: string;
    body: string;
    isInternal: boolean;
    createdAt: string;
    user?: { id: string; email: string | null } | null;
}

export interface CaseRecord {
    id: string;
    subject: string;
    caseNumber?: string | null;
    description?: string | null;
    status: string;
    priority: string;
    contactId?: string | null;
    companyId?: string | null;
    assigneeId?: string | null;
    queueId?: string | null;
    slaPolicyId?: string | null;
    firstResponseDueAt?: string | null;
    resolutionDueAt?: string | null;
    firstRespondedAt?: string | null;
    resolvedAt?: string | null;
    closedAt?: string | null;
    slaBreached?: boolean;
    contact?: { id: string; fullName: string } | null;
    company?: { id: string; name: string } | null;
    assignee?: { id: string; email: string | null } | null;
    queue?: { id: string; name: string } | null;
    slaPolicy?: {
        id: string;
        name: string;
        firstResponseHours: number;
        resolutionHours: number;
    } | null;
    comments?: CaseComment[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CaseHistoryEntry {
    id: string;
    action: string;
    details?: Record<string, unknown>;
    createdAt: string;
    user?: { id: string; email: string | null } | null;
}

export interface KnowledgeArticle {
    id: string;
    title: string;
    slug?: string | null;
    summary?: string | null;
    body: string;
    category?: string | null;
    published: boolean;
    publishedAt?: string | null;
    viewCount?: number;
    authorId?: string | null;
    author?: { id: string; email: string | null } | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface SlaPolicy {
    id: string;
    name: string;
    description?: string | null;
    priority: string;
    firstResponseHours: number;
    resolutionHours: number;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface SupportQueue {
    id: string;
    name: string;
    description?: string | null;
    slaPolicyId?: string | null;
    isDefault: boolean;
    slaPolicy?: { id: string; name: string } | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ReportRun {
    id: string;
    reportId: string;
    status: string;
    rowCount: number;
    result?: {
        columns?: { key: string; label: string }[];
        rows?: Record<string, string | number | null>[];
        summary?: Record<string, number>;
    } | null;
    errorMessage?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    createdAt?: string;
}

export interface Report {
    id: string;
    userId: string;
    name: string;
    description?: string | null;
    entityType: string;
    chartType?: string;
    isShared?: boolean;
    config?: Record<string, unknown>;
    lastRunAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface DashboardLayout {
    id: string;
    userId: string;
    name: string;
    description?: string | null;
    isDefault?: boolean;
    isShared?: boolean;
    widgets?: Record<string, unknown>[];
    createdAt?: string;
    updatedAt?: string;
}

export interface AnalyticsOverview {
    reportCount: number;
    layoutCount: number;
    sharedReports: number;
    recentRuns: ReportRun[];
}

export interface WorkflowStepRun {
    id: string;
    runId: string;
    stepOrder: number;
    actionType: string;
    status: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown> | null;
    errorMessage?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    createdAt?: string;
}

export interface WorkflowRun {
    id: string;
    workflowId: string;
    triggerEvent: string;
    status: string;
    context?: Record<string, unknown>;
    errorMessage?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    workflow?: { id: string; name: string; trigger: string } | null;
    steps?: WorkflowStepRun[];
    createdAt?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string | null;
    trigger: string;
    active: boolean;
    definition?: Record<string, unknown>;
    runCount?: number;
    lastRunAt?: string | null;
    ownerId?: string | null;
    owner?: { id: string; email: string | null } | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: string;
    status: string;
    attempts: number;
    responseStatus?: number | null;
    errorMessage?: string | null;
    lastAttemptAt?: string | null;
    completedAt?: string | null;
    payload?: Record<string, unknown>;
    createdAt?: string;
}

export interface Webhook {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface AiFeatureFlag {
    id: string;
    feature: string;
    enabled: boolean;
    createdAt?: string;
}

export interface AiInsight {
    id: string;
    entityType: string;
    entityId: string;
    type: string;
    createdAt?: string;
}

export interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    expiresAt?: string | null;
    createdAt?: string;
}

export interface CustomFieldDefinition {
    id: string;
    entityType: string;
    key: string;
    label: string;
    fieldType: string;
    createdAt?: string;
}

export interface Territory {
    id: string;
    name: string;
    createdAt?: string;
}
