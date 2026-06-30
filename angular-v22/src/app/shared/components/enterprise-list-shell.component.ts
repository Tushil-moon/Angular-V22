/**
 * Reusable enterprise CRUD list shell — SaaS-style with KPIs, filters, detail sheet
 */

import { afterNextRender, Component, computed, inject, input, resource, signal } from '@angular/core';
import { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

import {
    BadgeComponent,
    type BadgeVariant,
} from './badge.component';
import { ButtonComponent } from './button.component';
import {
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
} from './card.component';
import { type DetailSheetField,EnterpriseDetailSheetComponent } from './enterprise-detail-sheet.component';
import {
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
} from './flex-table.component';
import type { FlexTableBreakpoint, FlexTableColumn } from './flex-table.types';
import { IconComponent } from './icon.component';
import { PaginationComponent } from './pagination.component';
import { SearchInputComponent } from './search-input.component';
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
    statusTabs?: EnterpriseListStatusTab[];
    detailFields?: (item: T) => DetailSheetField[];
    detailStatus?: (item: T) => { text: string; variant: BadgeVariant };
    cardTitle?: (item: T) => string;
    cardSubtitle?: (item: T) => string;
}

interface PageResult<T> {
    items: T[];
    total: number;
}

@Component({
    selector: 'app-enterprise-list-shell',
    imports: [
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        SearchInputComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
        PaginationComponent,
        EnterpriseDetailSheetComponent,
    ],
    template: `
        <div class="page-shell page-shell-fill enterprise-list-shell">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">{{ config().title }}</h1>
                    <p class="page-description">{{ config().description }}</p>
                </div>
                <div class="toolbar-actions">
                    @if (hasCardView()) {
                        <div class="view-toggle">
                            <app-button
                                size="sm"
                                [variant]="viewMode() === 'list' ? 'primary' : 'outline'"
                                type="button"
                                (clicked)="viewMode.set('list')"
                            >
                                <app-icon name="list" [size]="14" />
                                List
                            </app-button>
                            <app-button
                                size="sm"
                                [variant]="viewMode() === 'cards' ? 'primary' : 'outline'"
                                type="button"
                                (clicked)="viewMode.set('cards')"
                            >
                                <app-icon name="layout-dashboard" [size]="14" />
                                Cards
                            </app-button>
                        </div>
                    }
                    @if (canManage()) {
                        <app-button size="sm" [disabled]="creating()" (clicked)="onCreate()">
                            <app-icon name="plus" [size]="14" />
                            Create {{ config().entityLabel }}
                        </app-button>
                    }
                </div>
            </div>

            @if (kpis().length > 0) {
                <div class="enterprise-kpi-grid">
                    @for (kpi of kpis(); track kpi.label) {
                        <app-card>
                            <app-card-body contentClass="flex items-center gap-3 py-4">
                                <div class="enterprise-kpi-icon">
                                    <app-icon [name]="kpi.icon" [size]="16" />
                                </div>
                                <div>
                                    <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
                                    <p class="text-lg font-semibold">{{ kpi.value }}</p>
                                </div>
                            </app-card-body>
                        </app-card>
                    }
                </div>
            }

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <app-card [fill]="true">
                <app-card-header [row]="true">
                    <div class="min-w-0 space-y-2">
                        <app-card-title>{{ listTitle() }}</app-card-title>
                        <app-card-description>{{ total() }} total</app-card-description>
                        @if (statusTabs().length > 0) {
                            <div class="status-tabs">
                                @for (tab of statusTabs(); track tab.value) {
                                    <button
                                        type="button"
                                        class="status-tab"
                                        [class.status-tab-active]="activeStatus() === tab.value"
                                        (click)="setStatusTab(tab.value)"
                                    >
                                        {{ tab.label }}
                                    </button>
                                }
                            </div>
                        }
                    </div>
                    <app-search-input
                        placeholder="Search..."
                        [initialValue]="searchQuery()"
                        (searchChange)="onSearch($event)"
                    />
                </app-card-header>

                <app-card-body [flush]="true" [fill]="true">
                    @if (viewMode() === 'cards' && hasCardView()) {
                        @if (isLoading()) {
                            <div class="enterprise-card-grid p-6">
                                @for (_ of skeletonItems; track $index) {
                                    <div class="enterprise-card enterprise-card-skeleton"></div>
                                }
                            </div>
                        } @else if (items().length === 0) {
                            <div class="empty-state py-16">
                                <p class="empty-state-title">No {{ config().entityLabel }}s found</p>
                                <p class="empty-state-description">Create one or adjust your search.</p>
                            </div>
                        } @else {
                            <div class="enterprise-card-grid p-6">
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
                            [skeletonRowCount]="5"
                        >
                            @for (item of items(); track itemTrackBy()(item)) {
                                <app-flex-table-row
                                    class="enterprise-table-row"
                                    (click)="openDetail(item)"
                                >
                                    @for (col of config().columns; track col.key) {
                                        <app-flex-table-cell [column]="col.key">
                                            @if (col.badge) {
                                                @let badge = col.badge(item);
                                                <app-badge [variant]="badge.variant">{{ badge.text }}</app-badge>
                                            } @else {
                                                <span class="truncate text-foreground">{{ col.cell(item) }}</span>
                                            }
                                        </app-flex-table-cell>
                                    }
                                    @if (canManage()) {
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
                    <app-pagination
                        [page]="currentPage()"
                        [pageSize]="pageSize()"
                        [total]="total()"
                        (pageChange)="currentPage.set($event)"
                    />
                </app-card-body>
            </app-card>
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
            @if (canManage() && selectedItem()) {
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

        .view-toggle {
            @apply flex gap-1;
        }

        .enterprise-kpi-grid {
            @apply mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4;
        }

        .enterprise-kpi-icon {
            @apply flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary;
        }

        .status-tabs {
            @apply flex flex-wrap gap-1 pt-1;
        }

        .status-tab {
            @apply rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors
                hover:bg-muted hover:text-foreground;
        }

        .status-tab-active {
            @apply bg-muted text-foreground;
        }

        .enterprise-table-row {
            @apply cursor-pointer;
        }

        .enterprise-card-grid {
            @apply grid gap-4 sm:grid-cols-2 xl:grid-cols-3;
        }

        .enterprise-card {
            @apply rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all
                hover:border-primary/40 hover:shadow-md;
        }

        .enterprise-card-skeleton {
            @apply h-28 animate-pulse bg-muted;
        }

        .enterprise-card-top {
            @apply flex items-start justify-between gap-2;
        }

        .enterprise-card-title {
            @apply text-sm font-semibold text-foreground;
        }

        .enterprise-card-subtitle {
            @apply mt-2 text-xs text-muted-foreground;
        }
    `,
})
export class EnterpriseListShellComponent<T extends { id: string }> {
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);

    config = input.required<EnterpriseListConfig<T>>();
    listFn = input.required<(filters: FilterOptions) => Promise<PaginatedResponse<T>>>();
    createFn = input.required<() => Promise<T | null>>();
    deleteFn = input.required<(id: string) => Promise<void>>();
    itemTrackBy = input<(item: T) => string>((item) => item.id);
    kpis = input<WorkspaceKpi[]>([]);
    listTitle = input('All records');
    defaultView = input<'list' | 'cards'>('list');

    searchQuery = signal('');
    currentPage = signal(1);
    pageSize = signal(10);
    creating = signal(false);
    deletingId = signal<string | null>(null);
    activeStatus = signal('ALL');
    viewMode = signal<'list' | 'cards'>('list');
    detailOpen = signal(false);
    selectedItem = signal<T | null>(null);

    readonly skeletonItems = Array.from({ length: 6 }, (_, i) => i);

    readonly canManage = computed(() => {
        const permission = this.config().managePermission ?? Permissions.ManageDeals;
        return this.permissionService.hasPermission(permission);
    });

    readonly statusTabs = computed(() => this.config().statusTabs ?? []);

    readonly hasCardView = computed(
        () => Boolean(this.config().cardTitle || this.config().cardSubtitle),
    );

    readonly tableColumns = computed((): FlexTableColumn[] => {
        const cols: FlexTableColumn[] = this.config().columns.map((c, index) => ({
            key: c.key,
            label: c.label,
            grid: 'minmax(6rem, 1fr)',
            hideBelow: c.hideBelow,
            primary: index === 0,
        }));
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

    readonly pageResource = resource({
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
        loader: async ({ params, abortSignal }) => {
            if (!params) return { items: [], total: 0 } satisfies PageResult<T>;

            return runResourceLoader(
                async () => {
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
                    const result = await this.listFn()(filters);
                    throwIfAborted(abortSignal);
                    return { items: result.data, total: result.total } satisfies PageResult<T>;
                },
                { fallback: { items: [], total: 0 }, logMessage: 'Failed to load list:' },
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

    constructor() {
        afterNextRender(() => {
            this.viewMode.set(this.defaultView());
        });
    }

    primaryCell(item: T): string {
        return this.config().columns[0]?.cell(item) ?? '';
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
        this.selectedItem.set(item);
        this.detailOpen.set(true);
    }

    closeDetail(): void {
        this.detailOpen.set(false);
        this.selectedItem.set(null);
    }

    async onCreate(): Promise<void> {
        this.creating.set(true);
        try {
            const created = await this.createFn()();
            if (created) {
                this.pageResource.reload();
                this.toastService.success('Created', `${this.config().entityLabel} created.`);
            }
        } catch {
            this.toastService.show({
                title: 'Create failed',
                description: `Could not create ${this.config().entityLabel}.`,
                variant: 'destructive',
            });
        } finally {
            this.creating.set(false);
        }
    }

    async onDelete(item: T, event: MouseEvent): Promise<void> {
        event.stopPropagation();
        const id = this.itemTrackBy()(item);
        this.deletingId.set(id);
        try {
            await this.deleteFn()(id);
            if (this.selectedItem()?.id === id) this.closeDetail();
            this.pageResource.reload();
            this.toastService.success('Deleted', `${this.config().entityLabel} removed.`);
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: `Could not delete ${this.config().entityLabel}.`,
                variant: 'destructive',
            });
        } finally {
            this.deletingId.set(null);
        }
    }

    async deleteSelected(): Promise<void> {
        const item = this.selectedItem();
        if (!item) return;
        await this.onDelete(item, new MouseEvent('click'));
    }
}
