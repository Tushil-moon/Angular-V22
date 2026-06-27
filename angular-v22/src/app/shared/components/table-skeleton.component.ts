/**
 * Table Skeleton — flex-table loading placeholder
 */

import { Component, computed, input } from '@angular/core';

import { FlexTableComponent } from './flex-table.component';
import type { FlexTableColumn } from './flex-table.types';

@Component({
    selector: 'app-table-skeleton',
    imports: [FlexTableComponent],
    template: `
        <app-flex-table
            [columns]="resolvedColumns()"
            [loading]="true"
            [flush]="flush()"
            [skeletonRowCount]="rowCount()"
        />
    `,
})
export class TableSkeletonComponent {
    rowCount = input(5);
    columnCount = input(5);
    columns = input<FlexTableColumn[] | undefined>(undefined);
    flush = input(false);

    resolvedColumns = computed<FlexTableColumn[]>(() => {
        if (this.columns()?.length) {
            return this.columns()!;
        }

        return Array.from({ length: this.columnCount() }, (_, index) => ({
            key: `col-${index}`,
            label: '',
            grid: 'minmax(6rem, 1fr)',
            skeletonClass: 'h-4 w-full max-w-[6rem]',
        }));
    });
}
