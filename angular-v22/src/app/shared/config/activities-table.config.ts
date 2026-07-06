import type { ActivityPriority, ActivityStatus, ActivityType } from '@models/index';
import { ACTIVITY_PRIORITY_LABELS, ACTIVITY_STATUS_LABELS, ACTIVITY_TYPE_LABELS } from '@models/index';
import type { FlexTableColumn } from '@shared/components/flex-table.types';

export const ACTIVITY_TABLE_COLUMNS: FlexTableColumn[] = [
    {
        key: 'subject',
        label: 'Subject',
        grid: 'minmax(10rem, 1.4fr)',
        primary: true,
        skeletonClass: 'h-4 w-full max-w-[10rem]',
    },
    {
        key: 'type',
        label: 'Type',
        grid: 'minmax(5rem, 0.7fr)',
        skeletonClass: 'h-5 w-16 rounded-full',
    },
    {
        key: 'status',
        label: 'Status',
        grid: 'minmax(5rem, 0.8fr)',
        skeletonClass: 'h-5 w-16 rounded-full',
    },
    {
        key: 'priority',
        label: 'Priority',
        grid: 'minmax(5rem, 0.8fr)',
        hideBelow: 'lg',
        skeletonClass: 'h-5 w-16 rounded-full',
    },
    {
        key: 'contact',
        label: 'Contact',
        grid: 'minmax(8rem, 1fr)',
        hideBelow: 'md',
        skeletonClass: 'h-4 w-24',
    },
    {
        key: 'dueAt',
        label: 'Due',
        grid: 'minmax(6rem, 0.8fr)',
        skeletonClass: 'h-4 w-20',
    },
    {
        key: 'actions',
        label: '',
        align: 'right',
        grid: '3rem',
        skeletonClass: 'h-8 w-8 ml-auto',
    },
];

export const formatActivityType = (type: ActivityType): string =>
    ACTIVITY_TYPE_LABELS[type] ?? type;

export const formatActivityStatus = (status: ActivityStatus): string =>
    ACTIVITY_STATUS_LABELS[status] ?? status;

export const formatActivityPriority = (priority: ActivityPriority): string =>
    ACTIVITY_PRIORITY_LABELS[priority] ?? priority;

export const activityStatusBadgeVariant = (
    status: ActivityStatus,
): 'success' | 'warning' | 'secondary' | 'destructive' => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'PENDING':
            return 'warning';
        case 'CANCELLED':
            return 'secondary';
        default:
            return 'secondary';
    }
};

export const activityPriorityBadgeVariant = (
    priority: ActivityPriority,
): 'destructive' | 'warning' | 'secondary' => {
    switch (priority) {
        case 'URGENT':
            return 'destructive';
        case 'HIGH':
            return 'warning';
        default:
            return 'secondary';
    }
};

export const isActivityOverdue = (activity: {
    status: ActivityStatus;
    dueAt?: Date | null;
}): boolean =>
    activity.status === 'PENDING' &&
    !!activity.dueAt &&
    activity.dueAt.getTime() < Date.now();

export const formatActivityDate = (date: Date | null | undefined): string =>
    date
        ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';

export const formatActivityDateTime = (date: Date | null | undefined): string =>
    date
        ? date.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          })
        : '—';
