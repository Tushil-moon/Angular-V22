/**
 * Brands — polished admin list (aligned with Products / Categories kit)
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    apiErrorMessage,
    catalogStatusVariant,
    listTotalCount,
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
import { forkJoin, map, of } from 'rxjs';

import type { Brand, BrandListFilters, BrandStatus } from '../models/brand.model';
import { BrandApiService } from '../services/brand-api.service';
import { openBrandFormDialog } from '../utils/open-brand-form-dialog.util';

interface PageResult {
    items: Brand[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-brand-list',
    imports: [
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
                    <h1 class="index-title">Brands</h1>
                    <p class="index-subtitle">
                        Manage the manufacturers and labels behind your products
                    </p>
                </div>
                @if (canManage()) {
                    <div class="index-actions">
                        <app-button size="toolbar" variant="primary" (clicked)="createBrand()">
                            <app-icon name="plus-square" [size]="14" />
                            Add brand
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
                        <h2 class="om-list-title">Brand list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <app-list-toolbar variant="row" class="om-list-header-filters">
                        <app-search-input
                            placeholder="Search brands"
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
                            emptyTitle="No brands found"
                            emptyDescription="Add a brand or adjust filters."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track item.id) {
                                <app-flex-table-row
                                    class="home-table-row"
                                    [interactive]="true"
                                    (click)="openBrand(item.id)"
                                >
                                    <app-flex-table-cell column="name">
                                        <div class="min-w-0">
                                            <p class="om-product-name">{{ item.name }}</p>
                                            <p class="index-cell-muted truncate text-xs">
                                                {{ item.slug }}
                                            </p>
                                        </div>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="website">
                                        @if (item.website) {
                                            <a
                                                class="index-cell-muted truncate hover:text-primary hover:underline"
                                                [href]="item.website"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                (click)="$event.stopPropagation()"
                                            >
                                                {{ formatWebsite(item.website) }}
                                            </a>
                                        } @else {
                                            <span class="index-cell-muted">—</span>
                                        }
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="products">
                                        <span class="index-cell-muted tabular-nums">{{
                                            item.productCount
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="sort">
                                        <span class="index-cell-muted tabular-nums">{{
                                            item.sortOrder
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="status">
                                        <app-badge [variant]="statusVariant(item.status)">
                                            {{ item.status }}
                                        </app-badge>
                                    </app-flex-table-cell>
                                    @if (canManage()) {
                                        <app-flex-table-cell column="actions">
                                            <app-button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                [disabled]="deletingId() === item.id"
                                                (clicked)="deleteBrand(item, $event)"
                                            >
                                                <span class="sr-only">Delete {{ item.name }}</span>
                                                <app-icon name="trash-2" [size]="16" />
                                            </app-button>
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
export class BrandListComponent {
    private readonly api = inject(BrandApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly dialog = inject(DialogService);

    readonly searchQuery = signal('');
    readonly statusFilter = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);
    readonly deletingId = signal<string | null>(null);

    readonly statusFilterOptions = [
        { value: '', label: 'All statuses' },
        { value: 'PUBLISHED', label: 'Published' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ARCHIVED', label: 'Archived' },
    ];

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageBrands),
    );

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'name', label: 'Brand', grid: 'minmax(12rem, 2fr)', primary: true },
            { key: 'website', label: 'Website', grid: 'minmax(10rem, 1.2fr)', hideBelow: 'lg' },
            { key: 'products', label: 'Products', grid: 'minmax(5rem, 0.6fr)', hideBelow: 'sm' },
            { key: 'sort', label: 'Sort', grid: 'minmax(4rem, 0.45fr)', hideBelow: 'md' },
            { key: 'status', label: 'Status', grid: 'minmax(7rem, 0.75fr)' },
        ];
        if (this.canManage()) {
            cols.push({
                key: 'actions',
                label: 'Actions',
                grid: '3rem',
                headerSrOnly: true,
            });
        }
        return cols;
    });

    readonly summaryResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, published: 0, draft: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.api.list(f as BrandListFilters), status);
            return forkJoin({
                total: count(),
                published: count('PUBLISHED'),
                draft: count('DRAFT'),
            });
        },
    });

    readonly kpiCards = computed(() => {
        const s = this.summaryResource.value() ?? { total: 0, published: 0, draft: 0 };
        return [
            {
                label: 'Total brands',
                value: String(s.total),
                detail: 'All labels',
                icon: 'tag' as const,
            },
            {
                label: 'Published',
                value: String(s.published),
                detail: 'Visible in catalog',
                icon: 'check' as const,
            },
            {
                label: 'Draft',
                value: String(s.draft),
                detail: 'Not published yet',
                icon: 'file-text' as const,
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
                status: (this.statusFilter() as BrandStatus) || undefined,
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
                    logMessage: 'Failed to load brands:',
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

    formatWebsite(url: string): string {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }

    statusVariant(status: BrandStatus): BadgeVariant {
        return catalogStatusVariant(status);
    }

    createBrand(): void {
        openBrandFormDialog(this.dialog).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    openBrand(id: string): void {
        openBrandFormDialog(this.dialog, id).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    deleteBrand(item: Brand, event: Event): void {
        event.stopPropagation();
        this.deletingId.set(item.id);
        this.api.delete(item.id).subscribe({
            next: () => {
                this.toast.success('Brand deleted');
                this.deletingId.set(null);
                this.pageResource.reload();
                this.summaryResource.reload();
            },
            error: (error: unknown) => {
                this.deletingId.set(null);
                this.toast.error(apiErrorMessage(error, 'Failed to delete brand.'));
            },
        });
    }
}
