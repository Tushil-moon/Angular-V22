import { User } from '@models/index';
import type { BadgeVariant } from '@shared/components/badge.component';

export interface UserDetailFieldView {
    label: string;
    value: string;
    badgeVariant?: BadgeVariant;
    type: 'text' | 'badge';
}

export function buildUserDetailFields(user: User): UserDetailFieldView[] {
    return [
        { label: 'Phone', value: user.phone || '—', type: 'text' },
        {
            label: 'Email verified',
            value: user.emailVerified ? 'Verified' : 'Pending',
            badgeVariant: user.emailVerified ? 'success' : 'warning',
            type: 'badge',
        },
        {
            label: 'Created',
            value: formatUserDateTime(user.createdAt),
            type: 'text',
        },
        {
            label: 'Last updated',
            value: formatUserDateTime(user.updatedAt),
            type: 'text',
        },
    ];
}

export function getUserDisplayName(user: User): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
}

export function getUserInitials(user: User): string {
    const first = user.firstName?.[0] || user.email[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase();
}

export function formatUserDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
}

export function formatUserDateTime(date: string | Date): string {
    return new Date(date).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
