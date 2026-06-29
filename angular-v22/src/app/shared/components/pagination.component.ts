/**
 * Pagination — page controls for list views
 */

import { Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from './button.component';
import { IconComponent } from './icon.component';

@Component({
    selector: 'app-pagination',
    imports: [ButtonComponent, IconComponent],
    template: `
        @if (totalPages() > 1 || showWhenSingle()) {
            <div class="pagination" role="navigation" aria-label="Pagination">
                <p class="pagination-summary text-sm text-muted-foreground">
                    Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ total() }}
                </p>
                <div class="pagination-controls">
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
                    <span class="pagination-page text-sm text-muted-foreground">
                        Page {{ page() }} of {{ totalPages() }}
                    </span>
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
    styles: `
        .pagination {
            @apply flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between;
        }

        .pagination-controls {
            @apply flex items-center gap-2;
        }

        .pagination-page {
            @apply min-w-[7rem] text-center;
        }
    `,
})
export class PaginationComponent {
    page = input.required<number>();
    pageSize = input.required<number>();
    total = input.required<number>();
    showWhenSingle = input(false);

    pageChange = output<number>();

    totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
    rangeStart = computed(() => {
        if (this.total() === 0) return 0;
        return (this.page() - 1) * this.pageSize() + 1;
    });
    rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

    goToPage(nextPage: number): void {
        const clamped = Math.min(Math.max(1, nextPage), this.totalPages());
        if (clamped !== this.page()) {
            this.pageChange.emit(clamped);
        }
    }
}
