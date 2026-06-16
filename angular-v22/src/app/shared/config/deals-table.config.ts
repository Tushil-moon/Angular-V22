import type { FlexTableColumn } from '@shared/components/flex-table.types';
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
    grid: 'minmax(6rem, 0.8fr)',
    skeletonClass: 'h-4 w-16',
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
    grid: '5.5rem',
    skeletonClass: 'h-8 w-14 ml-auto',
  },
];

export const dealStageBadgeClass = (stage: DealStage): string => {
  switch (stage) {
    case 'WON':
      return 'badge badge-success';
    case 'LOST':
      return 'badge badge-danger';
    case 'NEGOTIATION':
    case 'PROPOSAL':
      return 'badge badge-warning';
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
