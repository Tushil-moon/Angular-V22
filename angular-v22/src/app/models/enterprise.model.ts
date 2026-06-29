/**
 * Enterprise CRM models (phases 2–8)
 */

export interface Quote {
    id: string;
    title: string;
    status: string;
    total: number;
    currency: string;
    validUntil?: string | null;
    dealId?: string | null;
    createdAt?: string;
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
    userId: string;
    title: string;
    type: string;
    startsAt: string;
    endsAt: string;
    contactId?: string | null;
    dealId?: string | null;
    createdAt?: string;
}

export interface Campaign {
    id: string;
    name: string;
    type: string;
    status: string;
    budget?: number | null;
    createdAt?: string;
}

export interface CaseRecord {
    id: string;
    subject: string;
    status: string;
    priority: string;
    contactId?: string | null;
    companyId?: string | null;
    assigneeId?: string | null;
    createdAt?: string;
}

export interface KnowledgeArticle {
    id: string;
    title: string;
    body: string;
    published: boolean;
    createdAt?: string;
}

export interface Report {
    id: string;
    userId: string;
    name: string;
    entityType: string;
    createdAt?: string;
}

export interface DashboardLayout {
    id: string;
    userId: string;
    name: string;
    createdAt?: string;
}

export interface Workflow {
    id: string;
    name: string;
    trigger: string;
    active: boolean;
    createdAt?: string;
}

export interface Webhook {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    createdAt?: string;
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
