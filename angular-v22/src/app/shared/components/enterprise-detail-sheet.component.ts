/**
 * Right slide-over detail panel for enterprise records
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

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
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-enterprise-detail-sheet',
    imports: [ButtonComponent, IconComponent, BadgeComponent, SeparatorComponent],
    template: `
        @if (open()) {
            <div
                class="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                (click)="closed.emit()"
                aria-hidden="true"
            ></div>
            <aside
                class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-xl"
                role="dialog"
                aria-modal="true"
                [attr.aria-label]="title()"
            >
                <div class="flex items-start gap-3 border-b border-border px-5 py-4">
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ eyebrow() }}</p>
                        <h2 class="mt-1 text-lg font-semibold text-foreground">{{ title() }}</h2>
                        @if (subtitle()) {
                            <p class="mt-1 text-sm text-muted-foreground">{{ subtitle() }}</p>
                        }
                    </div>
                    <app-button variant="ghost" size="icon" type="button" (clicked)="closed.emit()">
                        <span class="sr-only">Close</span>
                        <app-icon name="x" [size]="18" />
                    </app-button>
                </div>

                <div class="custom-scrollbar flex-1 overflow-y-auto px-5 py-4">
                    @if (status()) {
                        <app-badge [variant]="statusVariant()">{{ status() }}</app-badge>
                        <app-separator class="my-4" />
                    }

                    <dl class="space-y-4">
                        @for (field of fields(); track field.label) {
                            <div>
                                <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ field.label }}</dt>
                                <dd class="mt-1 text-sm text-foreground">
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
                    <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                        <ng-content select="[detailActions]" />
                    </div>
                }
            </aside>
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
