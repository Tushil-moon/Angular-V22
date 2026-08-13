/**
 * Refunds — workflow list with request, approve, process, complete
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
    apiErrorMessage,
    catalogStatusVariant,
    formatDateTime,
    formatMoney,
    listTotalCount,
    orDash,
} from '@features/shared/admin-list.util';
import { AuthService, DialogService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    type BadgeVariant,
    ButtonComponent,
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
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { finalize, forkJoin, map, of } from 'rxjs';

import type { Refund, RefundListFilters, RefundStatus } from '../models/refund.model';
import { RefundApiService } from '../services/refund-api.service';
import { openRefundFormDialog } from '../utils/open-refund-form-dialog.util';

interface PageResult {
    items: Refund[];
    total: number;
}

interface StatusTab {
    label: string;
    value: RefundStatus | 'ALL';
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-refund-list',
    imports: [
        RouterLink,
        SearchInputComponent,
        FilterSelectComponent,
        ButtonComponent,
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
                    <h1 class="index-title">Refunds</h1>
                    <p class="index-subtitle">Process and audit customer refund requests</p>
                </div>
                @if (canManage()) {
                    <div class="index-actions">
                        <app-button size="toolbar" variant="primary" (clicked)="requestRefund()">
                            <app-icon name="undo-2" [size]="14" />
                            Request refund
                        </app-button>
                    </div>
                }
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
                        <h2 class="om-list-title">Refund list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <app-list-toolbar variant="row" class="om-list-header-filters">
                        <app-search-input
                            placeholder="Search order or reason"
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                        <app-filter-select
                            placeholder="Status"
                            ariaLabel="Filter by status"
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
                            emptyTitle="No refunds found"
                            emptyDescription="Submit a refund request or adjust filters."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track item.id) {
                                <app-flex-table-row class="home-table-row">
                                    <app-flex-table-cell column="order">
                                        @if (item.orderNumber) {
                                            <a
                                                class="om-product-name hover:text-primary hover:underline"
                                                [routerLink]="['/dashboard/orders', item.orderId]"
                                            >
                                                {{ item.orderNumber }}
                                            </a>
                                        } @else {
                                            <span class="index-cell-muted">{{ item.orderId }}</span>
                                        }
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="amount">
                                        <span class="index-cell-money">{{
                                            formatMoney(item.amount, item.currencyCode)
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="reason">
                                        <span class="index-cell-muted">{{ orDash(item.reason) }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="created">
                                        <span class="index-cell-muted">{{
                                            formatDateTime(item.createdAt)
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="status">
                                        <app-badge [variant]="statusVariant(item.status)">
                                            {{ item.status }}
                                        </app-badge>
                                    </app-flex-table-cell>
                                    @if (canManage()) {
                                        <app-flex-table-cell column="actions">
                                            <div class="flex flex-wrap items-center gap-1">
                                                @if (item.status === 'REQUESTED') {
                                                    <app-button
                                                        size="sm"
                                                        type="button"
                                                        [disabled]="pendingId() === item.id"
                                                        (clicked)="transition(item, 'APPROVED')"
                                                    >
                                                        Approve
                                                    </app-button>
                                                    <app-button
                                                        size="sm"
                                                        variant="outline"
                                                        type="button"
                                                        [disabled]="pendingId() === item.id"
                                                        (clicked)="transition(item, 'REJECTED')"
                                                    >
                                                        Reject
                                                    </app-button>
                                                }
                                                @if (item.status === 'APPROVED') {
                                                    <app-button
                                                        size="sm"
                                                        type="button"
                                                        [disabled]="pendingId() === item.id"
                                                        (clicked)="transition(item, 'PROCESSING')"
                                                    >
                                                        Process
                                                    </app-button>
                                                }
                                                @if (item.status === 'PROCESSING') {
                                                    <app-button
                                                        size="sm"
                                                        type="button"
                                                        [disabled]="pendingId() === item.id"
                                                        (clicked)="transition(item, 'COMPLETED')"
                                                    >
                                                        Complete
                                                    </app-button>
                                                }
                                            </div>
                                        </app-flex-table-cell>
                                    }
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
export class RefundListComponent {
    private readonly api = inject(RefundApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly dialog = inject(DialogService);

    readonly orDash = orDash;
    readonly formatMoney = formatMoney;
    readonly formatDateTime = formatDateTime;

    readonly searchQuery = signal('');
    readonly statusFilter = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);
    readonly pendingId = signal<string | null>(null);

    readonly statusFilterOptions = [
        { value: '', label: 'All statuses' },
        { value: 'REQUESTED', label: 'Requested' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'PROCESSING', label: 'Processing' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'REJECTED', label: 'Rejected' },
    ];

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageRefunds),
    );

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'order', label: 'Order', grid: 'minmax(9rem, 1.2fr)', primary: true },
            { key: 'amount', label: 'Amount', grid: 'minmax(6rem, 0.7fr)' },
            { key: 'reason', label: 'Reason', grid: 'minmax(10rem, 1.5fr)', hideBelow: 'md' },
            { key: 'created', label: 'Created', grid: 'minmax(8rem, 1fr)', hideBelow: 'lg' },
            { key: 'status', label: 'Status', grid: 'minmax(7rem, 0.75fr)' },
        ];
        if (this.canManage()) {
            cols.push({
                key: 'actions',
                label: 'Actions',
                grid: 'minmax(10rem, 1.2fr)',
                headerSrOnly: true,
            });
        }
        return cols;
    });

    readonly summaryResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, requested: 0, completed: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.api.list(f as RefundListFilters), status);
            return forkJoin({
                total: count(),
                requested: count('REQUESTED'),
                completed: count('COMPLETED'),
            });
        },
    });

    readonly kpiCards = computed(() => {
        const s = this.summaryResource.value() ?? { total: 0, requested: 0, completed: 0 };
        return [
            {
                label: 'Total refunds',
                value: String(s.total),
                detail: 'All requests',
                icon: 'undo-2' as const,
            },
            {
                label: 'Requested',
                value: String(s.requested),
                detail: 'Awaiting action',
                icon: 'activity' as const,
            },
            {
                label: 'Completed',
                value: String(s.completed),
                detail: 'Fully processed',
                icon: 'check' as const,
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
                status: (this.statusFilter() as RefundStatus) || undefined,
            };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) {
                return of({ items: [], total: 0 } satisfies PageResult);
            }

            throwIfAborted(abortSignal);
            return this.api.list(params).pipe(
                map((result) => ({ items: result.data, total: result.total }) satisfies PageResult),
                catchResourceStreamError<PageResult>({
                    fallback: { items: [], total: 0 },
                    logMessage: 'Failed to load refunds:',
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

    statusVariant(status: RefundStatus): BadgeVariant {
        return catalogStatusVariant(status);
    }

    requestRefund(): void {
        openRefundFormDialog(this.dialog).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    transition(item: Refund, status: RefundStatus): void {
        this.pendingId.set(item.id);
        this.api
            .updateStatus(item.id, { status })
            .pipe(finalize(() => this.pendingId.set(null)))
            .subscribe({
                next: () => {
                    this.toast.success(`Refund ${status.toLowerCase()}`);
                    this.pageResource.reload();
                    this.summaryResource.reload();
                },
                error: (error: unknown) => {
                    this.toast.error(apiErrorMessage(error, 'Failed to update refund.'));
                },
            });
    }
}
