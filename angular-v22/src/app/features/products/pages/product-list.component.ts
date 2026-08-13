/**
 * Product catalog — admin panel list (aligned with Order Management kit)
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { CategoryTreeNode } from '@features/categories/models/category.model';
import { CategoryApiService } from '@features/categories/services/category-api.service';
import {
    listTotalCount,
    resolveMediaUrl,
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

import { formatDecimal } from '../../shared/format.util';
import type { Product, ProductStatus, ProductType } from '../models/product.model';
import { ProductApiService } from '../services/product-api.service';
import { getProductTypeLabel, productTypeOptions } from '../utils/product-type.util';
import { openProductFormDialog } from '../utils/open-product-form-dialog.util';
import { openProductImportDialog } from '../utils/open-product-import-dialog.util';

interface PageResult {
    items: Product[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-list',
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
                    <h1 class="index-title">Products</h1>
                    <p class="index-subtitle">Manage catalog items, pricing, and publishing</p>
                </div>
                @if (canManage()) {
                    <div class="index-actions">
                        <app-button size="toolbar" variant="outline" (clicked)="importProducts()">
                            <app-icon name="upload" [size]="14" />
                            Import
                        </app-button>
                        <app-button size="toolbar" variant="primary" (clicked)="createProduct()">
                            <app-icon name="plus-square" [size]="14" />
                            Add product
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
                        <h2 class="om-list-title">Product list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <app-list-toolbar variant="row" class="om-list-header-filters">
                        <app-search-input
                            placeholder="Search products"
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
                            placeholder="Category"
                            ariaLabel="Filter by category"
                            [options]="categoryFilterOptions()"
                            [value]="categoryFilter()"
                            (valueChange)="onCategoryFilter($event)"
                        />
                        <app-filter-select
                            placeholder="Type"
                            ariaLabel="Filter by product type"
                            [options]="typeFilterOptions"
                            [value]="typeFilter()"
                            (valueChange)="onTypeFilter($event)"
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
                            emptyTitle="No products found"
                            emptyDescription="Add a product or adjust filters."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track item.id) {
                                <app-flex-table-row
                                    class="home-table-row"
                                    [interactive]="true"
                                    (click)="openProduct(item.id)"
                                >
                                    <app-flex-table-cell column="product">
                                        <div class="om-product">
                                            @if (primaryImageUrl(item); as imageUrl) {
                                                <img
                                                    [src]="imageUrl"
                                                    [alt]="item.name"
                                                    class="om-product-thumb"
                                                    loading="lazy"
                                                />
                                            } @else {
                                                <div class="om-product-thumb-fallback" aria-hidden="true">
                                                    <app-icon name="package" [size]="16" />
                                                </div>
                                            }
                                            <div class="min-w-0">
                                                <p class="om-product-name">{{ item.name }}</p>
                                                <p class="index-cell-muted truncate text-xs">{{ item.slug }}</p>
                                            </div>
                                        </div>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="sku">
                                        <span class="index-cell-muted">{{ item.sku || '—' }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="categories">
                                        <span class="product-table-categories">{{
                                            formatCategories(item)
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="price">
                                        <span class="index-cell-money">{{ formatPrice(item) }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="status">
                                        <app-badge [variant]="statusVariant(item.status)">
                                            {{ item.status }}
                                        </app-badge>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="type">
                                        <span class="index-cell-muted">{{ typeLabel(item.type) }}</span>
                                    </app-flex-table-cell>
                                    @if (canManage()) {
                                        <app-flex-table-cell column="actions">
                                            <app-button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                [disabled]="deletingId() === item.id"
                                                (clicked)="deleteProduct(item, $event)"
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
export class ProductListComponent {
    private readonly productApi = inject(ProductApiService);
    private readonly categoryApi = inject(CategoryApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly dialog = inject(DialogService);

    readonly searchQuery = signal('');
    readonly statusFilter = signal('');
    readonly categoryFilter = signal('');
    readonly typeFilter = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);
    readonly deletingId = signal<string | null>(null);

    readonly typeFilterOptions = [
        { value: '', label: 'All types' },
        ...productTypeOptions().map((option) => ({ value: option.value, label: option.label })),
    ];

    readonly statusFilterOptions = [
        { value: '', label: 'All statuses' },
        { value: 'PUBLISHED', label: 'Published' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ARCHIVED', label: 'Archived' },
    ];

    readonly categoryTreeResource = rxResource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of([] as CategoryTreeNode[]);
            return this.categoryApi.tree();
        },
    });

    readonly categoryFilterOptions = computed(() => {
        const options = [{ value: '', label: 'All categories' }];
        const walk = (nodes: CategoryTreeNode[], depth: number) => {
            for (const node of nodes) {
                if (node.status === 'PUBLISHED') {
                    const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
                    options.push({ value: node.id, label: `${prefix}${node.name}` });
                }
                if (node.children.length) walk(node.children, depth + 1);
            }
        };
        walk(this.categoryTreeResource.value() ?? [], 0);
        return options;
    });

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageProducts),
    );

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'product', label: 'Product', grid: 'minmax(14rem, 2.2fr)', primary: true },
            { key: 'sku', label: 'SKU', grid: 'minmax(6rem, 0.8fr)', hideBelow: 'md' },
            {
                key: 'categories',
                label: 'Categories',
                grid: 'minmax(8rem, 1fr)',
                hideBelow: 'lg',
            },
            { key: 'price', label: 'Price', grid: 'minmax(5.5rem, 0.65fr)' },
            { key: 'status', label: 'Status', grid: 'minmax(7rem, 0.75fr)' },
            { key: 'type', label: 'Type', grid: 'minmax(6rem, 0.65fr)', hideBelow: 'md' },
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
                listTotalCount((f) => this.productApi.list(f), status);
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
                label: 'Total products',
                value: String(s.total),
                detail: 'All catalog items',
                icon: 'package' as const,
            },
            {
                label: 'Published',
                value: String(s.published),
                detail: 'Live on storefront',
                icon: 'check' as const,
            },
            {
                label: 'Draft',
                value: String(s.draft),
                detail: 'Awaiting publish',
                icon: 'file-text' as const,
            },
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
                status: (status as ProductStatus) || undefined,
                categoryId: this.categoryFilter() || undefined,
                type: (this.typeFilter() as ProductType) || undefined,
            };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) {
                return of({ items: [], total: 0 } satisfies PageResult);
            }

            throwIfAborted(abortSignal);
            return this.productApi.list(params).pipe(
                map((result) => ({ items: result.data, total: result.total }) satisfies PageResult),
                catchResourceStreamError<PageResult>({
                    fallback: { items: [], total: 0 },
                    logMessage: 'Failed to load products:',
                }),
            );
        },
    });

    readonly items = computed(() => this.pageResource.value()?.items ?? []);
    readonly total = computed(() => this.pageResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.pageResource.isLoading());

    readonly primaryImageUrl = (item: Product): string =>
        resolveMediaUrl(item.images[0]?.url ?? '');

    readonly typeLabel = (type: ProductType): string => getProductTypeLabel(type);

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.currentPage.set(1);
    }

    onStatusFilter(value: string): void {
        this.statusFilter.set(value);
        this.currentPage.set(1);
    }

    onCategoryFilter(value: string): void {
        this.categoryFilter.set(value);
        this.currentPage.set(1);
    }

    onTypeFilter(value: string): void {
        this.typeFilter.set(value);
        this.currentPage.set(1);
    }

    formatPrice(item: Product): string {
        return item.price != null ? formatDecimal(item.price) : '—';
    }

    formatCategories(item: Product): string {
        if (!item.categories.length) return '—';
        const names = item.categories.map((category) => category.name);
        if (names.length <= 2) return names.join(', ');
        return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
    }

    statusVariant(status: ProductStatus): BadgeVariant {
        switch (status) {
            case 'PUBLISHED':
                return 'success';
            case 'ARCHIVED':
                return 'secondary';
            default:
                return 'outline';
        }
    }

    createProduct(): void {
        openProductFormDialog(this.dialog).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    importProducts(): void {
        openProductImportDialog(this.dialog).subscribe((result) => {
            if (result === 'imported') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    openProduct(id: string): void {
        openProductFormDialog(this.dialog, id).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    deleteProduct(item: Product, event: Event): void {
        event.stopPropagation();
        this.deletingId.set(item.id);
        this.productApi.delete(item.id).subscribe({
            next: () => {
                this.toast.success('Product deleted');
                this.deletingId.set(null);
                this.pageResource.reload();
                this.summaryResource.reload();
            },
            error: (error: unknown) => {
                this.deletingId.set(null);
                const message =
                    error && typeof error === 'object' && 'message' in error
                        ? String((error as { message: string }).message)
                        : 'Failed to delete product.';
                this.toast.error(message);
            },
        });
    }
}
