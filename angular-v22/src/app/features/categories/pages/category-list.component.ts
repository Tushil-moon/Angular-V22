/**
 * Categories — polished admin list (aligned with Products / Order Management kit)
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

import type {
    Category,
    CategoryListFilters,
    CategoryStatus,
    CategoryTreeNode,
} from '../models/category.model';
import { CategoryApiService } from '../services/category-api.service';
import { flattenCategoryOptions } from '../utils/category-tree.util';
import { openCategoryFormDialog } from '../utils/open-category-form-dialog.util';

interface PageResult {
    items: Category[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-category-list',
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
                    <h1 class="index-title">Categories</h1>
                    <p class="index-subtitle">Organize products into hierarchical categories</p>
                </div>
                @if (canManage()) {
                    <div class="index-actions">
                        <app-button size="toolbar" variant="primary" (clicked)="createCategory()">
                            <app-icon name="plus-square" [size]="14" />
                            Add category
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
                        <h2 class="om-list-title">Category list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <app-list-toolbar variant="row" class="om-list-header-filters">
                        <app-search-input
                            placeholder="Search categories"
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
                        <app-filter-select
                            placeholder="Parent"
                            ariaLabel="Filter by parent category"
                            [options]="parentFilterOptions()"
                            [value]="parentFilter()"
                            (valueChange)="onParentFilter($event)"
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
                            emptyTitle="No categories found"
                            emptyDescription="Add a category or adjust filters."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track item.id) {
                                <app-flex-table-row
                                    class="home-table-row"
                                    [interactive]="true"
                                    (click)="openCategory(item.id)"
                                >
                                    <app-flex-table-cell column="name">
                                        <div class="min-w-0">
                                            <p class="om-product-name">{{ item.name }}</p>
                                            <p class="index-cell-muted truncate text-xs">
                                                {{ item.slug }}
                                            </p>
                                        </div>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="parent">
                                        <span class="index-cell-muted">{{
                                            item.parentName || '—'
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="products">
                                        <span class="index-cell-muted tabular-nums">{{
                                            item.productCount
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="children">
                                        <span class="index-cell-muted tabular-nums">{{
                                            item.childCount
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
                                                (clicked)="deleteCategory(item, $event)"
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
export class CategoryListComponent {
    private readonly api = inject(CategoryApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly dialog = inject(DialogService);

    readonly searchQuery = signal('');
    readonly statusFilter = signal('');
    readonly parentFilter = signal('');
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
        this.permissionService.hasPermission(Permissions.ManageCategories),
    );

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'name', label: 'Category', grid: 'minmax(12rem, 2fr)', primary: true },
            { key: 'parent', label: 'Parent', grid: 'minmax(8rem, 1fr)', hideBelow: 'lg' },
            { key: 'products', label: 'Products', grid: 'minmax(5rem, 0.6fr)', hideBelow: 'sm' },
            { key: 'children', label: 'Children', grid: 'minmax(5rem, 0.6fr)', hideBelow: 'md' },
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

    readonly treeResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of([] as CategoryTreeNode[]);
            return this.api.tree();
        },
    });

    readonly parentFilterOptions = computed(() => {
        const options = flattenCategoryOptions(this.treeResource.value() ?? [], {
            emptyLabel: 'All parents',
        });
        // Keep empty as "all", then real parents (skip the "No parent" semantics for filter)
        return options.map((option, index) =>
            index === 0 ? { value: '', label: 'All parents' } : option,
        );
    });

    readonly summaryResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, published: 0, draft: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.api.list(f as CategoryListFilters), status);
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
                label: 'Total categories',
                value: String(s.total),
                detail: 'All nodes',
                icon: 'folder-open' as const,
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
                status: (this.statusFilter() as CategoryStatus) || undefined,
                parentId: this.parentFilter() || undefined,
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
                    logMessage: 'Failed to load categories:',
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

    onParentFilter(value: string): void {
        this.parentFilter.set(value);
        this.currentPage.set(1);
    }

    statusVariant(status: CategoryStatus): BadgeVariant {
        return catalogStatusVariant(status);
    }

    createCategory(): void {
        openCategoryFormDialog(this.dialog).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
                this.treeResource.reload();
            }
        });
    }

    openCategory(id: string): void {
        openCategoryFormDialog(this.dialog, id).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
                this.treeResource.reload();
            }
        });
    }

    deleteCategory(item: Category, event: Event): void {
        event.stopPropagation();
        this.deletingId.set(item.id);
        this.api.delete(item.id).subscribe({
            next: () => {
                this.toast.success('Category deleted');
                this.deletingId.set(null);
                this.pageResource.reload();
                this.summaryResource.reload();
                this.treeResource.reload();
            },
            error: (error: unknown) => {
                this.deletingId.set(null);
                this.toast.error(apiErrorMessage(error, 'Failed to delete category.'));
            },
        });
    }
}
