/**
 * Reusable enterprise CRUD list shell — Polaris-style Resource Index
 */

import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { catchResourceStreamError } from '@shared/utils/resource-error';
import { finalize, map, Observable, of } from 'rxjs';

import {
    BadgeComponent,
    type BadgeVariant,
} from './badge.component';
import { ButtonComponent } from './button.component';
import { type DetailSheetField, EnterpriseDetailSheetComponent } from './enterprise-detail-sheet.component';
import {
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
} from './flex-table.component';
import type { FlexTableBreakpoint, FlexTableColumn } from './flex-table.types';
import { IconComponent } from './icon.component';
import { PaginationComponent } from './pagination.component';
import { SearchInputComponent } from './search-input.component';
import { LIST_CARDS_VIEW_OPTIONS, ViewSwitcherComponent } from './view-switcher.component';
import type { WorkspaceKpi } from './workspace.types';

export interface EnterpriseListColumn<T> {
    key: string;
    label: string;
    cell: (item: T) => string;
    badge?: (item: T) => { text: string; variant: BadgeVariant };
    hideBelow?: FlexTableBreakpoint;
}

export interface EnterpriseListStatusTab {
    label: string;
    value: string;
    filterKey?: string;
}

export interface EnterpriseListConfig<T> {
    title: string;
    description: string;
    entityLabel: string;
    columns: EnterpriseListColumn<T>[];
    managePermission?: string;
    /** When true, hide Create even if user has manage permission (read-heavy modules). */
    hideCreate?: boolean;
    /** When true, hide row delete actions. */
    hideDelete?: boolean;
    statusTabs?: EnterpriseListStatusTab[];
    detailFields?: (item: T) => DetailSheetField[];
    detailStatus?: (item: T) => { text: string; variant: BadgeVariant };
    cardTitle?: (item: T) => string;
    cardSubtitle?: (item: T) => string;
    /** Extra lines rendered on cards under the subtitle. */
    cardMeta?: (item: T) => string[];
}

interface PageResult<T> {
    items: T[];
    total: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-enterprise-list-shell',
    imports: [
        SearchInputComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
        PaginationComponent,
        EnterpriseDetailSheetComponent,
        ViewSwitcherComponent,
    ],
    template: `
        <div
            [class]="
                embedded()
                    ? 'enterprise-list-shell-embedded'
                    : 'index-page page-shell-fill enterprise-list-shell'
            "
        >
            @if (!embedded()) {
                <div class="index-header">
                    <div class="index-header-copy">
                        <h1 class="index-title">{{ config().title }}</h1>
                        @if (config().description) {
                            <p class="index-subtitle">{{ config().description }}</p>
                        }
                    </div>
                </div>
            }

            @if (kpis().length > 0) {
                <div class="index-metrics shrink-0">
                    @for (kpi of kpis(); track kpi.label) {
                        <div class="index-metric">
                            <div class="index-metric-top">
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2">
                                        <div class="index-metric-icon">
                                            <app-icon [name]="kpi.icon" [size]="18" />
                                        </div>
                                        <p class="index-metric-label">{{ kpi.label }}</p>
                                    </div>
                                    <p class="index-metric-value">{{ kpi.value }}</p>
                                    @if (kpi.detail) {
                                        <p class="om-kpi-meta">{{ kpi.detail }}</p>
                                    }
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <section class="index-card">
                <div class="om-list-header">
                    <div>
                        <h2 class="om-list-title">{{ listTitle() }}</h2>
                        <p class="index-subtitle">{{ total() }} matching this view</p>
                    </div>
                    <div class="index-actions">
                        <ng-content select="[listActions]" />
                        @if (enableCardView() && !embedded()) {
                            <app-view-switcher
                                ariaLabel="List view mode"
                                [options]="listCardsViewOptions"
                                [value]="viewMode()"
                                (valueChange)="viewMode.set($event)"
                            />
                        }
                        @if (!embedded() && canManage() && !config().hideCreate) {
                            <app-button size="sm" [disabled]="creating()" (clicked)="onCreate()">
                                <app-icon name="plus" [size]="14" />
                                Add {{ config().entityLabel }}
                            </app-button>
                        }
                        @if (embedded() && enableCardView()) {
                            <app-view-switcher
                                ariaLabel="List view mode"
                                [options]="listCardsViewOptions"
                                [value]="viewMode()"
                                (valueChange)="viewMode.set($event)"
                            />
                        }
                        @if (embedded() && canManage() && !config().hideCreate) {
                            <app-button size="sm" [disabled]="creating()" (clicked)="onCreate()">
                                <app-icon name="plus" [size]="14" />
                                Add {{ config().entityLabel }}
                            </app-button>
                        }
                    </div>
                </div>

                @if (statusTabs().length > 0) {
                    <div class="index-tabs" role="tablist">
                        @for (tab of statusTabs(); track tab.value) {
                            <button
                                type="button"
                                role="tab"
                                class="index-tab"
                                [class.index-tab-active]="activeStatus() === tab.value"
                                [attr.aria-selected]="activeStatus() === tab.value"
                                (click)="setStatusTab(tab.value)"
                            >
                                {{ tab.label }}
                            </button>
                        }
                    </div>
                }

                <div class="index-filters">
                    <div class="index-filters-leading">
                        <app-search-input
                            placeholder="Search {{ config().entityLabel }}s..."
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                        <span class="index-count">{{ total() }} {{ config().entityLabel }}s</span>
                    </div>
                </div>

                <div class="index-body">
                    @if (viewMode() === 'cards' && enableCardView()) {
                        @if (isLoading()) {
                            <div class="enterprise-card-grid p-4">
                                @for (_ of skeletonItems; track $index) {
                                    <div class="enterprise-card enterprise-card-skeleton"></div>
                                }
                            </div>
                        } @else if (items().length === 0) {
                            <div class="index-empty">
                                <p class="index-empty-title">No {{ config().entityLabel }}s found</p>
                                <p class="index-empty-desc">Create one or adjust your search.</p>
                            </div>
                        } @else {
                            <div class="enterprise-card-grid p-4">
                                @for (item of items(); track itemTrackBy()(item)) {
                                    <button
                                        type="button"
                                        class="enterprise-card"
                                        (click)="openDetail(item)"
                                    >
                                        <div class="enterprise-card-top">
                                            <p class="enterprise-card-title">
                                                {{ config().cardTitle?.(item) ?? primaryCell(item) }}
                                            </p>
                                            @if (statusBadge(item); as badge) {
                                                <app-badge [variant]="badge.variant">{{ badge.text }}</app-badge>
                                            }
                                        </div>
                                        @if (config().cardSubtitle) {
                                            <p class="enterprise-card-subtitle">
                                                {{ config().cardSubtitle!(item) }}
                                            </p>
                                        }
                                        @if (cardMetaLines(item).length > 0) {
                                            <div class="enterprise-card-meta">
                                                @for (line of cardMetaLines(item); track line) {
                                                    <span>{{ line }}</span>
                                                }
                                            </div>
                                        }
                                    </button>
                                }
                            </div>
                        }
                    } @else {
                        <app-flex-table
                            [columns]="tableColumns()"
                            [fill]="true"
                            [loading]="isLoading()"
                            [empty]="!isLoading() && items().length === 0"
                            [emptyTitle]="'No ' + config().entityLabel + 's found'"
                            emptyDescription="Create one or adjust your search."
                            [flush]="true"
                            [skeletonRowCount]="8"
                        >
                            @for (item of items(); track itemTrackBy()(item)) {
                                <app-flex-table-row
                                    class="home-table-row"
                                    (click)="openDetail(item)"
                                >
                                    @for (col of config().columns; track col.key) {
                                        <app-flex-table-cell [column]="col.key">
                                            @if (col.badge) {
                                                @let badge = col.badge(item);
                                                <app-badge [variant]="badge.variant">{{ badge.text }}</app-badge>
                                            } @else {
                                                <span
                                                    [class]="
                                                        col.key === config().columns[0]?.key
                                                            ? 'index-cell-primary truncate'
                                                            : 'truncate text-muted-foreground'
                                                    "
                                                >
                                                    {{ col.cell(item) }}
                                                </span>
                                            }
                                        </app-flex-table-cell>
                                    }
                                    @if (canDelete()) {
                                        <app-flex-table-cell column="actions">
                                            <app-button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                [disabled]="deletingId() === itemTrackBy()(item)"
                                                (clicked)="onDelete(item, $event)"
                                            >
                                                <span class="sr-only">Delete</span>
                                                <app-icon name="trash-2" [size]="16" />
                                            </app-button>
                                        </app-flex-table-cell>
                                    }
                                </app-flex-table-row>
                            }
                        </app-flex-table>
                    }
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

        <app-enterprise-detail-sheet
            [open]="detailOpen()"
            [eyebrow]="config().entityLabel"
            [title]="detailTitle()"
            [subtitle]="detailSubtitle()"
            [status]="detailStatusText()"
            [statusVariant]="detailStatusVariant()"
            [fields]="detailFields()"
            (closed)="closeDetail()"
        >
            @if (canDelete() && selectedItem()) {
                <div detailActions>
                    <app-button
                        variant="destructive"
                        size="sm"
                        type="button"
                        [disabled]="deletingId() === itemTrackBy()(selectedItem()!)"
                        (clicked)="deleteSelected()"
                    >
                        Delete
                    </app-button>
                </div>
            }
        </app-enterprise-detail-sheet>
    `,
    styles: `
        .enterprise-list-shell {
            @apply min-w-0;
        }

        .enterprise-card-grid {
            @apply grid gap-3 sm:grid-cols-2 xl:grid-cols-3;
        }

        .enterprise-card {
            @apply rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40;
        }

        .enterprise-card-skeleton {
            @apply h-24 animate-pulse bg-muted;
        }

        .enterprise-card-top {
            @apply flex items-start justify-between gap-2;
        }

        .enterprise-card-title {
            @apply text-sm font-medium text-foreground;
        }

        .enterprise-card-subtitle {
            @apply mt-1 text-xs text-muted-foreground;
        }

        .enterprise-card-meta {
            @apply mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground;
        }

        .enterprise-list-shell-embedded {
            @apply flex min-h-0 flex-1 flex-col;
        }
    `,
})
export class EnterpriseListShellComponent<T extends { id: string }> {
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);

    config = input.required<EnterpriseListConfig<T>>();
    listFn = input.required<(filters: FilterOptions) => Observable<PaginatedResponse<T>>>();
    createFn = input.required<() => Observable<T | null>>();
    deleteFn = input.required<(id: string) => Observable<void>>();
    openDetailFn = input<((item: T) => Observable<void>) | null>(null);
    itemTrackBy = input<(item: T) => string>((item) => item.id);
    kpis = input<WorkspaceKpi[]>([]);
    listTitle = input('All records');
    defaultView = input<'list' | 'cards'>('list');
    enableCardView = input(false);
    embedded = input(false);

    searchQuery = signal('');
    currentPage = signal(1);
    pageSize = signal(20);
    creating = signal(false);
    deletingId = signal<string | null>(null);
    activeStatus = signal('ALL');
    viewMode = signal<'list' | 'cards'>('list');
    detailOpen = signal(false);
    selectedItem = signal<T | null>(null);

    readonly skeletonItems = Array.from({ length: 6 }, (_, i) => i);
    readonly listCardsViewOptions = LIST_CARDS_VIEW_OPTIONS;

    readonly canManage = computed(() => {
        const permission = this.config().managePermission ?? Permissions.ManageProducts;
        return this.permissionService.hasPermission(permission);
    });

    readonly canDelete = computed(() => this.canManage() && !this.config().hideDelete);

    readonly statusTabs = computed(() => this.config().statusTabs ?? []);

    readonly tableColumns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = this.config().columns.map((c, index) => ({
            key: c.key,
            label: c.label,
            grid: index === 0 ? 'minmax(10rem, 1.4fr)' : 'minmax(6rem, 1fr)',
            hideBelow: c.hideBelow,
            primary: index === 0,
        }));
        if (this.canDelete()) {
            cols.push({
                key: 'actions',
                label: 'Actions',
                grid: '3rem',
                headerSrOnly: true,
            });
        }
        return cols;
    });

    readonly pageResource = rxResource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            const tab = this.statusTabs().find((t) => t.value === this.activeStatus());
            return {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                search: this.searchQuery().trim() || undefined,
                status: tab && tab.value !== 'ALL' ? tab.value : undefined,
                filterKey: tab?.filterKey,
            };
        },
        stream: ({ params, abortSignal }) => {
            if (!params) {
                return of({ items: [], total: 0 } satisfies PageResult<T>);
            }

            throwIfAborted(abortSignal);
            const filters: FilterOptions = {
                page: params.page,
                pageSize: params.pageSize,
                search: params.search,
            };
            if (params.status && params.filterKey) {
                (filters as Record<string, string>)[params.filterKey] = params.status;
            } else if (params.status) {
                filters['status'] = params.status;
            }

            return this.listFn()(filters).pipe(
                map((result) => ({ items: result.data, total: result.total } satisfies PageResult<T>)),
                catchResourceStreamError<PageResult<T>>({
                    fallback: { items: [], total: 0 },
                    logMessage: 'Failed to load list:',
                }),
            );
        },
    });

    readonly items = computed(() => this.pageResource.value()?.items ?? []);
    readonly total = computed(() => this.pageResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.pageResource.isLoading());
    readonly loadError = computed(() => this.pageResource.error()?.message ?? null);

    readonly detailTitle = computed(() => {
        const item = this.selectedItem();
        if (!item) return '';
        const cfg = this.config();
        return cfg.cardTitle?.(item) ?? cfg.columns[0]?.cell(item) ?? '';
    });

    readonly detailSubtitle = computed(() => {
        const item = this.selectedItem();
        if (!item || !this.config().cardSubtitle) return '';
        return this.config().cardSubtitle!(item);
    });

    readonly detailStatusText = computed(() => {
        const item = this.selectedItem();
        const detailStatus = this.config().detailStatus;
        if (!item || !detailStatus) return '';
        return detailStatus(item).text;
    });

    readonly detailStatusVariant = computed(() => {
        const item = this.selectedItem();
        const detailStatus = this.config().detailStatus;
        if (!item || !detailStatus) return 'outline' as BadgeVariant;
        return detailStatus(item).variant;
    });

    readonly detailFields = computed((): DetailSheetField[] => {
        const item = this.selectedItem();
        const detailFields = this.config().detailFields;
        if (!item || !detailFields) return [];
        return detailFields(item);
    });

    private readonly initViewMode = afterNextRender(() => {
        this.viewMode.set(this.defaultView());
    });

    primaryCell(item: T): string {
        return this.config().columns[0]?.cell(item) ?? '';
    }

    cardMetaLines(item: T): string[] {
        const custom = this.config().cardMeta?.(item);
        if (custom?.length) return custom;
        return this.config()
            .columns.slice(1, 4)
            .map((col) => col.cell(item))
            .filter((value) => Boolean(value && value !== '—'));
    }

    statusBadge(item: T): { text: string; variant: BadgeVariant } | null {
        const statusCol = this.config().columns.find((c) => c.key === 'status' && c.badge);
        return statusCol?.badge?.(item) ?? null;
    }

    setStatusTab(value: string): void {
        this.activeStatus.set(value);
        this.currentPage.set(1);
    }

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
    }

    openDetail(item: T): void {
        const custom = this.openDetailFn();
        if (custom) {
            custom(item)
                .pipe(finalize(() => this.pageResource.reload()))
                .subscribe();
            return;
        }
        this.selectedItem.set(item);
        this.detailOpen.set(true);
    }

    reload(): void {
        this.pageResource.reload();
    }

    closeDetail(): void {
        this.detailOpen.set(false);
        this.selectedItem.set(null);
    }

    onCreate(): void {
        this.creating.set(true);
        this.createFn()()
            .pipe(finalize(() => this.creating.set(false)))
            .subscribe({
                next: (created) => {
                    if (created) {
                        this.pageResource.reload();
                        this.toastService.success('Created', `${this.config().entityLabel} created.`);
                    }
                },
                error: () => {
                    this.toastService.show({
                        title: 'Create failed',
                        description: `Could not create ${this.config().entityLabel}.`,
                        variant: 'destructive',
                    });
                },
            });
    }

    onDelete(item: T, event: MouseEvent): void {
        event.stopPropagation();
        const id = this.itemTrackBy()(item);
        this.deletingId.set(id);
        this.deleteFn()(id)
            .pipe(finalize(() => this.deletingId.set(null)))
            .subscribe({
                next: () => {
                    if (this.selectedItem()?.id === id) this.closeDetail();
                    this.pageResource.reload();
                    this.toastService.success('Deleted', `${this.config().entityLabel} removed.`);
                },
                error: () => {
                    this.toastService.show({
                        title: 'Delete failed',
                        description: `Could not delete ${this.config().entityLabel}.`,
                        variant: 'destructive',
                    });
                },
            });
    }

    deleteSelected(): void {
        const item = this.selectedItem();
        if (!item) return;
        this.onDelete(item, new MouseEvent('click'));
    }
}
