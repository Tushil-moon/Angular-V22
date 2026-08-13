/**
 * Collections — polished admin list
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    apiErrorMessage,
    catalogStatusVariant,
    listTotalCount,
    titleCase,
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
    Collection,
    CollectionListFilters,
    CollectionStatus,
    CollectionType,
} from '../models/collection.model';
import { CollectionApiService } from '../services/collection-api.service';
import { openCollectionFormDialog } from '../utils/open-collection-form-dialog.util';

interface PageResult {
    items: Collection[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-collection-list',
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
                    <h1 class="index-title">Collections</h1>
                    <p class="index-subtitle">Curate merchandising groups shown across your storefront</p>
                </div>
                @if (canManage()) {
                    <div class="index-actions">
                        <app-button size="toolbar" variant="primary" (clicked)="createCollection()">
                            <app-icon name="plus-square" [size]="14" />
                            Add collection
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
                        <h2 class="om-list-title">Collection list</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <app-list-toolbar variant="row" class="om-list-header-filters">
                        <app-search-input
                            placeholder="Search collections"
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
                            emptyTitle="No collections found"
                            emptyDescription="Add a collection or adjust filters."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track item.id) {
                                <app-flex-table-row
                                    class="home-table-row"
                                    [interactive]="true"
                                    (click)="openCollection(item.id)"
                                >
                                    <app-flex-table-cell column="name">
                                        <div class="min-w-0">
                                            <p class="om-product-name">{{ item.name }}</p>
                                            <p class="index-cell-muted truncate text-xs">{{ item.slug }}</p>
                                        </div>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="type">
                                        <span class="index-cell-muted">{{ typeLabel(item.type) }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="products">
                                        <span class="index-cell-muted tabular-nums">{{
                                            item.productCount
                                        }}</span>
                                    </app-flex-table-cell>
                                    <app-flex-table-cell column="featured">
                                        @if (item.featured) {
                                            <app-badge variant="secondary">Featured</app-badge>
                                        } @else {
                                            <span class="index-cell-muted">—</span>
                                        }
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
                                                (clicked)="deleteCollection(item, $event)"
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
export class CollectionListComponent {
    private readonly api = inject(CollectionApiService);
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
        this.permissionService.hasPermission(Permissions.ManageCollections),
    );

    readonly columns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = [
            { key: 'name', label: 'Collection', grid: 'minmax(12rem, 2fr)', primary: true },
            { key: 'type', label: 'Type', grid: 'minmax(6rem, 0.7fr)', hideBelow: 'md' },
            { key: 'products', label: 'Products', grid: 'minmax(5rem, 0.6fr)', hideBelow: 'sm' },
            { key: 'featured', label: 'Featured', grid: 'minmax(5.5rem, 0.65fr)', hideBelow: 'lg' },
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
                listTotalCount((f) => this.api.list(f as CollectionListFilters), status);
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
                label: 'Total collections',
                value: String(s.total),
                detail: 'All groups',
                icon: 'layers' as const,
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
                status: (this.statusFilter() as CollectionStatus) || undefined,
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
                    logMessage: 'Failed to load collections:',
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

    typeLabel(type: CollectionType): string {
        return type === 'RULE_BASED' ? 'Rule-based' : titleCase(type);
    }

    statusVariant(status: CollectionStatus): BadgeVariant {
        return catalogStatusVariant(status);
    }

    createCollection(): void {
        openCollectionFormDialog(this.dialog).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    openCollection(id: string): void {
        openCollectionFormDialog(this.dialog, id).subscribe((result) => {
            if (result === 'saved') {
                this.pageResource.reload();
                this.summaryResource.reload();
            }
        });
    }

    deleteCollection(item: Collection, event: Event): void {
        event.stopPropagation();
        this.deletingId.set(item.id);
        this.api.delete(item.id).subscribe({
            next: () => {
                this.toast.success('Collection deleted');
                this.deletingId.set(null);
                this.pageResource.reload();
                this.summaryResource.reload();
            },
            error: (error: unknown) => {
                this.deletingId.set(null);
                this.toast.error(apiErrorMessage(error, 'Failed to delete collection.'));
            },
        });
    }
}
