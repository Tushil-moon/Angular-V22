/**
 * CRM Models
 */

export type ContactStatus = 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'INACTIVE';

export type LeadSource =
    | 'WEBSITE'
    | 'REFERRAL'
    | 'CAMPAIGN'
    | 'COLD_CALL'
    | 'TRADE_SHOW'
    | 'PARTNER'
    | 'IMPORT'
    | 'OTHER';

export type ContactEmailType = 'WORK' | 'PERSONAL' | 'OTHER';
export type ContactPhoneType = 'MOBILE' | 'WORK' | 'HOME' | 'FAX' | 'OTHER';
export type ContactAddressType = 'BILLING' | 'SHIPPING' | 'HOME' | 'WORK' | 'OTHER';
export type SocialPlatform =
    | 'LINKEDIN'
    | 'TWITTER'
    | 'FACEBOOK'
    | 'INSTAGRAM'
    | 'GITHUB'
    | 'WEBSITE'
    | 'OTHER';

export type DealStage = 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export type ActivityType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'TASK';

export type ActivityStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export type ActivityPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type ActivityHistoryAction =
    | 'CREATED'
    | 'UPDATED'
    | 'ASSIGNED'
    | 'COMPLETED'
    | 'REOPENED'
    | 'CANCELLED'
    | 'REMINDER_SET'
    | 'RECURRENCE_UPDATED';

export interface CrmOwner {
    id: string;
    email: string | null;
}

export interface CrmTag {
    id: string;
    name: string;
    color: string;
}

export interface CompanySummary {
    id: string;
    name: string;
    domain?: string | null;
}

export interface CompanyLocation {
    id: string;
    label?: string | null;
    line1: string;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    isPrimary: boolean;
    isHeadquarters: boolean;
}

export interface CompanySummaryRef {
    id: string;
    name: string;
    domain?: string | null;
}

export interface CompanyTreeNode {
    id: string;
    parentCompanyId?: string | null;
    name: string;
    domain?: string | null;
    industry?: string | null;
    ownershipPercent?: number | null;
    employeeCount?: number | null;
    children: CompanyTreeNode[];
}

export interface CompanyDuplicateMatch {
    companyId: string;
    score: number;
    reasons: ('domain' | 'name')[];
    company: Company | null;
}

export interface CompanyImportResult {
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    created: Company[];
    skipped: { row: number; reason: string }[];
    failed: { row: number; reason: string }[];
}

export interface Company {
    id: string;
    name: string;
    domain?: string | null;
    industry?: string | null;
    size?: string | null;
    website?: string | null;
    address?: string | null;
    parentCompanyId?: string | null;
    parentCompany?: CompanySummaryRef | null;
    employeeCount?: number | null;
    annualRevenue?: number | null;
    revenueCurrency?: string | null;
    ownershipPercent?: number | null;
    ownerId?: string | null;
    notes?: string | null;
    owner?: CrmOwner | null;
    locations?: CompanyLocation[];
    contactCount?: number;
    subsidiaryCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ContactEmail {
    id: string;
    email: string;
    type: ContactEmailType;
    isPrimary: boolean;
}

export interface ContactPhone {
    id: string;
    phone: string;
    type: ContactPhoneType;
    isPrimary: boolean;
}

export interface ContactAddress {
    id: string;
    label?: string | null;
    line1: string;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    type: ContactAddressType;
    isPrimary: boolean;
}

export interface ContactSocialLink {
    id: string;
    platform: SocialPlatform;
    url: string;
}

export interface ContactDuplicateMatch {
    contactId: string;
    score: number;
    reasons: ('email' | 'phone' | 'name_company')[];
    contact: Contact | null;
}

export interface ContactImportResult {
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    created: Contact[];
    skipped: { row: number; reason: string }[];
    failed: { row: number; reason: string }[];
}

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    companyId?: string | null;
    companyRef?: CompanySummary | null;
    jobTitle?: string | null;
    status: ContactStatus;
    leadSource?: LeadSource | null;
    sourceDetail?: string | null;
    notes?: string | null;
    ownerId?: string | null;
    owner?: CrmOwner | null;
    tags?: CrmTag[];
    emails?: ContactEmail[];
    phones?: ContactPhone[];
    addresses?: ContactAddress[];
    socialLinks?: ContactSocialLink[];
    dealCount?: number;
    activityCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface DealContactSummary {
    id: string;
    fullName: string;
    company?: string | null;
    email?: string | null;
}

export interface DealCompanySummary {
    id: string;
    name: string;
    domain?: string | null;
}

export interface DealPipelineStageRef {
    id: string;
    name: string;
    stageKey: DealStage;
    probability: number;
    isClosed: boolean;
    isWon: boolean;
}

export interface Deal {
    id: string;
    title: string;
    value: number;
    currency: string;
    stage: DealStage;
    pipelineId?: string | null;
    pipelineStageId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    leadId?: string | null;
    ownerId?: string | null;
    probability: number;
    weightedValue: number;
    expectedCloseDate?: Date | null;
    description?: string | null;
    winReason?: string | null;
    lossReason?: string | null;
    competitor?: string | null;
    closedAt?: Date | null;
    sortOrder?: number;
    contact?: DealContactSummary | null;
    company?: DealCompanySummary | null;
    pipelineStage?: DealPipelineStageRef | null;
    owner?: CrmOwner | null;
    tags?: CrmTag[];
    createdAt: Date;
    updatedAt: Date;
}

export interface DealBoardColumn {
    stageId?: string;
    stageKey: DealStage;
    name?: string;
    probability?: number;
    stage: DealStage;
    deals: Deal[];
}

export interface PipelineStageConfig {
    id: string;
    pipelineId: string;
    name: string;
    stageKey: DealStage;
    probability: number;
    sortOrder: number;
    isClosed: boolean;
    isWon: boolean;
}

export interface Pipeline {
    id: string;
    organizationId: string;
    name: string;
    isDefault: boolean;
    stages: PipelineStageConfig[];
    createdAt: Date;
    updatedAt: Date;
}

export type DealHistoryAction =
    | 'CREATED'
    | 'STAGE_CHANGED'
    | 'VALUE_CHANGED'
    | 'ASSIGNED'
    | 'WON'
    | 'LOST'
    | 'REOPENED'
    | 'NOTE_ADDED';

export interface DealHistoryEntry {
    id: string;
    action: DealHistoryAction;
    details: Record<string, unknown>;
    createdAt: Date;
    user?: CrmOwner | null;
}

export interface DealImportResult {
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    created: Deal[];
    skipped: { row: number; reason: string }[];
    failed: { row: number; reason: string }[];
}

export interface SearchResult {
    type: 'contact' | 'deal' | 'company';
    id: string;
    title: string;
    subtitle: string | null;
    route: string;
}

export interface Activity {
    id: string;
    type: ActivityType;
    status: ActivityStatus;
    priority: ActivityPriority;
    subject: string;
    body?: string | null;
    contactId?: string | null;
    dealId?: string | null;
    companyId?: string | null;
    leadId?: string | null;
    userId: string;
    assigneeId?: string | null;
    dueAt?: Date | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    reminderAt?: Date | null;
    durationMinutes?: number | null;
    location?: string | null;
    seriesId?: string | null;
    recurrenceFrequency?: RecurrenceFrequency | null;
    recurrenceInterval?: number | null;
    recurrenceEndAt?: Date | null;
    isRecurrenceTemplate?: boolean;
    user?: CrmOwner | null;
    assignee?: CrmOwner | null;
    contact?: { id: string; fullName: string } | null;
    deal?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    lead?: { id: string; fullName: string } | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ActivityHistoryEntry {
    id: string;
    action: ActivityHistoryAction;
    details: Record<string, unknown>;
    createdAt: Date;
    user?: { id: string; email: string | null } | null;
}

export interface ActivityImportResult {
    createdCount: number;
    failedCount: number;
    created: Activity[];
    failed: { subject: string; reason: string }[];
}

export interface PipelineStageSummary {
    stage: DealStage;
    count: number;
    value: number;
}

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
    LEAD: 'Lead',
    PROSPECT: 'Prospect',
    CUSTOMER: 'Customer',
    INACTIVE: 'Inactive',
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
    LEAD: 'Lead',
    QUALIFIED: 'Qualified',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negotiation',
    WON: 'Won',
    LOST: 'Lost',
};

export const DEAL_HISTORY_ACTION_LABELS: Record<DealHistoryAction, string> = {
    CREATED: 'Created',
    STAGE_CHANGED: 'Stage changed',
    VALUE_CHANGED: 'Value changed',
    ASSIGNED: 'Assigned',
    WON: 'Won',
    LOST: 'Lost',
    REOPENED: 'Reopened',
    NOTE_ADDED: 'Note added',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
    NOTE: 'Note',
    CALL: 'Call',
    EMAIL: 'Email',
    MEETING: 'Meeting',
    TASK: 'Task',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

export const ACTIVITY_PRIORITY_LABELS: Record<ActivityPriority, string> = {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High',
    URGENT: 'Urgent',
};

export const ACTIVITY_HISTORY_ACTION_LABELS: Record<ActivityHistoryAction, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    ASSIGNED: 'Assigned',
    COMPLETED: 'Completed',
    REOPENED: 'Reopened',
    CANCELLED: 'Cancelled',
    REMINDER_SET: 'Reminder set',
    RECURRENCE_UPDATED: 'Recurrence updated',
};

export type LeadStage =
    | 'NEW'
    | 'CONTACTED'
    | 'QUALIFIED'
    | 'UNQUALIFIED'
    | 'NURTURING'
    | 'CONVERTED'
    | 'LOST';

export type LeadRating = 'HOT' | 'WARM' | 'COLD';

export type LeadHistoryAction =
    | 'CREATED'
    | 'STAGE_CHANGED'
    | 'ASSIGNED'
    | 'SCORED'
    | 'QUALIFIED'
    | 'DISQUALIFIED'
    | 'CONVERTED'
    | 'FOLLOW_UP_SET'
    | 'NOTE_ADDED';

export interface Lead {
    id: string;
    organizationId: string;
    contactId: string;
    stage: LeadStage;
    score: number;
    rating?: LeadRating | null;
    nextFollowUpAt?: Date | null;
    qualifiedAt?: Date | null;
    convertedAt?: Date | null;
    lostAt?: Date | null;
    lostReason?: string | null;
    qualificationNotes?: string | null;
    lastScoredAt?: Date | null;
    contact: Contact;
    createdAt: Date;
    updatedAt: Date;
}

export interface LeadHistoryEntry {
    id: string;
    action: LeadHistoryAction;
    details: Record<string, unknown>;
    createdAt: Date;
    user?: CrmOwner | null;
}

export interface LeadImportResult {
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    created: Lead[];
    skipped: { row: number; reason: string }[];
    failed: { row: number; reason: string }[];
}

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    QUALIFIED: 'Qualified',
    UNQUALIFIED: 'Unqualified',
    NURTURING: 'Nurturing',
    CONVERTED: 'Converted',
    LOST: 'Lost',
};

export const LEAD_RATING_LABELS: Record<LeadRating, string> = {
    HOT: 'Hot',
    WARM: 'Warm',
    COLD: 'Cold',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
    WEBSITE: 'Website',
    REFERRAL: 'Referral',
    CAMPAIGN: 'Campaign',
    COLD_CALL: 'Cold call',
    TRADE_SHOW: 'Trade show',
    PARTNER: 'Partner',
    IMPORT: 'Import',
    OTHER: 'Other',
};

export const LEAD_HISTORY_ACTION_LABELS: Record<LeadHistoryAction, string> = {
    CREATED: 'Created',
    STAGE_CHANGED: 'Stage changed',
    ASSIGNED: 'Assigned',
    SCORED: 'Scored',
    QUALIFIED: 'Qualified',
    DISQUALIFIED: 'Disqualified',
    CONVERTED: 'Converted',
    FOLLOW_UP_SET: 'Follow-up set',
    NOTE_ADDED: 'Note added',
};
