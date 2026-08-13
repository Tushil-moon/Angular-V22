/**
 * Transactions — read-only payment ledger with order links
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
    catalogStatusVariant,
    formatDateTime,
    formatMoney,
    listTotalCount,
    orDash,
    titleCase,
} from '@features/shared/admin-list.util';
import { AuthService } from '@services/index';
import {
    BadgeComponent,
    type BadgeVariant,
    FilterSelectComponent,
    FlexTableCellComponent,
    type FlexTableColumn,
    FlexTableComponent,
    FlexTableRowComponent,
    IconComponent,
    ListToolbarComponent,
    PaginationComponent,
    SearchInputComponent,
} from '@shared/components';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { forkJoin, map, of } from 'rxjs';

import type { Payment, PaymentStatus } from '../models/payment.model';
import { PaymentApiService } from '../services/payment-api.service';

interface PageResult {
    items: Payment[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-payment-list',
    imports: [
        RouterLink,
        SearchInputComponent,
        FilterSelectComponent,
        IconComponent,
        BadgeComponent,
        ListToolbarComponent,
        PaginationComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
    ],
    template: `
        <div class="index-page page-shell-fill om-page">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">Transactions</h1>
                    <p class="index-subtitle">Payment authorizations, captures, and settlement status</p>
                </div>
            </div>

            <div class="product-kpi-row shrink-0">
                @for (card of kpiCards(); track card.label) {
                    <article class="index-metric">
                        <div class="index-metric-top">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <div class="index-metric-icon">
                                        <app-icon [name]="card.icon" [size]="18" />
                                    </div>
                                    <p class="index-metric-label">{{ card.label }}</p>
                                </div>
                                <p class="index-metric-value">{{ card.value }}</p>
                                @if (card.detail) {
                                    <p class="om-kpi-meta">{{ card.detail }}</p>
                                }
                            </div>
                        </div>
                    </article>
                }
            </div>

            <section class="index-card">
                <div class="om-list-header">
                    <div class="om-list-header-copy">
                        <h2 class="om-list-title">Transaction list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <app-list-toolbar variant="row" class="om-list-header-filters">
                        <app-search-input
                            placeholder="Search by order"
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                        <app-filter-select
                            placeholder="Status"
                            ariaLabel="Filter by payment status"
                            [options]="statusFilterOptions"
                            [value]="statusFilter()"
                            (valueChange)="onStatusFilter($event)"
                        />
                    </app-list-toolbar>
                </div>

                <div class="index-body om-table-wrap">
                    <div class="om-table h-full min-h-0">
                        <app-flex-table
                            [columns]="columns()"
                            [fill]="true"
                            [loading]="isLoading()"
                            [empty]="!isLoading() && items().length === 0"
                            emptyTitle="No transactions found"
                            emptyDescription="Payments will appear here after checkout."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track item.id) {
                                <app-flex-table-row class="home-table-row">
                                    <app-flex-table-cell column="order">
                                        @if (item.orderId && item.orderNumber) {
                                            <a
                                                class="om-product-name hover:text-primary hover:underline"
                                                [routerLink]="['/dashboard/orders', item.orderId]"
                                            >
                                                {{ item.orderNumber }}
                                            </a>
                                        } @else {
                                            <span class="index-cell-muted">{{
                                                orDash(item.orderNumber)
                                            }}</span>
                                        }
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="amount">
                                        <span class="index-cell-money">{{
                                            formatMoney(item.amount, item.currencyCode)
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="customer">
                                        <span class="index-cell-muted">{{
                                            orDash(item.orderEmail)
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="created">
                                        <span class="index-cell-muted">{{
                                            formatDateTime(item.createdAt)
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="status">
                                        <app-badge [variant]="statusVariant(item.status)">
                                            {{ titleCase(item.status) }}
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
export class PaymentListComponent {
    private readonly paymentApi = inject(PaymentApiService);
    private readonly authService = inject(AuthService);

    readonly orDash = orDash;
    readonly formatMoney = formatMoney;
    readonly formatDateTime = formatDateTime;
    readonly titleCase = titleCase;

    readonly searchQuery = signal('');
    readonly statusFilter = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);

    readonly statusFilterOptions = [
        { value: '', label: 'All statuses' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'AUTHORIZED', label: 'Authorized' },
        { value: 'CAPTURED', label: 'Captured' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'CANCELLED', label: 'Cancelled' },
        { value: 'REFUNDED', label: 'Refunded' },
        { value: 'PARTIALLY_REFUNDED', label: 'Partially refunded' },
    ];

    readonly columns = computed((): FlexTableColumn[] => [
        { key: 'order', label: 'Order', grid: 'minmax(9rem, 1.2fr)', primary: true },
        { key: 'amount', label: 'Amount', grid: 'minmax(6rem, 0.7fr)' },
        { key: 'customer', label: 'Customer', grid: 'minmax(10rem, 1.2fr)', hideBelow: 'lg' },
        { key: 'created', label: 'Created', grid: 'minmax(8rem, 1fr)', hideBelow: 'md' },
        { key: 'status', label: 'Status', grid: 'minmax(7rem, 0.75fr)' },
    ]);

    readonly summaryResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, captured: 0, pending: 0, failed: 0 });
            const count = (status?: string) => listTotalCount((f) => this.paymentApi.list(f), status);
            return forkJoin({
                total: count(),
                captured: count('CAPTURED'),
                pending: count('PENDING'),
                failed: count('FAILED'),
            });
        },
    });

    readonly kpiCards = computed(() => {
        const s = this.summaryResource.value() ?? { total: 0, captured: 0, pending: 0, failed: 0 };
        return [
            {
                label: 'Total transactions',
                value: String(s.total),
                detail: 'All payments',
                icon: 'credit-card' as const,
            },
            {
                label: 'Captured',
                value: String(s.captured),
                detail: 'Settled successfully',
                icon: 'check' as const,
            },
            {
                label: 'Pending',
                value: String(s.pending),
                detail: 'Awaiting capture',
                icon: 'activity' as const,
            },
            {
                label: 'Failed',
                value: String(s.failed),
                detail: 'Needs attention',
                icon: 'alert-circle' as const,
            },
        ];
    });

    readonly pageResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            return {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                search: this.searchQuery().trim() || undefined,
                status: (this.statusFilter() as PaymentStatus) || undefined,
            };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) {
                return of({ items: [], total: 0 } satisfies PageResult);
            }

            throwIfAborted(abortSignal);
            return this.paymentApi.list(params).pipe(
                map((result) => ({ items: result.data, total: result.total }) satisfies PageResult),
                catchResourceStreamError<PageResult>({
                    fallback: { items: [], total: 0 },
                    logMessage: 'Failed to load transactions:',
                }),
            );
        },
    });

    readonly items = computed(() => this.pageResource.value()?.items ?? []);
    readonly total = computed(() => this.pageResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.pageResource.isLoading());

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.currentPage.set(1);
    }

    onStatusFilter(value: string): void {
        this.statusFilter.set(value);
        this.currentPage.set(1);
    }

    statusVariant(status: PaymentStatus): BadgeVariant {
        return catalogStatusVariant(status);
    }
}
