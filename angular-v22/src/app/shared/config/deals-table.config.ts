import type { FlexTableColumn } from '@shared/components/flex-table.types';
import type { BadgeVariant } from '@shared/components/badge.component';
import type { DealStage } from '@models/index';
import { DEAL_STAGE_LABELS } from '@models/index';

export const DEAL_TABLE_COLUMNS: FlexTableColumn[] = [
  {
    key: 'title',
    label: 'Deal',
    grid: 'minmax(10rem, 1.5fr)',
    skeletonClass: 'h-4 w-full max-w-[10rem]',
  },
  {
    key: 'contact',
    label: 'Contact',
    grid: 'minmax(8rem, 1.1fr)',
    hideBelow: 'md',
    skeletonClass: 'h-4 w-full max-w-[7rem]',
  },
  {
    key: 'value',
    label: 'Value',
    align: 'right',
    grid: 'minmax(6rem, 0.8fr)',
    skeletonClass: 'h-4 w-16 ml-auto',
  },
  {
    key: 'stage',
    label: 'Stage',
    grid: 'minmax(6rem, 0.85fr)',
    skeletonClass: 'h-5 w-20 rounded-full',
  },
  {
    key: 'closeDate',
    label: 'Close date',
    grid: 'minmax(6.5rem, 0.9fr)',
    hideBelow: 'lg',
    skeletonClass: 'h-4 w-20',
  },
  {
    key: 'actions',
    label: 'Actions',
    align: 'right',
    headerSrOnly: true,
    grid: '4.5rem',
    skeletonClass: 'h-8 w-8 ml-auto rounded-md',
  },
];

export const dealStageBadgeVariant = (stage: DealStage): BadgeVariant => {
  switch (stage) {
    case 'WON':
      return 'success';
    case 'LOST':
      return 'destructive';
    case 'NEGOTIATION':
    case 'PROPOSAL':
      return 'warning';
    default:
      return 'secondary';
  }
};

/** @deprecated Prefer `dealStageBadgeVariant` with `app-badge` */
export const dealStageBadgeClass = (stage: DealStage): string => {
  switch (dealStageBadgeVariant(stage)) {
    case 'success':
      return 'badge badge-success';
    case 'destructive':
      return 'badge badge-danger';
    case 'warning':
      return 'badge badge-warning';
    case 'secondary':
      return 'badge badge-secondary';
    default:
      return 'badge';
  }
};

export const formatDealStage = (stage: DealStage): string => DEAL_STAGE_LABELS[stage] ?? stage;

export const formatDealValue = (value: number, currency = 'USD'): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export const formatDealDate = (date: Date | null | undefined): string =>
  date
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

export const OPEN_DEAL_STAGES: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
