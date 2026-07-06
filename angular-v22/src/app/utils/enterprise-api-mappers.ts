/**
 * Enterprise CRM API mappers (snake_case → camelCase)
 */

import type {
    AiFeatureFlag,
    AiInsight,
    AnalyticsOverview,
    ApiKey,
    CalendarEvent,
    Campaign,
    CampaignHistoryEntry,
    CampaignMember,
    CaseComment,
    CaseHistoryEntry,
    CaseRecord,
    CustomFieldDefinition,
    DashboardLayout,
    EmailSequence,
    EmailTemplate,
    ForecastPeriod,
    KnowledgeArticle,
    LeadScoreRule,
    Product,
    Quote,
    QuoteHistoryEntry,
    QuoteLineItem,
    Report,
    ReportRun,
    SequenceStep,
    SlaPolicy,
    SupportQueue,
    Territory,
    Webhook,
    WebhookDelivery,
    Workflow,
    WorkflowRun,
    WorkflowStepRun,
} from '@models/enterprise.model';
import type { PaginatedResponse } from '@models/index';
import { type ApiPaginatedPayload,mapApiPaginated } from '@utils/api-mappers';

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const bool = (v: unknown): boolean => Boolean(v);

export const mapApiQuoteLineItem = (item: Record<string, unknown>): QuoteLineItem => ({
    id: str(item['id']),
    productId: item['product_id'] != null ? str(item['product_id']) : null,
    sku: item['sku'] != null ? str(item['sku']) : null,
    name: item['name'] != null ? str(item['name']) : null,
    description: str(item['description']),
    quantity: num(item['quantity']),
    unitPrice: num(item['unit_price'] ?? item['unitPrice']),
    discountPercent: num(item['discount_percent'] ?? item['discountPercent']),
    lineTotal: num(item['line_total'] ?? item['lineTotal']),
    sortOrder: num(item['sort_order'] ?? item['sortOrder']),
});

export const mapApiQuote = (item: Record<string, unknown>): Quote => ({
    id: str(item['id']),
    title: str(item['title']),
    quoteNumber: item['quote_number'] != null ? str(item['quote_number']) : null,
    status: str(item['status']),
    subtotal: num(item['subtotal']),
    discountPercent: num(item['discount_percent'] ?? item['discountPercent']),
    taxPercent: num(item['tax_percent'] ?? item['taxPercent']),
    total: num(item['total']),
    currency: str(item['currency'] || 'USD'),
    validUntil: item['valid_until'] != null ? str(item['valid_until']) : null,
    notes: item['notes'] != null ? str(item['notes']) : null,
    dealId: item['deal_id'] != null ? str(item['deal_id']) : null,
    contactId: item['contact_id'] != null ? str(item['contact_id']) : null,
    companyId: item['company_id'] != null ? str(item['company_id']) : null,
    ownerId: item['owner_id'] != null ? str(item['owner_id']) : null,
    deal: item['deal'] as Quote['deal'],
    contact: item['contact'] as Quote['contact'],
    company: item['company'] as Quote['company'],
    lineItems: Array.isArray(item['line_items'] ?? item['lineItems'])
        ? ((item['line_items'] ?? item['lineItems']) as Record<string, unknown>[]).map(
              (line) => mapApiQuoteLineItem(line),
          )
        : [],
    sentAt: item['sent_at'] != null ? str(item['sent_at']) : null,
    acceptedAt: item['accepted_at'] != null ? str(item['accepted_at']) : null,
    rejectedAt: item['rejected_at'] != null ? str(item['rejected_at']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
});

export const mapApiProduct = (item: Record<string, unknown>): Product => ({
    id: str(item['id']),
    sku: str(item['sku']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    unitPrice: num(item['unit_price'] ?? item['unitPrice']),
    currency: str(item['currency'] || 'USD'),
    category: item['category'] != null ? str(item['category']) : null,
    status: str(item['status']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
});

export const mapApiQuoteHistoryEntry = (item: Record<string, unknown>): QuoteHistoryEntry => ({
    id: str(item['id']),
    action: str(item['action']),
    details: (item['details'] as Record<string, unknown>) ?? {},
    createdAt: str(item['created_at']),
    user: item['user'] as QuoteHistoryEntry['user'],
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
    organizationId: item['organization_id'] != null ? str(item['organization_id']) : undefined,
    userId: str(item['user_id']),
    title: str(item['title']),
    type: str(item['type']),
    status: str(item['status'] ?? 'CONFIRMED'),
    description: item['description'] != null ? str(item['description']) : null,
    location: item['location'] != null ? str(item['location']) : null,
    timezone: item['timezone'] != null ? str(item['timezone']) : undefined,
    isAllDay: bool(item['is_all_day']),
    startsAt: str(item['starts_at'] ?? item['startsAt']),
    endsAt: str(item['ends_at'] ?? item['endsAt']),
    contactId: item['contact_id'] != null ? str(item['contact_id']) : item['contactId'] != null ? str(item['contactId']) : null,
    dealId: item['deal_id'] != null ? str(item['deal_id']) : item['dealId'] != null ? str(item['dealId']) : null,
    companyId: item['company_id'] != null ? str(item['company_id']) : null,
    leadId: item['lead_id'] != null ? str(item['lead_id']) : null,
    activityId: item['activity_id'] != null ? str(item['activity_id']) : null,
    syncProvider: item['sync_provider'] != null ? str(item['sync_provider']) : undefined,
    externalCalendarId: item['external_calendar_id'] != null ? str(item['external_calendar_id']) : null,
    externalEventId: item['external_event_id'] != null ? str(item['external_event_id']) : null,
    lastSyncedAt: item['last_synced_at'] != null ? str(item['last_synced_at']) : null,
    contact:
        item['contact'] && typeof item['contact'] === 'object'
            ? {
                  id: str((item['contact'] as Record<string, unknown>)['id']),
                  fullName: str(
                      (item['contact'] as Record<string, unknown>)['full_name'] ??
                          (item['contact'] as Record<string, unknown>)['fullName'],
                  ),
              }
            : null,
    deal:
        item['deal'] && typeof item['deal'] === 'object'
            ? {
                  id: str((item['deal'] as Record<string, unknown>)['id']),
                  title: str((item['deal'] as Record<string, unknown>)['title']),
              }
            : null,
    company:
        item['company'] && typeof item['company'] === 'object'
            ? {
                  id: str((item['company'] as Record<string, unknown>)['id']),
                  name: str((item['company'] as Record<string, unknown>)['name']),
              }
            : null,
    attendees: Array.isArray(item['attendees'])
        ? (item['attendees'] as Record<string, unknown>[]).map((attendee) => ({
              id: str(attendee['id']),
              userId: attendee['user_id'] != null ? str(attendee['user_id']) : null,
              email: attendee['email'] != null ? str(attendee['email']) : null,
              name: attendee['name'] != null ? str(attendee['name']) : null,
              status: str(attendee['status']),
          }))
        : undefined,
    createdAt: item['created_at'] != null ? str(item['created_at']) : item['createdAt'] != null ? str(item['createdAt']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : item['updatedAt'] != null ? str(item['updatedAt']) : undefined,
});

export const mapApiCampaignMember = (item: Record<string, unknown>): CampaignMember => ({
    id: str(item['id']),
    campaignId: str(item['campaign_id'] ?? item['campaignId']),
    contactId: str(item['contact_id'] ?? item['contactId']),
    status: str(item['status']),
    contact: item['contact'] as CampaignMember['contact'],
});

export const mapApiCampaign = (item: Record<string, unknown>): Campaign => ({
    id: str(item['id']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    type: str(item['type']),
    status: str(item['status']),
    budget: item['budget'] != null ? num(item['budget']) : null,
    ownerId: item['owner_id'] != null ? str(item['owner_id']) : item['ownerId'] != null ? str(item['ownerId']) : null,
    emailTemplateId:
        item['email_template_id'] != null
            ? str(item['email_template_id'])
            : item['emailTemplateId'] != null
              ? str(item['emailTemplateId'])
              : null,
    emailSequenceId:
        item['email_sequence_id'] != null
            ? str(item['email_sequence_id'])
            : item['emailSequenceId'] != null
              ? str(item['emailSequenceId'])
              : null,
    sentCount: num(item['sent_count'] ?? item['sentCount']),
    openedCount: num(item['opened_count'] ?? item['openedCount']),
    clickedCount: num(item['clicked_count'] ?? item['clickedCount']),
    startDate: item['start_date'] != null ? str(item['start_date']) : item['startDate'] != null ? str(item['startDate']) : null,
    endDate: item['end_date'] != null ? str(item['end_date']) : item['endDate'] != null ? str(item['endDate']) : null,
    activatedAt:
        item['activated_at'] != null ? str(item['activated_at']) : item['activatedAt'] != null ? str(item['activatedAt']) : null,
    completedAt:
        item['completed_at'] != null ? str(item['completed_at']) : item['completedAt'] != null ? str(item['completedAt']) : null,
    owner: item['owner'] as Campaign['owner'],
    emailTemplate: item['email_template'] as Campaign['emailTemplate'],
    emailSequence: item['email_sequence'] as Campaign['emailSequence'],
    members: Array.isArray(item['members'])
        ? (item['members'] as Record<string, unknown>[]).map(mapApiCampaignMember)
        : [],
    createdAt: item['created_at'] != null ? str(item['created_at']) : item['createdAt'] != null ? str(item['createdAt']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : item['updatedAt'] != null ? str(item['updatedAt']) : undefined,
});

export const mapApiCampaignHistoryEntry = (item: Record<string, unknown>): CampaignHistoryEntry => ({
    id: str(item['id']),
    action: str(item['action']),
    details: (item['details'] as Record<string, unknown>) ?? {},
    createdAt: str(item['created_at'] ?? item['createdAt']),
    user: item['user'] as CampaignHistoryEntry['user'],
});

export const mapApiEmailTemplate = (item: Record<string, unknown>): EmailTemplate => ({
    id: str(item['id']),
    name: str(item['name']),
    subject: str(item['subject']),
    bodyHtml: str(item['body_html'] ?? item['bodyHtml']),
    category: item['category'] != null ? str(item['category']) : null,
    previewText: item['preview_text'] != null ? str(item['preview_text']) : item['previewText'] != null ? str(item['previewText']) : null,
    active: bool(item['active']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : item['createdAt'] != null ? str(item['createdAt']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : item['updatedAt'] != null ? str(item['updatedAt']) : undefined,
});

export const mapApiSequenceStep = (item: Record<string, unknown>): SequenceStep => ({
    id: str(item['id']),
    sequenceId: str(item['sequence_id'] ?? item['sequenceId']),
    order: num(item['order']),
    delayDays: num(item['delay_days'] ?? item['delayDays']),
    templateId: str(item['template_id'] ?? item['templateId']),
    template: item['template'] as SequenceStep['template'],
});

export const mapApiEmailSequence = (item: Record<string, unknown>): EmailSequence => ({
    id: str(item['id']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    active: bool(item['active']),
    steps: Array.isArray(item['steps'])
        ? (item['steps'] as Record<string, unknown>[]).map(mapApiSequenceStep)
        : [],
    createdAt: item['created_at'] != null ? str(item['created_at']) : item['createdAt'] != null ? str(item['createdAt']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : item['updatedAt'] != null ? str(item['updatedAt']) : undefined,
});

export const mapApiCaseComment = (item: Record<string, unknown>): CaseComment => ({
    id: str(item['id']),
    caseId: str(item['case_id'] ?? item['caseId']),
    userId: str(item['user_id'] ?? item['userId']),
    body: str(item['body']),
    isInternal: bool(item['is_internal'] ?? item['isInternal']),
    createdAt: str(item['created_at'] ?? item['createdAt']),
    user: item['user'] as CaseComment['user'],
});

export const mapApiCase = (item: Record<string, unknown>): CaseRecord => ({
    id: str(item['id']),
    subject: str(item['subject']),
    caseNumber: item['case_number'] != null ? str(item['case_number']) : null,
    description: item['description'] != null ? str(item['description']) : null,
    status: str(item['status']),
    priority: str(item['priority']),
    contactId: item['contact_id'] != null ? str(item['contact_id']) : null,
    companyId: item['company_id'] != null ? str(item['company_id']) : null,
    assigneeId: item['assignee_id'] != null ? str(item['assignee_id']) : null,
    queueId: item['queue_id'] != null ? str(item['queue_id']) : null,
    slaPolicyId: item['sla_policy_id'] != null ? str(item['sla_policy_id']) : null,
    firstResponseDueAt:
        item['first_response_due_at'] != null ? str(item['first_response_due_at']) : null,
    resolutionDueAt: item['resolution_due_at'] != null ? str(item['resolution_due_at']) : null,
    firstRespondedAt:
        item['first_responded_at'] != null ? str(item['first_responded_at']) : null,
    resolvedAt: item['resolved_at'] != null ? str(item['resolved_at']) : null,
    closedAt: item['closed_at'] != null ? str(item['closed_at']) : null,
    slaBreached: bool(item['sla_breached'] ?? item['slaBreached']),
    contact: item['contact'] as CaseRecord['contact'],
    company: item['company'] as CaseRecord['company'],
    assignee: item['assignee'] as CaseRecord['assignee'],
    queue: item['queue'] as CaseRecord['queue'],
    slaPolicy: item['sla_policy'] as CaseRecord['slaPolicy'],
    comments: Array.isArray(item['comments'])
        ? (item['comments'] as Record<string, unknown>[]).map(mapApiCaseComment)
        : [],
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
});

export const mapApiCaseHistoryEntry = (item: Record<string, unknown>): CaseHistoryEntry => ({
    id: str(item['id']),
    action: str(item['action']),
    details: (item['details'] as Record<string, unknown>) ?? {},
    createdAt: str(item['created_at']),
    user: item['user'] as CaseHistoryEntry['user'],
});

export const mapApiKnowledgeArticle = (item: Record<string, unknown>): KnowledgeArticle => ({
    id: str(item['id']),
    title: str(item['title']),
    slug: item['slug'] != null ? str(item['slug']) : null,
    summary: item['summary'] != null ? str(item['summary']) : null,
    body: str(item['body']),
    category: item['category'] != null ? str(item['category']) : null,
    published: bool(item['published']),
    publishedAt: item['published_at'] != null ? str(item['published_at']) : null,
    viewCount: num(item['view_count'] ?? item['viewCount']),
    authorId: item['author_id'] != null ? str(item['author_id']) : null,
    author: item['author'] as KnowledgeArticle['author'],
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
});

export const mapApiSlaPolicy = (item: Record<string, unknown>): SlaPolicy => ({
    id: str(item['id']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    priority: str(item['priority']),
    firstResponseHours: num(item['first_response_hours'] ?? item['firstResponseHours']),
    resolutionHours: num(item['resolution_hours'] ?? item['resolutionHours']),
    active: bool(item['active']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
});

export const mapApiSupportQueue = (item: Record<string, unknown>): SupportQueue => ({
    id: str(item['id']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    slaPolicyId: item['sla_policy_id'] != null ? str(item['sla_policy_id']) : null,
    isDefault: bool(item['is_default'] ?? item['isDefault']),
    slaPolicy: item['sla_policy'] as SupportQueue['slaPolicy'],
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
});

export const mapApiReportRun = (item: Record<string, unknown>): ReportRun => ({
    id: str(item['id']),
    reportId: str(item['report_id'] ?? item['reportId']),
    status: str(item['status']),
    rowCount: num(item['row_count'] ?? item['rowCount']),
    result: item['result'] as ReportRun['result'],
    errorMessage: item['error_message'] != null ? str(item['error_message']) : null,
    startedAt: item['started_at'] != null ? str(item['started_at']) : null,
    completedAt: item['completed_at'] != null ? str(item['completed_at']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiReport = (item: Record<string, unknown>): Report => ({
    id: str(item['id']),
    userId: str(item['user_id'] ?? item['userId']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    entityType: str(item['entity_type'] ?? item['entityType']),
    chartType: item['chart_type'] != null ? str(item['chart_type']) : item['chartType'] != null ? str(item['chartType']) : undefined,
    isShared: bool(item['is_shared'] ?? item['isShared']),
    config: (item['config'] as Record<string, unknown>) ?? {},
    lastRunAt: item['last_run_at'] != null ? str(item['last_run_at']) : item['lastRunAt'] != null ? str(item['lastRunAt']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : item['createdAt'] != null ? str(item['createdAt']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : item['updatedAt'] != null ? str(item['updatedAt']) : undefined,
});

export const mapApiDashboardLayout = (item: Record<string, unknown>): DashboardLayout => ({
    id: str(item['id']),
    userId: str(item['user_id'] ?? item['userId']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    isDefault: bool(item['is_default'] ?? item['isDefault']),
    isShared: bool(item['is_shared'] ?? item['isShared']),
    widgets: Array.isArray(item['widgets']) ? (item['widgets'] as Record<string, unknown>[]) : [],
    createdAt: item['created_at'] != null ? str(item['created_at']) : item['createdAt'] != null ? str(item['createdAt']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : item['updatedAt'] != null ? str(item['updatedAt']) : undefined,
});

export const mapApiAnalyticsOverview = (item: Record<string, unknown>): AnalyticsOverview => ({
    reportCount: num(item['report_count'] ?? item['reportCount']),
    layoutCount: num(item['layout_count'] ?? item['layoutCount']),
    sharedReports: num(item['shared_reports'] ?? item['sharedReports']),
    recentRuns: Array.isArray(item['recent_runs'] ?? item['recentRuns'])
        ? ((item['recent_runs'] ?? item['recentRuns']) as Record<string, unknown>[]).map(mapApiReportRun)
        : [],
});

export const mapApiWorkflowStepRun = (item: Record<string, unknown>): WorkflowStepRun => ({
    id: str(item['id']),
    runId: str(item['run_id'] ?? item['runId']),
    stepOrder: num(item['step_order'] ?? item['stepOrder']),
    actionType: str(item['action_type'] ?? item['actionType']),
    status: str(item['status']),
    input: (item['input'] as Record<string, unknown>) ?? {},
    output: (item['output'] as Record<string, unknown>) ?? null,
    errorMessage: item['error_message'] != null ? str(item['error_message']) : null,
    startedAt: item['started_at'] != null ? str(item['started_at']) : null,
    completedAt: item['completed_at'] != null ? str(item['completed_at']) : null,
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiWorkflowRun = (item: Record<string, unknown>): WorkflowRun => ({
    id: str(item['id']),
    workflowId: str(item['workflow_id'] ?? item['workflowId']),
    triggerEvent: str(item['trigger_event'] ?? item['triggerEvent']),
    status: str(item['status']),
    context: (item['context'] as Record<string, unknown>) ?? {},
    errorMessage: item['error_message'] != null ? str(item['error_message']) : null,
    startedAt: item['started_at'] != null ? str(item['started_at']) : null,
    completedAt: item['completed_at'] != null ? str(item['completed_at']) : null,
    workflow: item['workflow'] as WorkflowRun['workflow'],
    steps: Array.isArray(item['steps'])
        ? (item['steps'] as Record<string, unknown>[]).map(mapApiWorkflowStepRun)
        : [],
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiWorkflow = (item: Record<string, unknown>): Workflow => ({
    id: str(item['id']),
    name: str(item['name']),
    description: item['description'] != null ? str(item['description']) : null,
    trigger: str(item['trigger']),
    active: bool(item['active']),
    definition: (item['definition'] as Record<string, unknown>) ?? {},
    runCount: num(item['run_count'] ?? item['runCount']),
    lastRunAt: item['last_run_at'] != null ? str(item['last_run_at']) : null,
    ownerId: item['owner_id'] != null ? str(item['owner_id']) : null,
    owner: item['owner'] as Workflow['owner'],
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
});

export const mapApiWebhookDelivery = (item: Record<string, unknown>): WebhookDelivery => ({
    id: str(item['id']),
    webhookId: str(item['webhook_id'] ?? item['webhookId']),
    event: str(item['event']),
    status: str(item['status']),
    attempts: num(item['attempts']),
    responseStatus:
        item['response_status'] != null
            ? num(item['response_status'])
            : item['responseStatus'] != null
              ? num(item['responseStatus'])
              : null,
    errorMessage: item['error_message'] != null ? str(item['error_message']) : null,
    lastAttemptAt: item['last_attempt_at'] != null ? str(item['last_attempt_at']) : null,
    completedAt: item['completed_at'] != null ? str(item['completed_at']) : null,
    payload: (item['payload'] as Record<string, unknown>) ?? {},
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
});

export const mapApiWebhook = (item: Record<string, unknown>): Webhook => ({
    id: str(item['id']),
    url: str(item['url']),
    events: Array.isArray(item['events']) ? item['events'].map(str) : [],
    active: bool(item['active']),
    createdAt: item['created_at'] != null ? str(item['created_at']) : undefined,
    updatedAt: item['updated_at'] != null ? str(item['updated_at']) : undefined,
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
