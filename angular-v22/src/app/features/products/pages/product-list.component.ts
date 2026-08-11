/**
 * Product catalog — Resource Index with KPI strip (aligned to Categories / Orders)
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
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
import { ignorePromise } from '@utils/form-display.util';
import { forkJoin, map, of } from 'rxjs';

import type { Product, ProductStatus } from '../models/product.model';
import { ProductApiService } from '../services/product-api.service';

interface PageResult {
    items: Product[];
    total: number;
}

interface StatusTab {
    label: string;
    value: ProductStatus | 'ALL';
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-list',
    imports: [
        SearchInputComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
        PaginationComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
    ],
    template: `
        <div class="index-page page-shell-fill">
            <div class="index-header">
                <div class="index-header-copy">
                    <h1 class="index-title">Products</h1>
                    <p class="index-subtitle">Manage your catalog and publishing status</p>
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
                        <h2 class="om-list-title">Product list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <div class="index-actions">
                        @if (canManage()) {
                            <app-button size="sm" (clicked)="createProduct()">
                                <app-icon name="plus" [size]="14" />
                                Add product
                            </app-button>
                        }
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
                            placeholder="Filter products"
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
                        emptyTitle="No products found"
                        emptyDescription="Add a product or change the status tab."
                        [flush]="true"
                        [skeletonRowCount]="8"
                    >
                        @for (item of items(); track item.id) {
                            <app-flex-table-row
                                class="home-table-row"
                                (click)="openProduct(item.id)"
                            >
                                <app-flex-table-cell column="name">
                                    <div class="min-w-0">
                                        <p class="index-cell-primary truncate">{{ item.name }}</p>
                                        <p class="index-cell-muted truncate text-xs">{{ item.slug }}</p>
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="status">
                                    <app-badge [variant]="statusVariant(item.status)">
                                        {{ item.status }}
                                    </app-badge>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="type">
                                    <span class="index-cell-muted">{{ item.type }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="featured">
                                    @if (item.featured) {
                                        <app-badge variant="secondary">Featured</app-badge>
                                    } @else {
                                        <span class="index-cell-muted">—</span>
                                    }
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
                                            <span class="sr-only">Delete</span>
                                            <app-icon name="trash-2" [size]="16" />
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
export class ProductListComponent {
    private readonly productApi = inject(ProductApiService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly router = inject(Router);

    readonly searchQuery = signal('');
    readonly statusFilter = signal<ProductStatus | 'ALL'>('ALL');
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);
    readonly deletingId = signal<string | null>(null);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageProducts),
    );

    readonly statusTabs: StatusTab[] = [
        { label: 'All', value: 'ALL' },
        { label: 'Published', value: 'PUBLISHED' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Archived', value: 'ARCHIVED' },
    ];

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'name', label: 'Product', grid: 'minmax(12rem, 2fr)', primary: true },
            { key: 'status', label: 'Status', grid: 'minmax(7rem, 0.7fr)' },
            { key: 'type', label: 'Type', grid: 'minmax(6rem, 0.6fr)', hideBelow: 'md' },
            { key: 'featured', label: 'Featured', grid: 'minmax(6rem, 0.7fr)', hideBelow: 'lg' },
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

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, published: 0, draft: 0 };
        return [
            { label: 'Total products', value: String(s.total), detail: 'All catalog items', icon: 'package' },
            { label: 'Published', value: String(s.published), detail: 'Live on storefront', icon: 'check' },
            { label: 'Draft', value: String(s.draft), detail: 'Not published yet', icon: 'file-text' },
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

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.currentPage.set(1);
    }

    onStatusFilter(value: ProductStatus | 'ALL'): void {
        this.statusFilter.set(value);
        this.currentPage.set(1);
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
        ignorePromise(this.router.navigate(['/dashboard/products/new']));
    }

    openProduct(id: string): void {
        ignorePromise(this.router.navigate(['/dashboard/products', id]));
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
