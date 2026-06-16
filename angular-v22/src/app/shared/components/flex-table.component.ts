/**
 * Flex Table — shadcn-style responsive CSS grid table
 */

import { Component, computed, inject, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';
import type { FlexTableBreakpoint, FlexTableColumn } from './flex-table.types';

const HIDE_CLASS: Record<FlexTableBreakpoint, string> = {
  sm: 'flex-table-cell-hide-sm',
  md: 'flex-table-cell-hide-md',
  lg: 'flex-table-cell-hide-lg',
};

@Component({
  selector: 'app-flex-table',
  imports: [SkeletonComponent],
  template: `
    <div class="flex-table" [class.flex-table-flush]="flush()">
      <div class="flex-table-scroll">
        <div class="flex-table-inner" [style.--flex-table-columns]="gridTemplate()">
          <div class="flex-table-header" role="row">
            @for (col of visibleColumns(); track col.key) {
              <div
                class="flex-table-cell flex-table-cell-header"
                [class]="cellClasses(col)"
                role="columnheader"
              >
                {{ col.label }}
              </div>
            }
          </div>

          <div class="flex-table-body" role="rowgroup">
            @if (loading()) {
              @for (row of skeletonRows(); track $index) {
                <div class="flex-table-row flex-table-row-skeleton" role="row">
                  @for (col of visibleColumns(); track col.key) {
                    <div class="flex-table-cell" [class]="cellClasses(col)">
                      <app-skeleton [className]="col.skeletonClass ?? 'h-4 w-full max-w-[6rem]'" />
                    </div>
                  }
                </div>
              }
            } @else if (empty()) {
              <div class="flex-table-row flex-table-row-empty" role="row">
                <div class="flex-table-cell flex-table-cell-empty" role="cell">
                  <span class="text-sm text-muted-foreground">{{ emptyTitle() }}</span>
                  @if (emptyDescription()) {
                    <span class="hidden text-xs text-muted-foreground sm:inline">
                      · {{ emptyDescription() }}
                    </span>
                  }
                </div>
              </div>
            } @else {
              <ng-content />
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class FlexTableComponent {
  columns = input.required<FlexTableColumn[]>();
  loading = input(false);
  empty = input(false);
  emptyTitle = input('No results found');
  emptyDescription = input('');
  flush = input(false);
  skeletonRowCount = input(5);

  visibleColumns = computed(() => this.columns());

  gridTemplate = computed(() =>
    this.visibleColumns()
      .map((col) => col.grid)
      .join(' '),
  );

  skeletonRows = computed(() =>
    Array.from({ length: this.skeletonRowCount() }, (_, index) => index),
  );

  cellClasses(col: FlexTableColumn): string {
    const classes = [col.align === 'right' ? 'flex-table-cell-right' : ''];
    if (col.hideBelow) {
      classes.push(HIDE_CLASS[col.hideBelow]);
    }
    return classes.filter(Boolean).join(' ');
  }
}

@Component({
  selector: 'app-flex-table-row',
  host: {
    class: 'flex-table-row',
    role: 'row',
    '[class.flex-table-row-interactive]': 'interactive()',
  },
  template: `<ng-content />`,
})
export class FlexTableRowComponent {
  interactive = input(false);
}

@Component({
  selector: 'app-flex-table-cell',
  host: {
    class: 'flex-table-cell',
    role: 'cell',
    '[class]': 'hostClass()',
  },
  template: `<ng-content />`,
})
export class FlexTableCellComponent {
  column = input.required<string>();
  align = input<'left' | 'right'>('left');
  hideBelow = input<FlexTableBreakpoint | undefined>(undefined);

  private readonly table = inject(FlexTableComponent, { optional: true });

  hostClass = computed(() => {
    const col = this.table?.columns().find((item) => item.key === this.column());
    const classes: string[] = [];

    const align = col?.align ?? this.align();
    if (align === 'right') {
      classes.push('flex-table-cell-right');
    }

    const hideBelow = col?.hideBelow ?? this.hideBelow();
    if (hideBelow) {
      classes.push(HIDE_CLASS[hideBelow]);
    }

    return classes.join(' ');
  });
}
