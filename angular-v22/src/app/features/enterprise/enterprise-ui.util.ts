/** Status badges and formatting for enterprise SaaS UI */

import type { BadgeVariant } from '@shared/components/badge.component';

export const enterpriseStatusBadge = (status: string): BadgeVariant => {
    const normalized = status.toUpperCase();
    if (['WON', 'CLOSED', 'RESOLVED', 'PUBLISHED', 'SENT', 'ACTIVE', 'ENABLED'].includes(normalized)) {
        return 'success';
    }
    if (['LOST', 'CANCELLED', 'FAILED', 'DISABLED'].includes(normalized)) {
        return 'destructive';
    }
    if (['OPEN', 'IN_PROGRESS', 'PENDING', 'DRAFT', 'NEW', 'SCHEDULED'].includes(normalized)) {
        return 'warning';
    }
    if (['NEGOTIATION', 'PROPOSAL', 'QUALIFIED'].includes(normalized)) {
        return 'secondary';
    }
    return 'outline';
};

export const enterprisePriorityBadge = (priority: string): BadgeVariant => {
    const normalized = priority.toUpperCase();
    if (normalized === 'URGENT' || normalized === 'HIGH') return 'destructive';
    if (normalized === 'MEDIUM') return 'warning';
    return 'secondary';
};

export const formatEnterpriseStatus = (status: string): string =>
    status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
