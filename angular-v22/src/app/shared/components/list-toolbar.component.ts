/**
 * List toolbar — consistent row for search, filters, and actions.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ListToolbarVariant = 'split' | 'row';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-list-toolbar',
    host: {
        '[class]': 'hostClass()',
    },
    template: `
        @if (variant() === 'row') {
            <ng-content select="app-search-input" />
            <ng-content select="app-filter-select, app-button, [toolbarAction]" />
        } @else {
            <div class="w-full min-w-0 sm:w-56 sm:max-w-xs">
                <ng-content select="app-search-input" />
            </div>
            <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
                <ng-content select="app-filter-select, app-button, [toolbarAction]" />
            </div>
        }
    `,
})
export class ListToolbarComponent {
    /** `row` = single inline row (list card header); `split` = search left, filters right. */
    variant = input<ListToolbarVariant>('split');

    readonly hostClass = computed(() =>
        this.variant() === 'row'
            ? 'list-toolbar-host-row flex w-full min-w-0 flex-nowrap items-center justify-end gap-2 sm:flex-1'
            : 'list-toolbar-host-split flex w-full flex-wrap items-center gap-2 lg:justify-end',
    );
}
