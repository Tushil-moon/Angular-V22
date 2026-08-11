/**
 * Review moderation — Resource Index with KPI strip + list header
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { listTotalCount } from '@features/shared/admin-list.util';
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
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { finalize, forkJoin, map, of } from 'rxjs';

import { apiErrorMessage, formatDateTime, orDash } from '../../shared/format.util';
import type { Review, ReviewStatus } from '../models/review.model';
import { ReviewApiService } from '../services/review-api.service';

interface PageResult {
    items: Review[];
    total: number;
}

interface StatusTab {
    label: string;
    value: ReviewStatus | 'ALL';
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-review-list',
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
                    <h1 class="index-title">Reviews</h1>
                    <p class="index-subtitle">Moderate customer feedback before it goes live</p>
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
                                @if (card.detail) {
                                    <p class="om-kpi-meta">{{ card.detail }}</p>
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>

            <section class="index-card">
                <div class="om-list-header">
                    <div>
                        <h2 class="om-list-title">Review list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
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
                            {{ tab.label }}
                        </button>
                    }
                </div>

                <div class="index-filters">
                    <div class="index-filters-leading">
                        <app-search-input
                            placeholder="Filter reviews"
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
                        emptyTitle="No reviews in this view"
                        emptyDescription="Switch tabs or wait for new ratings."
                        [flush]="true"
                        [skeletonRowCount]="8"
                    >
                        @for (item of items(); track item.id) {
                            <app-flex-table-row>
                                <app-flex-table-cell column="review">
                                    <div class="min-w-0 space-y-0.5">
                                        <p class="index-cell-primary truncate">
                                            {{ display(item.title) }}
                                        </p>
                                        <p class="index-cell-muted line-clamp-1 text-xs">
                                            {{ item.body || 'No comment' }}
                                        </p>
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="product">
                                    <span class="index-cell-muted">{{ display(item.productName) }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="rating">
                                    <span class="index-cell-money">{{ item.rating }}/5</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="date">
                                    <span class="index-cell-muted">{{ dateTime(item.createdAt) }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="status">
                                    <app-badge [variant]="statusVariant(item.status)">
                                        {{ item.status }}
                                    </app-badge>
                                </app-flex-table-cell>
                                @if (canModerate()) {
                                    <app-flex-table-cell column="actions">
                                        <div class="flex items-center gap-1">
                                            <app-button
                                                size="sm"
                                                type="button"
                                                [disabled]="
                                                    pendingId() === item.id || item.status === 'APPROVED'
                                                "
                                                (clicked)="moderate(item, 'APPROVED')"
                                            >
                                                Approve
                                            </app-button>
                                            <app-button
                                                size="sm"
                                                variant="outline"
                                                type="button"
                                                [disabled]="
                                                    pendingId() === item.id || item.status === 'REJECTED'
                                                "
                                                (clicked)="moderate(item, 'REJECTED')"
                                            >
                                                Reject
                                            </app-button>
                                        </div>
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
export class ReviewListComponent {
    private readonly reviewApi = inject(ReviewApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);

    readonly searchQuery = signal('');
    readonly statusFilter = signal<ReviewStatus | 'ALL'>('PENDING');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);
    readonly pendingId = signal<string | null>(null);

    readonly canModerate = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageReviews),
    );

    readonly statusTabs: StatusTab[] = [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Flagged', value: 'FLAGGED' },
        { label: 'All', value: 'ALL' },
    ];

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'review', label: 'Review', grid: 'minmax(12rem, 2fr)', primary: true },
            { key: 'product', label: 'Product', grid: 'minmax(8rem, 1fr)', hideBelow: 'md' },
            { key: 'rating', label: 'Rating', grid: 'minmax(4rem, 0.5fr)' },
            { key: 'date', label: 'Date', grid: 'minmax(7rem, 0.8fr)', hideBelow: 'lg' },
            { key: 'status', label: 'Status', grid: 'minmax(6rem, 0.7fr)' },
        ];
        if (this.canModerate()) {
            cols.push({ key: 'actions', label: 'Actions', grid: 'minmax(10rem, 1fr)' });
        }
        return cols;
    });

    readonly summaryResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, pending: 0, approved: 0, flagged: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.reviewApi.list(f), status);
            return forkJoin({
                total: count(),
                pending: count('PENDING'),
                approved: count('APPROVED'),
                flagged: count('FLAGGED'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? {
            total: 0,
            pending: 0,
            approved: 0,
            flagged: 0,
        };
        return [
            { label: 'Total reviews', value: String(s.total), detail: 'All feedback', icon: 'star' },
            { label: 'Pending', value: String(s.pending), detail: 'Awaiting moderation', icon: 'activity' },
            { label: 'Approved', value: String(s.approved), detail: 'Visible publicly', icon: 'check' },
            { label: 'Flagged', value: String(s.flagged), detail: 'Needs review', icon: 'alert-circle' },
        ];
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
            return this.reviewApi.list(params).pipe(
                map((result) => ({ items: result.data, total: result.total }) satisfies PageResult),
                catchResourceStreamError<PageResult>({
                    fallback: { items: [], total: 0 },
                    logMessage: 'Failed to load reviews:',
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

    onStatusFilter(value: ReviewStatus | 'ALL'): void {
        this.statusFilter.set(value);
        this.currentPage.set(1);
    }

    display(value: string | null): string {
        return orDash(value);
    }

    dateTime(value: string | null): string {
        return formatDateTime(value);
    }

    statusVariant(status: ReviewStatus): BadgeVariant {
        switch (status) {
            case 'APPROVED':
                return 'success';
            case 'REJECTED':
                return 'destructive';
            case 'FLAGGED':
                return 'warning';
            default:
                return 'outline';
        }
    }

    moderate(review: Review, status: ReviewStatus): void {
        if (this.pendingId()) return;

        this.pendingId.set(review.id);
        this.reviewApi
            .updateStatus(review.id, status)
            .pipe(finalize(() => this.pendingId.set(null)))
            .subscribe({
                next: () => {
                    this.toast.success('Review updated', `Review marked ${status.toLowerCase()}.`);
                    this.pageResource.reload();
                    this.summaryResource.reload();
                },
                error: (error: unknown) => {
                    this.toast.error(apiErrorMessage(error, 'Could not update this review.'));
                },
            });
    }
}
