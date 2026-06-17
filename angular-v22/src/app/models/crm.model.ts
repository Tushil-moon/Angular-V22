/**
 * CRM Models
 */

export type ContactStatus = 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'INACTIVE';

export type DealStage =
  | 'LEAD'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type ActivityType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'TASK';

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

export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  size?: string | null;
  website?: string | null;
  address?: string | null;
  ownerId?: string | null;
  notes?: string | null;
  owner?: CrmOwner | null;
  contactCount?: number;
  createdAt: Date;
  updatedAt: Date;
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
  notes?: string | null;
  ownerId?: string | null;
  owner?: CrmOwner | null;
  tags?: CrmTag[];
  dealCount?: number;
  activityCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealContactSummary {
  id: string;
  fullName: string;
  company?: string | null;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  contactId?: string | null;
  ownerId?: string | null;
  expectedCloseDate?: Date | null;
  description?: string | null;
  contact?: DealContactSummary | null;
  owner?: CrmOwner | null;
  tags?: CrmTag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DealBoardColumn {
  stage: DealStage;
  deals: Deal[];
}

export interface SearchResult {
  type: 'contact' | 'deal' | 'company';
  id: string;
  title: string;
  subtitle: string | null;
  route: string;
}

export interface SavedView {
  id: string;
  userId: string;
  entityType: 'CONTACTS' | 'DEALS' | 'COMPANIES' | 'ACTIVITIES';
  name: string;
  filters: Record<string, unknown>;
  sort?: Record<string, unknown> | null;
  columns?: string[] | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  body?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  userId: string;
  dueAt?: Date | null;
  completedAt?: Date | null;
  user?: CrmOwner | null;
  contact?: { id: string; fullName: string } | null;
  deal?: { id: string; title: string } | null;
  createdAt: Date;
  updatedAt: Date;
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

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  NOTE: 'Note',
  CALL: 'Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  TASK: 'Task',
};
