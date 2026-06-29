/**
 * Enterprise CRM API mappers (snake_case → camelCase)
 */

import type {
    AiFeatureFlag,
    AiInsight,
    ApiKey,
    CalendarEvent,
    Campaign,
    CaseRecord,
    CustomFieldDefinition,
    DashboardLayout,
    ForecastPeriod,
    KnowledgeArticle,
    LeadScoreRule,
    Quote,
    Report,
    Territory,
    Webhook,
    Workflow,
} from '@models/enterprise.model';
import { mapApiPaginated, type ApiPaginatedPayload } from '@utils/api-mappers';
import type { PaginatedResponse } from '@models/index';

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const bool = (v: unknown): boolean => Boolean(v);

export const mapApiQuote = (item: Record<string, unknown>): Quote => ({
    id: str(item['id']),
    title: str(item['title']),
    status: str(item['status']),
    total: num(item['total']),
    currency: str(item['currency'] || 'USD'),
    validUntil: item['valid_until'] != null ? str(item['valid_until']) : null,
    dealId: item['deal_id'] != null ? str(item['deal_id']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiForecast = (item: Record<string, unknown>): ForecastPeriod => ({
    id: str(item['id']),
    userId: str(item['user_id']),
    periodStart: str(item['period_start']),
    periodEnd: str(item['period_end']),
    quota: num(item['quota']),
    closedAmount: num(item['closed_amount']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiLeadScoreRule = (item: Record<string, unknown>): LeadScoreRule => ({
    id: str(item['id']),
    name: str(item['name']),
    field: str(item['field']),
    operator: str(item['operator']),
    value: str(item['value']),
    points: num(item['points']),
    active: bool(item['active']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiCalendarEvent = (item: Record<string, unknown>): CalendarEvent => ({
    id: str(item['id']),
    userId: str(item['user_id']),
    title: str(item['title']),
    type: str(item['type']),
    startsAt: str(item['starts_at']),
    endsAt: str(item['ends_at']),
    contactId: item['contact_id'] != null ? str(item['contact_id']) : null,
    dealId: item['deal_id'] != null ? str(item['deal_id']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiCampaign = (item: Record<string, unknown>): Campaign => ({
    id: str(item['id']),
    name: str(item['name']),
    type: str(item['type']),
    status: str(item['status']),
    budget: item['budget'] != null ? num(item['budget']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiCase = (item: Record<string, unknown>): CaseRecord => ({
    id: str(item['id']),
    subject: str(item['subject']),
    status: str(item['status']),
    priority: str(item['priority']),
    contactId: item['contact_id'] != null ? str(item['contact_id']) : null,
    companyId: item['company_id'] != null ? str(item['company_id']) : null,
    assigneeId: item['assignee_id'] != null ? str(item['assignee_id']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiKnowledgeArticle = (item: Record<string, unknown>): KnowledgeArticle => ({
    id: str(item['id']),
    title: str(item['title']),
    body: str(item['body']),
    published: bool(item['published']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiReport = (item: Record<string, unknown>): Report => ({
    id: str(item['id']),
    userId: str(item['user_id']),
    name: str(item['name']),
    entityType: str(item['entity_type']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiDashboardLayout = (item: Record<string, unknown>): DashboardLayout => ({
    id: str(item['id']),
    userId: str(item['user_id']),
    name: str(item['name']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiWorkflow = (item: Record<string, unknown>): Workflow => ({
    id: str(item['id']),
    name: str(item['name']),
    trigger: str(item['trigger']),
    active: bool(item['active']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiWebhook = (item: Record<string, unknown>): Webhook => ({
    id: str(item['id']),
    url: str(item['url']),
    events: Array.isArray(item['events']) ? item['events'].map(str) : [],
    active: bool(item['active']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiAiFeatureFlag = (item: Record<string, unknown>): AiFeatureFlag => ({
    id: str(item['id']),
    feature: str(item['feature']),
    enabled: bool(item['enabled']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiAiInsight = (item: Record<string, unknown>): AiInsight => ({
    id: str(item['id']),
    entityType: str(item['entity_type']),
    entityId: str(item['entity_id']),
    type: str(item['type']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiApiKey = (item: Record<string, unknown>): ApiKey => ({
    id: str(item['id']),
    name: str(item['name']),
    prefix: str(item['prefix']),
    expiresAt: item['expires_at'] != null ? str(item['expires_at']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiCustomField = (item: Record<string, unknown>): CustomFieldDefinition => ({
    id: str(item['id']),
    entityType: str(item['entity_type']),
    key: str(item['key']),
    label: str(item['label']),
    fieldType: str(item['field_type']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiTerritory = (item: Record<string, unknown>): Territory => ({
    id: str(item['id']),
    name: str(item['name']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapEnterprisePaginated = <T>(
    payload: ApiPaginatedPayload<Record<string, unknown>> | undefined,
    mapItem: (item: Record<string, unknown>) => T,
): PaginatedResponse<T> => {
    if (!payload) {
        return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }
    return mapApiPaginated(payload, mapItem);
};
