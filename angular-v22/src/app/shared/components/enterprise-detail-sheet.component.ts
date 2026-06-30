/**
 * Right slide-over detail panel for enterprise records
 */

import { Component, input, output } from '@angular/core';

import { BadgeComponent, type BadgeVariant } from './badge.component';
import { ButtonComponent } from './button.component';
import { IconComponent } from './icon.component';
import { SeparatorComponent } from './separator.component';

export interface DetailSheetField {
    label: string;
    value: string;
    badge?: BadgeVariant;
}

@Component({
    selector: 'app-enterprise-detail-sheet',
    imports: [ButtonComponent, IconComponent, BadgeComponent, SeparatorComponent],
    template: `
        @if (open()) {
            <div
                class="detail-sheet-overlay"
                (click)="closed.emit()"
                aria-hidden="true"
            ></div>
            <aside class="detail-sheet" role="dialog" aria-modal="true" [attr.aria-label]="title()">
                <div class="detail-sheet-header">
                    <div class="min-w-0 flex-1">
                        <p class="detail-sheet-eyebrow">{{ eyebrow() }}</p>
                        <h2 class="detail-sheet-title">{{ title() }}</h2>
                        @if (subtitle()) {
                            <p class="detail-sheet-subtitle">{{ subtitle() }}</p>
                        }
                    </div>
                    <app-button variant="ghost" size="icon" type="button" (clicked)="closed.emit()">
                        <span class="sr-only">Close</span>
                        <app-icon name="x" [size]="18" />
                    </app-button>
                </div>

                <div class="detail-sheet-body custom-scrollbar">
                    @if (status()) {
                        <app-badge [variant]="statusVariant()">{{ status() }}</app-badge>
                        <app-separator class="my-4" />
                    }

                    <dl class="detail-sheet-fields">
                        @for (field of fields(); track field.label) {
                            <div class="detail-sheet-field">
                                <dt>{{ field.label }}</dt>
                                <dd>
                                    @if (field.badge) {
                                        <app-badge [variant]="field.badge">{{ field.value }}</app-badge>
                                    } @else {
                                        {{ field.value }}
                                    }
                                </dd>
                            </div>
                        }
                    </dl>

                    <ng-content />
                </div>

                @if (showActions()) {
                    <div class="detail-sheet-footer">
                        <ng-content select="[detailActions]" />
                    </div>
                }
            </aside>
        }
    `,
    styles: `
        .detail-sheet-overlay {
            @apply fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px];
        }

        .detail-sheet {
            @apply fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl;
        }

        .detail-sheet-header {
            @apply flex items-start gap-3 border-b border-border px-5 py-4;
        }

        .detail-sheet-eyebrow {
            @apply text-xs font-medium uppercase tracking-wide text-muted-foreground;
        }

        .detail-sheet-title {
            @apply mt-1 text-lg font-semibold text-foreground;
        }

        .detail-sheet-subtitle {
            @apply mt-1 text-sm text-muted-foreground;
        }

        .detail-sheet-body {
            @apply flex-1 overflow-y-auto px-5 py-4;
        }

        .detail-sheet-fields {
            @apply space-y-4;
        }

        .detail-sheet-field dt {
            @apply text-xs font-medium uppercase tracking-wide text-muted-foreground;
        }

        .detail-sheet-field dd {
            @apply mt-1 text-sm text-foreground;
        }

        .detail-sheet-footer {
            @apply flex items-center justify-end gap-2 border-t border-border px-5 py-4;
        }
    `,
})
export class EnterpriseDetailSheetComponent {
    open = input(false);
    eyebrow = input('Record');
    title = input('');
    subtitle = input('');
    status = input('');
    statusVariant = input<BadgeVariant>('outline');
    fields = input<DetailSheetField[]>([]);
    showActions = input(true);

    closed = output<void>();
}
