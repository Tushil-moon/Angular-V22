/**
 * Flex Table — shadcn/ui Table patterns (responsive CSS grid)
 * @see https://ui.shadcn.com/docs/components/radix/table
 */

import { Component, computed, HostListener, inject, input } from '@angular/core';
import { IconComponent } from './icon.component';
import { SkeletonComponent } from './skeleton.component';
import type { IconName } from '@shared/icons';
import type { FlexTableBreakpoint, FlexTableColumn } from './flex-table.types';

const HIDE_CLASS: Record<FlexTableBreakpoint, string> = {
  sm: 'flex-table-cell-hide-sm',
  md: 'flex-table-cell-hide-md',
  lg: 'flex-table-cell-hide-lg',
};

@Component({
  selector: 'app-flex-table',
  imports: [SkeletonComponent, IconComponent],
  template: `
    <div class="flex-table" [class.flex-table-flush]="flush()">
      <div class="flex-table-scroll">
        <div
          class="flex-table-inner"
          role="table"
          [style.--flex-table-columns]="gridTemplate()"
          [attr.aria-busy]="loading()"
          [attr.aria-label]="caption() || null"
        >
          @if (caption()) {
            <div class="flex-table-caption" role="caption">{{ caption() }}</div>
          }

          <div class="flex-table-header" role="row">
            @for (col of visibleColumns(); track col.key) {
              <div
                class="flex-table-cell flex-table-cell-header"
                [class]="cellClasses(col)"
                role="columnheader"
                [attr.aria-sort]="col.key === sortColumn() ? sortDirection() : null"
              >
                @if (col.headerSrOnly) {
                  <span class="sr-only">{{ col.label }}</span>
                } @else {
                  {{ col.label }}
                }
              </div>
            }
          </div>

          <div class="flex-table-body" role="rowgroup">
            @if (loading()) {
              @for (row of skeletonRows(); track $index) {
                <div class="flex-table-row flex-table-row-skeleton" role="row" aria-hidden="true">
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
                  <div class="empty-state flex-table-empty">
                    <div class="flex-table-empty-icon" aria-hidden="true">
                      <app-icon [name]="emptyIcon()" [size]="20" className="text-muted-foreground" />
                    </div>
                    <p class="empty-state-title">{{ emptyTitle() }}</p>
                    @if (emptyDescription()) {
                      <p class="empty-state-description">{{ emptyDescription() }}</p>
                    }
                    <ng-content select="[tableEmptyAction]" />
                  </div>
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
  emptyIcon = input<IconName>('search');
  caption = input('');
  flush = input(false);
  skeletonRowCount = input(5);
  sortColumn = input<string | null>(null);
  sortDirection = input<'ascending' | 'descending' | null>(null);

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
    const classes: string[] = [];

    if (col.align === 'right') {
      classes.push('flex-table-cell-right');
    }

    if (col.key === 'actions') {
      classes.push('flex-table-cell-actions');
    }

    if (col.hideBelow) {
      classes.push(HIDE_CLASS[col.hideBelow]);
    }

    return classes.join(' ');
  }
}

@Component({
  selector: 'app-flex-table-row',
  host: {
    class: 'flex-table-row',
    role: 'row',
    '[class.flex-table-row-interactive]': 'interactive()',
    '[class.flex-table-row-selected]': 'selected()',
    '[attr.tabindex]': 'interactive() ? 0 : null',
  },
  template: `<ng-content />`,
})
export class FlexTableRowComponent {
  interactive = input(false);
  selected = input(false);

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }
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

    if (col?.key === 'actions' || this.column() === 'actions') {
      classes.push('flex-table-cell-actions');
    }

    const hideBelow = col?.hideBelow ?? this.hideBelow();
    if (hideBelow) {
      classes.push(HIDE_CLASS[hideBelow]);
    }

    return classes.join(' ');
  });
}
