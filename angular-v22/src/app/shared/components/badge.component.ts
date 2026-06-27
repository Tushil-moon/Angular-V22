/**
 * Badge — shadcn Badge
 */

import { Component, computed, input } from '@angular/core';

export type BadgeVariant =
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'ghost';

@Component({
    selector: 'app-badge',
    host: { class: 'inline-flex' },
    template: `<span [class]="badgeClass()"><ng-content /></span>`,
})
export class BadgeComponent {
    variant = input<BadgeVariant>('default');

    badgeClass = computed(() => {
        const map: Record<BadgeVariant, string> = {
            default: 'badge badge-default',
            secondary: 'badge badge-secondary',
            destructive: 'badge badge-destructive',
            outline: 'badge badge-outline',
            success: 'badge badge-success',
            warning: 'badge badge-warning',
            ghost: 'badge badge-ghost',
        };
        return map[this.variant()];
    });
}
