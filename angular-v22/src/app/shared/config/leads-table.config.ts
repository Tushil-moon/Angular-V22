import type { LeadRating, LeadStage } from '@models/index';
import { LEAD_RATING_LABELS, LEAD_STAGE_LABELS } from '@models/index';
import type { BadgeVariant } from '@shared/components/badge.component';
import type { FlexTableColumn } from '@shared/components/flex-table.types';

export const LEAD_TABLE_COLUMNS: FlexTableColumn[] = [
    {
        key: 'name',
        label: 'Lead',
        grid: 'minmax(10rem, 1.4fr)',
        primary: true,
        skeletonClass: 'h-4 w-full max-w-[9rem]',
    },
    {
        key: 'company',
        label: 'Company',
        grid: 'minmax(8rem, 1.2fr)',
        hideBelow: 'md',
        skeletonClass: 'h-4 w-full max-w-[7rem]',
    },
    {
        key: 'stage',
        label: 'Stage',
        grid: 'minmax(6rem, 0.8fr)',
        skeletonClass: 'h-5 w-20 rounded-full',
    },
    {
        key: 'score',
        label: 'Score',
        align: 'right',
        grid: 'minmax(4rem, 0.5fr)',
        hideBelow: 'md',
        skeletonClass: 'h-4 w-8 ml-auto',
    },
    {
        key: 'rating',
        label: 'Rating',
        grid: 'minmax(5rem, 0.65fr)',
        hideBelow: 'lg',
        skeletonClass: 'h-5 w-14 rounded-full',
    },
    {
        key: 'followUp',
        label: 'Follow-up',
        grid: 'minmax(7rem, 0.9fr)',
        hideBelow: 'lg',
        skeletonClass: 'h-4 w-full max-w-[6rem]',
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

export const formatLeadStage = (stage: LeadStage): string => LEAD_STAGE_LABELS[stage] ?? stage;

export const formatLeadRating = (rating?: LeadRating | null): string =>
    rating ? (LEAD_RATING_LABELS[rating] ?? rating) : '—';

export const leadStageBadgeClass = (stage: LeadStage): string => {
    switch (stage) {
        case 'NEW':
            return 'badge badge-secondary';
        case 'CONTACTED':
        case 'NURTURING':
            return 'badge badge-outline';
        case 'QUALIFIED':
            return 'badge badge-default';
        case 'UNQUALIFIED':
        case 'LOST':
            return 'badge badge-destructive';
        case 'CONVERTED':
            return 'badge badge-success';
        default:
            return 'badge badge-secondary';
    }
};

export const leadRatingBadgeVariant = (rating?: LeadRating | null): BadgeVariant => {
    switch (rating) {
        case 'HOT':
            return 'destructive';
        case 'WARM':
            return 'default';
        case 'COLD':
            return 'secondary';
        default:
            return 'outline';
    }
};

export const formatLeadDate = (value?: Date | null): string => {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(value);
};

export const isFollowUpOverdue = (value?: Date | null): boolean => {
    if (!value) return false;
    return value.getTime() < Date.now();
};
