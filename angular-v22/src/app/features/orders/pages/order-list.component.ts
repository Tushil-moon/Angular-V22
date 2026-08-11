/**
 * Order Management — Figma Admin UI Kit (node 5:2353), mapped to our theme
 * https://www.figma.com/design/5BaKpvAQuYjEYp8ZKuefFc/?node-id=5-2353
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '@services/index';
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
import type { IconName } from '@shared/icons';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { ignorePromise } from '@utils/form-display.util';
import { forkJoin, map, of } from 'rxjs';

import { formatDate, formatMoney, orDash, titleCase } from '../../shared/format.util';
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

interface StatusTab {
    label: string;
    value: OrderStatus | 'ALL';
    countKey: keyof OrderSummary;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-order-list',
    imports: [
        SearchInputComponent,
        BadgeComponent,
        ButtonComponent,
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
                    <h1 class="index-title">Order Management</h1>
                    <p class="index-subtitle">Monitor fulfillment, payments, and order status</p>
                </div>
            </div>

            <div class="index-metrics shrink-0">
                @for (card of kpiCards(); track card.label) {
                    <div class="index-metric">
                        <div class="index-metric-top">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <div class="index-metric-icon">
                                        <app-icon [name]="card.icon" [size]="18" />
                                    </div>
                                    <p class="index-metric-label">{{ card.label }}</p>
                                </div>
                                <p class="index-metric-value">{{ card.value }}</p>
                                <p class="om-kpi-meta">{{ card.hint }}</p>
                            </div>
                        </div>
                    </div>
                }
            </div>

            <section class="index-card">
                <div class="om-list-header">
                    <div>
                        <h2 class="om-list-title">Order list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <div class="index-actions">
                        <app-button size="sm" variant="outline" type="button" (clicked)="refresh()">
                            <app-icon name="activity" [size]="14" />
                            Refresh
                        </app-button>
                    </div>
                </div>

                <div class="index-tabs" role="tablist">
                    @for (tab of statusTabs; track tab.value) {
                        <button
                            type="button"
                            role="tab"
                            class="index-tab"
                            [class.index-tab-active]="statusFilter() === tab.value"
                            [attr.aria-selected]="statusFilter() === tab.value"
                            (click)="onStatusFilter(tab.value)"
                        >
                            {{ tab.label }} ({{ summary()[tab.countKey] }})
                        </button>
                    }
                </div>

                <div class="index-filters">
                    <div class="index-filters-leading">
                        <app-search-input
                            placeholder="Search order report"
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                    </div>
                </div>

                <div class="index-body">
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
                                <app-flex-table-cell column="no">
                                    <span class="om-row-num">{{ rowNumber(i) }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="order">
                                    <span class="index-cell-primary">#{{ item.orderNumber }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="customer">
                                    <span class="index-cell-muted">{{ orDash(item.customerEmail) }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="date">
                                    <span class="index-cell-muted">{{ placedAt(item) }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="price">
                                    <span class="index-cell-money">{{ money(item) }}</span>
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
export class OrderListComponent {
    private readonly orderApi = inject(OrderApiService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly searchQuery = signal('');
    readonly statusFilter = signal<OrderStatus | 'ALL'>('ALL');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);

    readonly statusTabs: StatusTab[] = [
        { label: 'All order', value: 'ALL', countKey: 'total' },
        { label: 'Completed', value: 'COMPLETED', countKey: 'completed' },
        { label: 'Pending', value: 'PENDING', countKey: 'pending' },
        { label: 'Canceled', value: 'CANCELLED', countKey: 'cancelled' },
    ];

    readonly columns: FlexTableColumn[] = [
        { key: 'no', label: 'No.', grid: '3.5rem' },
        { key: 'order', label: 'Order ID', grid: 'minmax(7rem, 1fr)', primary: true },
        { key: 'customer', label: 'Customer', grid: 'minmax(10rem, 1.4fr)' },
        { key: 'date', label: 'Date', grid: 'minmax(7rem, 1fr)', hideBelow: 'md' },
        { key: 'price', label: 'Price', grid: 'minmax(6rem, 0.8fr)' },
        { key: 'payment', label: 'Payment', grid: 'minmax(6rem, 0.8fr)', hideBelow: 'lg' },
        { key: 'status', label: 'Status', grid: 'minmax(8rem, 1fr)' },
    ];

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

    readonly kpiCards = computed(() => {
        const s = this.summary();
        return [
            {
                label: 'Total orders',
                value: s.total,
                hint: 'All time in store',
                icon: 'shopping-cart' as IconName,
            },
            {
                label: 'New orders',
                value: s.pending,
                hint: 'Awaiting confirmation',
                icon: 'package' as IconName,
            },
            {
                label: 'Completed orders',
                value: s.completed,
                hint: 'Marked completed',
                icon: 'check' as IconName,
            },
            {
                label: 'Canceled orders',
                value: s.cancelled,
                hint: 'Cancelled checkouts',
                icon: 'x' as IconName,
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
        this.summaryResource.reload();
        this.pageResource.reload();
    }

    openOrder(id: string): void {
        ignorePromise(this.router.navigate(['/dashboard/orders', id]));
    }

    rowNumber(index: number): number {
        return (this.currentPage() - 1) * this.pageSize() + index + 1;
    }

    orDash = orDash;

    placedAt(order: Order): string {
        return formatDate(order.placedAt ?? order.createdAt);
    }

    money(order: Order): string {
        return formatMoney(order.grandTotal, order.currencyCode);
    }

    isPaid(order: Order): boolean {
        const status = order.paymentStatus.toUpperCase();
        return status === 'PAID' || status === 'CAPTURED' || status === 'SUCCEEDED';
    }

    paymentLabel(order: Order): string {
        return this.isPaid(order) ? 'Paid' : 'Unpaid';
    }

    statusLabel(status: OrderStatus): string {
        if (status === 'CANCELLED') return 'Cancelled';
        return titleCase(status);
    }

    statusIcon(status: OrderStatus): IconName {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED':
                return 'check';
            case 'SHIPPED':
            case 'PACKED':
                return 'truck';
            case 'CANCELLED':
            case 'REFUNDED':
                return 'x';
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
}
