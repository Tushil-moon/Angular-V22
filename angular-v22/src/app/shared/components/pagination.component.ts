/**
 * Pagination — page controls for list views
 */

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ButtonComponent } from './button.component';
import { IconComponent } from './icon.component';

type PaginationMode = 'simple' | 'numbered';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-pagination',
    imports: [ButtonComponent, IconComponent],
    template: `
        @if (totalPages() > 1 || showWhenSingle()) {
            <div
                [class]="
                    mode() === 'numbered'
                        ? 'flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center justify-center sm:justify-center'
                        : 'flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
                "
                role="navigation"
                aria-label="Pagination"
            >
                @if (mode() === 'simple') {
                    <p class="text-sm text-muted-foreground">
                        Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ total() }}
                    </p>
                }

                <div class="flex flex-wrap items-center justify-center gap-2">
                    <app-button
                        variant="outline"
                        size="sm"
                        type="button"
                        [disabled]="page() <= 1"
                        (clicked)="goToPage(page() - 1)"
                    >
                        <app-icon name="chevron-left" [size]="14" />
                        Previous
                    </app-button>

                    @if (mode() === 'numbered') {
                        <div class="flex items-center gap-1" role="group" aria-label="Page numbers">
                            @for (item of pageItems(); track item.key) {
                                @if (item.type === 'ellipsis') {
                                    <span
                                        class="inline-flex size-9 items-center justify-center text-sm text-muted-foreground"
                                        aria-hidden="true"
                                    >…</span>
                                } @else {
                                    <button
                                        type="button"
                                        [class]="
                                            item.page === page()
                                                ? 'inline-flex size-9 items-center justify-center rounded-lg border border-primary bg-primary text-sm font-medium tabular-nums text-primary-foreground transition-colors hover:bg-primary hover:text-primary-foreground'
                                                : 'inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-sm font-medium tabular-nums text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                                        "
                                        [attr.aria-current]="item.page === page() ? 'page' : null"
                                        (click)="goToPage(item.page)"
                                    >
                                        {{ item.page }}
                                    </button>
                                }
                            }
                        </div>
                    } @else {
                        <span class="min-w-[7rem] text-center text-sm text-muted-foreground">
                            Page {{ page() }} of {{ totalPages() }}
                        </span>
                    }

                    <app-button
                        variant="outline"
                        size="sm"
                        type="button"
                        [disabled]="page() >= totalPages()"
                        (clicked)="goToPage(page() + 1)"
                    >
                        Next
                        <app-icon name="chevron-right" [size]="14" />
                    </app-button>
                </div>
            </div>
        }
    `,
})
export class PaginationComponent {
    page = input.required<number>();
    pageSize = input.required<number>();
    total = input.required<number>();
    showWhenSingle = input(false);
    mode = input<PaginationMode>('simple');

    pageChange = output<number>();

    totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
    rangeStart = computed(() => {
        if (this.total() === 0) return 0;
        return (this.page() - 1) * this.pageSize() + 1;
    });
    rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

    pageItems = computed(() => {
        const total = this.totalPages();
        const current = this.page();
        const items: Array<
            { type: 'page'; page: number; key: string } | { type: 'ellipsis'; key: string }
        > = [];

        if (total <= 7) {
            for (let page = 1; page <= total; page += 1) {
                items.push({ type: 'page', page, key: `page-${page}` });
            }
            return items;
        }

        const addPage = (page: number) => items.push({ type: 'page', page, key: `page-${page}` });
        const addEllipsis = (key: string) => items.push({ type: 'ellipsis', key });

        addPage(1);

        if (current > 3) {
            addEllipsis('start');
        }

        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);

        for (let page = start; page <= end; page += 1) {
            addPage(page);
        }

        if (current < total - 2) {
            addEllipsis('end');
        }

        addPage(total);
        return items;
    });

    goToPage(nextPage: number): void {
        const clamped = Math.min(Math.max(1, nextPage), this.totalPages());
        if (clamped !== this.page()) {
            this.pageChange.emit(clamped);
        }
    }
}
