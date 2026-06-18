/**
 * Flex Table — shadcn/ui Table patterns (responsive CSS grid)
 * @see https://ui.shadcn.com/docs/components/radix/table
 */

import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
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
  host: {
    '[class]': 'fill() ? "flex min-h-0 flex-1 flex-col min-w-0" : "block min-w-0"',
  },
  imports: [SkeletonComponent, IconComponent],
  template: `
    <div
      class="flex-table"
      [class.flex-table-flush]="flush()"
      [class.flex-table-fill]="fill()"
      [class.flex-table-loading]="loading()"
      [class.flex-table-empty-state]="empty() && !loading()"
      [class.flex-table-cards-mode]="displayMode() === 'cards'"
    >
      <div class="flex-table-scroll" #scrollContainer>
        <div
          class="flex-table-inner"
          [class.flex-table-inner-empty]="empty() && !loading()"
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  private resizeObserver: ResizeObserver | null = null;
  private readonly dynamicSkeletonCount = signal<number | null>(null);

  columns = input.required<FlexTableColumn[]>();
  loading = input(false);
  empty = input(false);
  emptyTitle = input('No results found');
  emptyDescription = input('');
  emptyIcon = input<IconName>('search');
  caption = input('');
  flush = input(false);
  fill = input(false);
  skeletonRowCount = input(5);
  sortColumn = input<string | null>(null);
  sortDirection = input<'ascending' | 'descending' | null>(null);
  /** Below `sm`, stack rows as labeled cards instead of a horizontal table */
  displayMode = input<'table' | 'cards'>('table');

  visibleColumns = computed(() => this.columns());

  gridTemplate = computed(() =>
    this.visibleColumns()
      .map((col) => col.grid)
      .join(' '),
  );

  skeletonRows = computed(() => {
    const count = this.resolvedSkeletonRowCount();
    return Array.from({ length: count }, (_, index) => index);
  });

  constructor() {
    const injector = inject(Injector);

    effect(() => {
      if (this.fill() && this.loading()) {
        afterNextRender(() => this.updateDynamicSkeletonCount(), { injector });
      } else {
        this.dynamicSkeletonCount.set(null);
      }
    });

    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateDynamicSkeletonCount());
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateDynamicSkeletonCount();
  }

  private resolvedSkeletonRowCount(): number {
    const minimum = this.skeletonRowCount();
    if (!this.fill() || !this.loading()) {
      return minimum;
    }

    const dynamic = this.dynamicSkeletonCount();
    return dynamic === null ? minimum : Math.max(minimum, dynamic);
  }

  private updateDynamicSkeletonCount(): void {
    if (!this.fill() || !this.loading()) {
      this.dynamicSkeletonCount.set(null);
      return;
    }

    const scrollEl = this.scrollContainer()?.nativeElement;
    if (!scrollEl) return;

    const header = scrollEl.querySelector('.flex-table-header');
    const headerHeight = header?.getBoundingClientRect().height ?? 40;
    const availableHeight = scrollEl.clientHeight - headerHeight;
    const rowHeight = 48;
    const count = Math.max(this.skeletonRowCount(), Math.ceil(availableHeight / rowHeight));

    this.dynamicSkeletonCount.set(count);
    this.resizeObserver?.observe(scrollEl);
  }

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
    '[attr.data-label]': 'columnLabel()',
    '[attr.data-primary]': 'isPrimary() ? "true" : null',
  },
  template: `<ng-content />`,
})
export class FlexTableCellComponent {
  column = input.required<string>();
  align = input<'left' | 'right'>('left');
  hideBelow = input<FlexTableBreakpoint | undefined>(undefined);

  private readonly table = inject(FlexTableComponent, { optional: true });

  private readonly columnDef = computed(() =>
    this.table?.columns().find((item) => item.key === this.column()),
  );

  columnLabel = computed(() => this.columnDef()?.label ?? '');

  isPrimary = computed(() => {
    const col = this.columnDef();
    if (col?.primary) return true;
    const columns = this.table?.columns() ?? [];
    return columns[0]?.key === this.column();
  });

  hostClass = computed(() => {
    const col = this.columnDef();
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
