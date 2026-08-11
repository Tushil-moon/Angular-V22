/**
 * Inventory — Polaris-style stock index table
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DialogService } from '@services/dialog.service';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    type BadgeVariant,
    ButtonComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    type FlexTableColumn,
    IconComponent,
    PaginationComponent,
    SearchInputComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { map, of, switchMap } from 'rxjs';

import {
    type InventoryAdjustDialogData,
    InventoryAdjustDialogComponent,
    type InventoryAdjustDialogResult,
} from '../components/inventory-adjust.dialog';
import type { InventoryItem } from '../models/inventory.model';
import { InventoryApiService } from '../services/inventory-api.service';

interface PageResult {
    items: InventoryItem[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-inventory-list',
    imports: [
        SearchInputComponent,
        ButtonComponent,
        BadgeComponent,
        IconComponent,
        PaginationComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
    ],
    template: `
        <div class="index-page page-shell-fill">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">Inventory</h1>
                    <p class="index-subtitle">Track availability across warehouses</p>
                </div>
            </div>

            <div class="index-metrics shrink-0">
                <div class="index-metric">
                    <div class="index-metric-top">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <div class="index-metric-icon">
                                    <app-icon name="boxes" [size]="18" />
                                </div>
                                <p class="index-metric-label">SKUs</p>
                            </div>
                            <p class="index-metric-value">{{ total() }}</p>
                            <p class="om-kpi-meta">Matching this view</p>
                        </div>
                    </div>
                </div>
                <div class="index-metric">
                    <div class="index-metric-top">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <div class="index-metric-icon">
                                    <app-icon name="check" [size]="18" />
                                </div>
                                <p class="index-metric-label">Healthy</p>
                            </div>
                            <p class="index-metric-value">{{ healthyCount() }}</p>
                            <p class="om-kpi-meta">On this page</p>
                        </div>
                    </div>
                </div>
                <div class="index-metric">
                    <div class="index-metric-top">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <div class="index-metric-icon">
                                    <app-icon name="alert-circle" [size]="18" />
                                </div>
                                <p class="index-metric-label">Low</p>
                            </div>
                            <p class="index-metric-value">{{ lowCount() }}</p>
                            <p class="om-kpi-meta">Near reorder point</p>
                        </div>
                    </div>
                </div>
                <div class="index-metric">
                    <div class="index-metric-top">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <div class="index-metric-icon">
                                    <app-icon name="package" [size]="18" />
                                </div>
                                <p class="index-metric-label">Out of stock</p>
                            </div>
                            <p class="index-metric-value">{{ outCount() }}</p>
                            <p class="om-kpi-meta">Zero available</p>
                        </div>
                    </div>
                </div>
            </div>

            <section class="index-card">
                <div class="om-list-header">
                    <div>
                        <h2 class="om-list-title">Inventory list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                </div>

                <div class="index-filters">
                    <div class="index-filters-leading">
                        <app-search-input
                            placeholder="Filter by SKU or product"
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                    </div>
                </div>

                <div class="index-body">
                    <app-flex-table
                        [columns]="columns()"
                        [fill]="true"
                        [loading]="isLoading()"
                        [empty]="!isLoading() && items().length === 0"
                        emptyTitle="No inventory records"
                        emptyDescription="Stock rows appear once variants are received into a warehouse."
                        [flush]="true"
                        [skeletonRowCount]="8"
                    >
                        @for (item of items(); track item.id) {
                            <app-flex-table-row>
                                <app-flex-table-cell column="sku">
                                    <div class="min-w-0">
                                        <p class="index-cell-primary truncate">{{ item.sku }}</p>
                                        <p class="index-cell-muted truncate text-xs">
                                            {{ item.productName }}
                                        </p>
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="warehouse">
                                    <span class="index-cell-muted">{{ item.warehouseName }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="available">
                                    <div class="w-full space-y-1.5">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="index-cell-money">{{ item.available }}</span>
                                            <app-badge [variant]="availabilityVariant(item)">
                                                {{ healthLabel(item) }}
                                            </app-badge>
                                        </div>
                                        <div class="index-stock">
                                            <div
                                                class="index-stock-fill"
                                                [class.index-stock-fill-warn]="isLow(item)"
                                                [class.index-stock-fill-danger]="item.available <= 0"
                                                [style.width.%]="stockPercent(item)"
                                            ></div>
                                        </div>
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="onHand">
                                    <span class="index-cell-muted tabular-nums">{{ item.onHand }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="reserved">
                                    <span class="index-cell-muted tabular-nums">{{ item.reserved }}</span>
                                </app-flex-table-cell>
                                @if (canManage()) {
                                    <app-flex-table-cell column="actions">
                                        <app-button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            [disabled]="adjustingId() === item.id"
                                            (clicked)="adjustItem(item)"
                                        >
                                            Adjust
                                        </app-button>
                                    </app-flex-table-cell>
                                }
                            </app-flex-table-row>
                        }
                    </app-flex-table>
                </div>

                <div class="index-footer">
                    <app-pagination
                        [page]="currentPage()"
                        [pageSize]="pageSize()"
                        [total]="total()"
                        (pageChange)="currentPage.set($event)"
                    />
                </div>
            </section>
        </div>
    `,
})
export class InventoryListComponent {
    private readonly inventoryApi = inject(InventoryApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly dialog = inject(DialogService);
    private readonly toast = inject(ToastService);

    readonly searchQuery = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);
    readonly adjustingId = signal<string | null>(null);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageInventory),
    );

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'sku', label: 'SKU', grid: 'minmax(10rem, 1.4fr)', primary: true },
            { key: 'warehouse', label: 'Warehouse', grid: 'minmax(8rem, 1fr)', hideBelow: 'md' },
            { key: 'available', label: 'Available', grid: 'minmax(9rem, 1.2fr)' },
            { key: 'onHand', label: 'On hand', grid: 'minmax(5rem, 0.6fr)', hideBelow: 'lg' },
            { key: 'reserved', label: 'Reserved', grid: 'minmax(5rem, 0.6fr)', hideBelow: 'lg' },
        ];
        if (this.canManage()) {
            cols.push({ key: 'actions', label: 'Actions', grid: '5.5rem', headerSrOnly: true });
        }
        return cols;
    });

    readonly pageResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            return {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                search: this.searchQuery().trim() || undefined,
            };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) {
                return of({ items: [], total: 0 } satisfies PageResult);
            }

            throwIfAborted(abortSignal);
            return this.inventoryApi.list(params).pipe(
                map((result) => ({ items: result.data, total: result.total }) satisfies PageResult),
                catchResourceStreamError<PageResult>({
                    fallback: { items: [], total: 0 },
                    logMessage: 'Failed to load inventory:',
                }),
            );
        },
    });

    readonly items = computed(() => this.pageResource.value()?.items ?? []);
    readonly total = computed(() => this.pageResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.pageResource.isLoading());

    readonly outCount = computed(() => this.items().filter((i) => i.available <= 0).length);
    readonly lowCount = computed(
        () => this.items().filter((i) => this.isLow(i) && i.available > 0).length,
    );
    readonly healthyCount = computed(
        () => this.items().filter((i) => !this.isLow(i) && i.available > 0).length,
    );

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.currentPage.set(1);
    }

    isLow(item: InventoryItem): boolean {
        if (item.available <= 0) return true;
        if (item.reorderPoint !== null) return item.available <= item.reorderPoint;
        return item.available <= 5;
    }

    healthLabel(item: InventoryItem): string {
        if (item.available <= 0) return 'Out';
        if (this.isLow(item)) return 'Low';
        return 'In stock';
    }

    stockPercent(item: InventoryItem): number {
        const target = Math.max(item.reorderPoint ?? 20, item.onHand, 1);
        return Math.max(4, Math.min(100, Math.round((item.available / target) * 100)));
    }

    availabilityVariant(item: InventoryItem): BadgeVariant {
        if (item.available <= 0) return 'destructive';
        if (this.isLow(item)) return 'warning';
        return 'success';
    }

    adjustItem(item: InventoryItem): void {
        this.adjustingId.set(item.id);

        this.dialog
            .open<
                InventoryAdjustDialogComponent,
                InventoryAdjustDialogData,
                InventoryAdjustDialogResult | null
            >(InventoryAdjustDialogComponent, {
                data: {
                    itemLabel: item.sku,
                    warehouseName: item.warehouseName,
                    onHand: item.onHand,
                },
                width: '420px',
            })
            .afterClosed()
            .pipe(
                switchMap((result) =>
                    result
                        ? this.inventoryApi.adjust({
                              warehouseId: item.warehouseId,
                              variantId: item.variantId,
                              quantityDelta: result.quantityDelta,
                              note: result.note,
                          })
                        : of(null),
                ),
            )
            .subscribe({
                next: (adjusted) => {
                    this.adjustingId.set(null);
                    if (!adjusted) return;
                    this.toast.success(
                        'Stock adjusted',
                        `${item.sku} is now at ${adjusted.onHand} on hand.`,
                    );
                    this.pageResource.reload();
                },
                error: (error: unknown) => {
                    this.adjustingId.set(null);
                    const message =
                        error && typeof error === 'object' && 'message' in error
                            ? String((error as { message: string }).message)
                            : 'Failed to adjust stock.';
                    this.toast.error('Adjustment failed', message);
                },
            });
    }
}
