/**
 * Order Management — Figma Admin UI Kit (node 5:2353)
 * https://www.figma.com/design/M3bpAZpkKNppHghX3SeMQU/?node-id=5-2353
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService, HttpClientService } from '@services/index';
import {
    BadgeComponent,
    type BadgeVariant,
    ButtonComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    type FlexTableColumn,
    IconComponent,
    ListToolbarComponent,
    PaginationComponent,
    SearchInputComponent,
} from '@shared/components';
import type { IconName } from '@shared/icons';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { ignorePromise } from '@utils/form-display.util';
import { forkJoin, map, of } from 'rxjs';

import { formatDecimal, formatShortDate, orDash } from '../../shared/format.util';
import type { Order, OrderStatus } from '../models/order.model';
import { OrderApiService } from '../services/order-api.service';

interface PageResult {
    items: Order[];
    total: number;
}

interface OrderSummary {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
}

interface OrderKpis {
    orders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    previousPeriodOrders: number;
    previousPeriodPendingOrders: number;
    previousPeriodCompletedOrders: number;
    previousPeriodCancelledOrders: number;
}

interface KpiCard {
    title: string;
    value: number;
    trendLabel: string;
    trendPct: string;
    trendUp: boolean;
}

interface StatusTab {
    label: string;
    value: OrderStatus | 'ALL';
    countKey: keyof OrderSummary;
}

interface AnalyticsDashboardPayload {
    kpis?: {
        orders?: number;
        pending_orders?: number;
        pendingOrders?: number;
        completed_orders?: number;
        completedOrders?: number;
        cancelled_orders?: number;
        cancelledOrders?: number;
        previous_period_orders?: number;
        previousPeriodOrders?: number;
        previous_period_pending_orders?: number;
        previousPeriodPendingOrders?: number;
        previous_period_completed_orders?: number;
        previousPeriodCompletedOrders?: number;
        previous_period_cancelled_orders?: number;
        previousPeriodCancelledOrders?: number;
    };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-order-list',
    imports: [
        SearchInputComponent,
        BadgeComponent,
        ButtonComponent,
        IconComponent,
        ListToolbarComponent,
        PaginationComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
    ],
    template: `
        <div class="index-page page-shell-fill om-page">
            <div class="om-kpi-row">
                @for (card of kpiCards(); track card.title) {
                    <article class="om-kpi-card">
                        <div class="om-kpi-head">
                            <div>
                                <h2 class="om-kpi-title">{{ card.title }}</h2>
                                <p class="om-kpi-period">Last 7 days</p>
                            </div>
                            <button type="button" class="om-kpi-menu" aria-label="More options">
                                <app-icon name="more-vertical" [size]="16" />
                            </button>
                        </div>
                        <div class="om-kpi-value-row">
                            <p class="om-kpi-value">{{ card.value }}</p>
                            <div class="om-kpi-trend-wrap">
                                <span class="om-kpi-trend-label">{{ card.trendLabel }}</span>
                                <span
                                    class="om-kpi-trend"
                                    [class.om-kpi-trend-up]="card.trendUp"
                                    [class.om-kpi-trend-down]="!card.trendUp"
                                >
                                    <app-icon
                                        [name]="card.trendUp ? 'arrow-up' : 'arrow-down'"
                                        [size]="14"
                                    />
                                    {{ card.trendPct }}
                                </span>
                            </div>
                        </div>
                    </article>
                }
            </div>

            <section class="index-card">
                <div class="om-list-header">
                    <h2 class="om-list-title">Order list</h2>
                    <div class="index-actions">
                        <app-button size="toolbar" variant="primary" type="button">
                            <app-icon name="plus-square" [size]="14" />
                            Add Order
                        </app-button>
                        <app-button size="toolbar" variant="outline" type="button">
                            <app-icon name="more-horizontal" [size]="14" />
                            More Action
                        </app-button>
                    </div>
                </div>

                <div class="om-toolbar">
                    <div class="om-pill-tabs" role="tablist">
                        @for (tab of statusTabs; track tab.value) {
                            <button
                                type="button"
                                role="tab"
                                class="om-pill-tab"
                                [class.om-pill-tab-active]="statusFilter() === tab.value"
                                [attr.aria-selected]="statusFilter() === tab.value"
                                (click)="onStatusFilter(tab.value)"
                            >
                                {{ tab.label }}
                                @if (tab.value === 'ALL') {
                                    ({{ summary()[tab.countKey] }})
                                }
                            </button>
                        }
                    </div>

                    <app-list-toolbar>
                        <app-search-input
                            placeholder="Search order report"
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                        <button type="button" class="om-icon-btn" toolbarAction aria-label="Filter orders">
                            <app-icon name="filter" [size]="16" />
                        </button>
                        <button type="button" class="om-icon-btn" toolbarAction aria-label="Sort orders">
                            <app-icon name="arrow-up-down" [size]="16" />
                        </button>
                        <button type="button" class="om-icon-btn" toolbarAction aria-label="More table actions">
                            <app-icon name="more-horizontal" [size]="16" />
                        </button>
                    </app-list-toolbar>
                </div>

                <div class="index-body om-table-wrap">
                    <div class="om-table h-full min-h-0">
                        <app-flex-table
                            [columns]="columns"
                            [fill]="true"
                            [loading]="isLoading()"
                            [empty]="!isLoading() && items().length === 0"
                            emptyTitle="No orders found"
                            emptyDescription="Try another tab or wait for new checkouts."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track item.id; let i = $index) {
                                <app-flex-table-row
                                    class="home-table-row"
                                    [interactive]="true"
                                    (click)="openOrder(item.id)"
                                >
                                    <app-flex-table-cell column="select">
                                        <div class="om-row-check" (click)="$event.stopPropagation()">
                                            <input
                                                type="checkbox"
                                                class="checkbox"
                                                [checked]="isSelected(item.id)"
                                                [attr.aria-label]="'Select order ' + item.orderNumber"
                                                (change)="toggleSelected(item.id, $event)"
                                            />
                                        </div>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="no">
                                        <span class="om-row-num">{{ rowNumber(i) }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="order">
                                        <span class="index-cell-primary">#{{ item.orderNumber }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="product">
                                        <div class="om-product">
                                            @if (productImage(item); as imageUrl) {
                                                <img
                                                    class="om-product-thumb"
                                                    [src]="imageUrl"
                                                    [alt]="productAlt(item)"
                                                    loading="lazy"
                                                />
                                            } @else {
                                                <div class="om-product-thumb-fallback" aria-hidden="true">
                                                    <app-icon name="image" [size]="16" />
                                                </div>
                                            }
                                            <span class="om-product-name">{{ productLabel(item) }}</span>
                                        </div>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="date">
                                        <span class="index-cell-muted">{{ placedAt(item) }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="price">
                                        <span class="index-cell-money">{{ price(item) }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="payment">
                                        <span
                                            class="om-payment"
                                            [class.om-payment-paid]="isPaid(item)"
                                            [class.om-payment-unpaid]="!isPaid(item)"
                                        >
                                            <span class="om-payment-dot" aria-hidden="true"></span>
                                            {{ paymentLabel(item) }}
                                        </span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="status">
                                        <app-badge [variant]="statusVariant(item.status)">
                                            <span class="om-status">
                                                <app-icon [name]="statusIcon(item.status)" [size]="12" />
                                                {{ statusLabel(item.status) }}
                                            </span>
                                        </app-badge>
                                    </app-flex-table-cell>
                                </app-flex-table-row>
                            }
                        </app-flex-table>
                    </div>
                </div>

                <div class="index-footer">
                    <app-pagination
                        mode="numbered"
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
export class OrderListComponent {
    private readonly orderApi = inject(OrderApiService);
    private readonly http = inject(HttpClientService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly searchQuery = signal('');
    readonly statusFilter = signal<OrderStatus | 'ALL'>('ALL');
    readonly currentPage = signal(1);
    readonly pageSize = signal(10);
    readonly selectedIds = signal<ReadonlySet<string>>(new Set());

    readonly statusTabs: StatusTab[] = [
        { label: 'All order', value: 'ALL', countKey: 'total' },
        { label: 'Completed', value: 'COMPLETED', countKey: 'completed' },
        { label: 'Pending', value: 'PENDING', countKey: 'pending' },
        { label: 'Canceled', value: 'CANCELLED', countKey: 'cancelled' },
    ];

    readonly columns: FlexTableColumn[] = [
        { key: 'select', label: '', grid: '2.75rem' },
        { key: 'no', label: 'No.', grid: '3rem' },
        { key: 'order', label: 'Order Id', grid: 'minmax(6.5rem, 0.9fr)', primary: true },
        { key: 'product', label: 'Product', grid: 'minmax(12rem, 2fr)' },
        { key: 'date', label: 'Date', grid: 'minmax(6.5rem, 0.9fr)', hideBelow: 'md' },
        { key: 'price', label: 'Price', grid: 'minmax(5rem, 0.7fr)' },
        { key: 'payment', label: 'Payment', grid: 'minmax(5.5rem, 0.75fr)', hideBelow: 'lg' },
        { key: 'status', label: 'Status', grid: 'minmax(7.5rem, 1fr)' },
    ];

    readonly kpiResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? this.kpiRange() : undefined),
        stream: ({ params }) => {
            if (!params) {
                return of(this.emptyKpis());
            }

            return this.http
                .get<AnalyticsDashboardPayload>('/analytics/dashboard', {
                    params: { from: params.from, to: params.to },
                })
                .pipe(
                    map((res) => this.normalizeKpis(res.data?.kpis)),
                    catchResourceStreamError<OrderKpis>({
                        fallback: this.emptyKpis(),
                        logMessage: 'Order KPI analytics unavailable:',
                    }),
                );
        },
    });

    readonly summaryResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) {
                return of({ total: 0, pending: 0, completed: 0, cancelled: 0 } satisfies OrderSummary);
            }

            const count = (status?: OrderStatus) =>
                this.orderApi.list({ page: 1, pageSize: 1, status }).pipe(
                    map((result) => result.total),
                    catchResourceStreamError<number>({ fallback: 0 }),
                );

            return forkJoin({
                total: count(),
                pending: count('PENDING'),
                completed: count('COMPLETED'),
                cancelled: count('CANCELLED'),
            });
        },
    });

    readonly pageResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            const status = this.statusFilter();
            return {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                search: this.searchQuery().trim() || undefined,
                status: status === 'ALL' ? undefined : status,
            };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) {
                return of({ items: [], total: 0 } satisfies PageResult);
            }

            throwIfAborted(abortSignal);
            return this.orderApi.list(params).pipe(
                map((result) => ({ items: result.data, total: result.total }) satisfies PageResult),
                catchResourceStreamError<PageResult>({
                    fallback: { items: [], total: 0 },
                    logMessage: 'Failed to load orders:',
                }),
            );
        },
    });

    readonly items = computed(() => this.pageResource.value()?.items ?? []);
    readonly total = computed(() => this.pageResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.pageResource.isLoading());
    readonly summary = computed(
        (): OrderSummary =>
            this.summaryResource.value() ?? { total: 0, pending: 0, completed: 0, cancelled: 0 },
    );

    readonly kpiCards = computed((): KpiCard[] => {
        const k = this.kpiResource.value() ?? this.emptyKpis();
        return [
            {
                title: 'Total Order',
                value: k.orders,
                trendLabel: 'order',
                trendPct: this.trendPct(k.orders, k.previousPeriodOrders),
                trendUp: k.orders >= k.previousPeriodOrders,
            },
            {
                title: 'Order Completed',
                value: k.completedOrders,
                trendLabel: 'order',
                trendPct: this.trendPct(k.completedOrders, k.previousPeriodCompletedOrders),
                trendUp: k.completedOrders >= k.previousPeriodCompletedOrders,
            },
            {
                title: 'Order Pending',
                value: k.pendingOrders,
                trendLabel: 'order',
                trendPct: this.trendPct(k.pendingOrders, k.previousPeriodPendingOrders),
                trendUp: k.pendingOrders >= k.previousPeriodPendingOrders,
            },
            {
                title: 'Order Cancelled',
                value: k.cancelledOrders,
                trendLabel: 'order',
                trendPct: this.trendPct(k.cancelledOrders, k.previousPeriodCancelledOrders),
                trendUp: k.cancelledOrders >= k.previousPeriodCancelledOrders,
            },
        ];
    });

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.currentPage.set(1);
    }

    onStatusFilter(value: OrderStatus | 'ALL'): void {
        this.statusFilter.set(value);
        this.currentPage.set(1);
    }

    refresh(): void {
        this.kpiResource.reload();
        this.summaryResource.reload();
        this.pageResource.reload();
    }

    openOrder(id: string): void {
        ignorePromise(this.router.navigate(['/dashboard/orders', id]));
    }

    rowNumber(index: number): number {
        return (this.currentPage() - 1) * this.pageSize() + index + 1;
    }

    isSelected(id: string): boolean {
        return this.selectedIds().has(id);
    }

    toggleSelected(id: string, event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        const next = new Set(this.selectedIds());
        if (checked) {
            next.add(id);
        } else {
            next.delete(id);
        }
        this.selectedIds.set(next);
    }

    productLabel(order: Order): string {
        const item = order.primaryItem;
        if (!item?.productName) return orDash(order.customerEmail);
        if (order.itemCount > 1) {
            return `${item.productName} +${order.itemCount - 1}`;
        }
        return item.productName;
    }

    productImage(order: Order): string | null {
        return order.primaryItem?.imageUrl ?? null;
    }

    productAlt(order: Order): string {
        return order.primaryItem?.imageAlt ?? order.primaryItem?.productName ?? 'Product';
    }

    placedAt(order: Order): string {
        return formatShortDate(order.placedAt ?? order.createdAt);
    }

    price(order: Order): string {
        return formatDecimal(order.grandTotal);
    }

    isPaid(order: Order): boolean {
        const status = order.paymentStatus.toUpperCase();
        return status === 'PAID' || status === 'CAPTURED' || status === 'SUCCEEDED';
    }

    paymentLabel(order: Order): string {
        return this.isPaid(order) ? 'Paid' : 'Unpaid';
    }

    statusLabel(status: OrderStatus): string {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
                return 'Delivered';
            case 'SHIPPED':
            case 'PACKED':
                return 'Shipped';
            case 'CANCELLED':
                return 'Cancelled';
            default:
                if (status === 'PENDING') return 'Pending';
                return status.charAt(0) + status.slice(1).toLowerCase();
        }
    }

    statusIcon(status: OrderStatus): IconName {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
                return 'truck';
            case 'SHIPPED':
            case 'PACKED':
                return 'truck';
            case 'CANCELLED':
            case 'REFUNDED':
                return 'x';
            case 'PENDING':
                return 'clock';
            default:
                return 'alert-circle';
        }
    }

    statusVariant(status: OrderStatus): BadgeVariant {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
                return 'success';
            case 'CANCELLED':
            case 'REFUNDED':
                return 'destructive';
            case 'PENDING':
                return 'warning';
            case 'SHIPPED':
            case 'PACKED':
                return 'secondary';
            default:
                return 'outline';
        }
    }

    private kpiRange(): { from: string; to: string } {
        const to = new Date();
        const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
            from: from.toISOString().slice(0, 10),
            to: to.toISOString().slice(0, 10),
        };
    }

    private emptyKpis(): OrderKpis {
        return {
            orders: 0,
            pendingOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            previousPeriodOrders: 0,
            previousPeriodPendingOrders: 0,
            previousPeriodCompletedOrders: 0,
            previousPeriodCancelledOrders: 0,
        };
    }

    private normalizeKpis(
        kpis: AnalyticsDashboardPayload['kpis'] | undefined,
    ): OrderKpis {
        return {
            orders: kpis?.orders ?? 0,
            pendingOrders: kpis?.pendingOrders ?? kpis?.pending_orders ?? 0,
            completedOrders: kpis?.completedOrders ?? kpis?.completed_orders ?? 0,
            cancelledOrders: kpis?.cancelledOrders ?? kpis?.cancelled_orders ?? 0,
            previousPeriodOrders:
                kpis?.previousPeriodOrders ?? kpis?.previous_period_orders ?? 0,
            previousPeriodPendingOrders:
                kpis?.previousPeriodPendingOrders ?? kpis?.previous_period_pending_orders ?? 0,
            previousPeriodCompletedOrders:
                kpis?.previousPeriodCompletedOrders ?? kpis?.previous_period_completed_orders ?? 0,
            previousPeriodCancelledOrders:
                kpis?.previousPeriodCancelledOrders ?? kpis?.previous_period_cancelled_orders ?? 0,
        };
    }

    private trendPct(current: number, previous: number): string {
        if (previous <= 0) {
            return current > 0 ? '100%' : '0%';
        }
        const delta = ((current - previous) / previous) * 100;
        return `${Math.abs(delta).toFixed(1)}%`;
    }
}
