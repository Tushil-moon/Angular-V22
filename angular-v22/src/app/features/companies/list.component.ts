/**
 * Companies List Page
 */

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { Company, CompanyTreeNode, FilterOptions } from '@models/index';
import { AuthService, CompanyService, DialogService, PermissionService, ToastService } from '@services/index';
import {
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    IconComponent,
    PaginationComponent,
    SearchInputComponent,
    SkeletonComponent,
    TabsComponent,
    TabsContentComponent,
    TabsListComponent,
    TabsTriggerComponent,
} from '@shared/components';
import { SavedViewsPickerComponent } from '@shared/components/saved-views-picker.component';
import { COMPANY_TABLE_COLUMNS, formatCompanyDate } from '@shared/config/companies-table.config';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { asOptionalString } from '@utils/form-display.util';

import { CompanyCreateDialogResult } from './company-create-dialog.component';
import {
    CompanyDetailDialogData,
    CompanyDetailDialogResult,
} from './company-detail-dialog.component';

interface CompaniesPageResult {
    companies: Company[];
    total: number;
}

type CompaniesTab = 'list' | 'hierarchy';

const EMPTY_PAGE: CompaniesPageResult = { companies: [], total: 0 };

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-companies-list',
    imports: [
        NgTemplateOutlet,
        CardComponent,
        CardHeaderComponent,
        CardTitleComponent,
        CardDescriptionComponent,
        CardBodyComponent,
        ButtonComponent,
        IconComponent,
        SearchInputComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
        PaginationComponent,
        SavedViewsPickerComponent,
        TabsComponent,
        TabsListComponent,
        TabsTriggerComponent,
        TabsContentComponent,
        SkeletonComponent,
    ],
    template: `
        <div class="page-shell page-shell-fill">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Companies</h1>
                    <p class="page-description">Manage B2B accounts, subsidiaries, and ownership</p>
                </div>
                @if (canManage()) {
                    <div class="flex gap-2">
                        <app-button size="sm" variant="outline" (clicked)="exportCompanies()">
                            Export CSV
                        </app-button>
                        <app-button size="sm" variant="outline" (clicked)="openImportDialog()">
                            Import CSV
                        </app-button>
                        <app-button size="sm" (clicked)="openCreateDialog()">
                            <app-icon name="plus" [size]="14" />
                            Add company
                        </app-button>
                    </div>
                }
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <app-tabs [(value)]="activeTab">
                <app-tabs-list>
                    <app-tabs-trigger value="list">All companies</app-tabs-trigger>
                    <app-tabs-trigger value="hierarchy">Ownership tree</app-tabs-trigger>
                </app-tabs-list>

                <app-tabs-content value="list">
                    <app-card [fill]="true">
                        <app-card-header [row]="true">
                            <div class="min-w-0 space-y-1">
                                <app-card-title>Company directory</app-card-title>
                                <app-card-description
                                    >{{ totalCompanies() }} total companies</app-card-description
                                >
                            </div>
                            <div class="card-toolbar">
                                <app-saved-views-picker
                                    entityType="COMPANIES"
                                    [filters]="currentFilters()"
                                    (filtersChange)="applySavedFilters($event)"
                                />
                                <app-search-input
                                    placeholder="Search companies..."
                                    [initialValue]="searchQuery()"
                                    (searchChange)="onSearch($event)"
                                />
                            </div>
                        </app-card-header>

                        <app-card-body [flush]="true" [fill]="true">
                            <app-flex-table
                                [columns]="columns"
                                [fill]="true"
                                [loading]="isLoading()"
                                [empty]="!isLoading() && companies().length === 0"
                                emptyTitle="No companies found"
                                emptyDescription="Try adjusting your search or add a new company."
                                [flush]="true"
                                [skeletonRowCount]="5"
                            >
                                @for (company of companies(); track company.id) {
                                    <app-flex-table-row
                                        [interactive]="true"
                                        (click)="openDetailDialog(company)"
                                    >
                                        <app-flex-table-cell column="name">
                                            <div class="min-w-0">
                                                <p class="truncate font-medium text-foreground">
                                                    {{ company.name }}
                                                </p>
                                                @if (company.parentCompany) {
                                                    <p class="truncate text-xs text-muted-foreground">
                                                        Subsidiary of {{ company.parentCompany.name }}
                                                    </p>
                                                } @else if (company.website) {
                                                    <p class="truncate text-xs text-muted-foreground">
                                                        {{ company.website }}
                                                    </p>
                                                }
                                            </div>
                                        </app-flex-table-cell>
                                        <app-flex-table-cell column="domain">
                                            <span class="truncate text-muted-foreground">{{
                                                company.domain || '—'
                                            }}</span>
                                        </app-flex-table-cell>
                                        <app-flex-table-cell column="industry">
                                            <span class="truncate text-muted-foreground">{{
                                                company.industry || '—'
                                            }}</span>
                                        </app-flex-table-cell>
                                        <app-flex-table-cell column="contacts">
                                            <span class="tabular-nums text-muted-foreground">{{
                                                company.contactCount ?? 0
                                            }}</span>
                                        </app-flex-table-cell>
                                        <app-flex-table-cell column="owner">
                                            <span class="truncate text-muted-foreground">{{
                                                company.owner?.email || '—'
                                            }}</span>
                                        </app-flex-table-cell>
                                        <app-flex-table-cell column="actions">
                                            <app-button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                (clicked)="openDetailDialog(company, $event)"
                                            >
                                                <span class="sr-only">View company</span>
                                                <app-icon name="eye" [size]="16" />
                                            </app-button>
                                        </app-flex-table-cell>
                                    </app-flex-table-row>
                                }
                            </app-flex-table>
                            <app-pagination
                                [page]="currentPage()"
                                [pageSize]="pageSize()"
                                [total]="totalCompanies()"
                                (pageChange)="currentPage.set($event)"
                            />
                        </app-card-body>
                    </app-card>
                </app-tabs-content>

                <app-tabs-content value="hierarchy">
                    <app-card>
                        <app-card-header>
                            <app-card-title>Corporate hierarchy</app-card-title>
                            <app-card-description
                                >Parent companies and subsidiaries</app-card-description
                            >
                        </app-card-header>
                        <app-card-body>
                            @if (treeResource.isLoading()) {
                                <app-skeleton className="h-32 w-full rounded-lg" />
                            } @else if (companyTree().length === 0) {
                                <p class="text-sm text-muted-foreground">
                                    No companies yet. Create a parent company to get started.
                                </p>
                            } @else {
                                <ul class="org-unit-tree">
                                    @for (node of companyTree(); track node.id) {
                                        <li>
                                            <ng-container
                                                *ngTemplateOutlet="
                                                    companyNode;
                                                    context: { $implicit: node, depth: 0 }
                                                "
                                            />
                                        </li>
                                    }
                                </ul>
                            }
                        </app-card-body>
                    </app-card>
                </app-tabs-content>
            </app-tabs>
        </div>

        <ng-template #companyNode let-node let-depth="depth">
            <div class="org-unit-node" [style.padding-left.px]="depth * 16">
                <div class="flex items-center gap-2 py-1">
                    <span class="font-medium">{{ node.name }}</span>
                    @if (node.domain) {
                        <span class="text-xs text-muted-foreground">{{ node.domain }}</span>
                    }
                    @if (node.ownershipPercent !== null && node.ownershipPercent !== undefined) {
                        <span class="badge badge-outline">{{ node.ownershipPercent }}% owned</span>
                    }
                    <app-button size="sm" variant="ghost" (clicked)="openDetailById(node.id)"
                        >View</app-button
                    >
                </div>
                @if (node.children.length) {
                    <ul>
                        @for (child of node.children; track child.id) {
                            <li>
                                <ng-container
                                    *ngTemplateOutlet="
                                        companyNode;
                                        context: { $implicit: child, depth: depth + 1 }
                                    "
                                />
                            </li>
                        }
                    </ul>
                }
            </div>
        </ng-template>
    `,
})
export class CompaniesListComponent {
    private readonly authService = inject(AuthService);
    private readonly companyService = inject(CompanyService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageCompanies),
    );

    readonly columns = COMPANY_TABLE_COLUMNS;
    readonly formatDate = formatCompanyDate;

    activeTab = signal<CompaniesTab>('list');
    searchQuery = signal('');
    currentPage = signal(1);
    pageSize = signal(10);

    readonly companiesResource = resource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            return {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                search: this.searchQuery().trim() || undefined,
            };
        },
        loader: async ({ params, abortSignal }) => {
            if (!params) return EMPTY_PAGE;

            return runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const filters: FilterOptions = {
                        page: params.page,
                        pageSize: params.pageSize,
                        search: asOptionalString(params.search),
                    };
                    const result = await this.companyService.listCompanies(filters);
                    throwIfAborted(abortSignal);
                    return {
                        companies: result.data,
                        total: result.total,
                    } satisfies CompaniesPageResult;
                },
                { fallback: EMPTY_PAGE, logMessage: 'Failed to fetch companies:' },
            );
        },
    });

    readonly treeResource = resource({
        loader: async () =>
            runResourceLoader(() => this.companyService.getCompanyTree(), {
                fallback: [] as CompanyTreeNode[],
                logMessage: 'Failed to load company tree:',
            }),
    });

    readonly companies = computed(() => this.companiesResource.value()?.companies ?? []);
    readonly totalCompanies = computed(() => this.companiesResource.value()?.total ?? 0);
    readonly companyTree = computed(() => this.treeResource.value() ?? []);
    readonly isLoading = computed(() => this.companiesResource.isLoading());
    readonly loadError = computed(() => this.companiesResource.error()?.message ?? null);

    currentFilters = computed(() => ({
        search: this.searchQuery().trim() || undefined,
    }));

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
    }

    applySavedFilters(filters: import('@models/index').SavedViewFilters): void {
        this.searchQuery.set(filters.search ?? '');
        this.currentPage.set(1);
    }

    reloadAll(): void {
        this.companiesResource.reload();
        this.treeResource.reload();
    }

    async openImportDialog(): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./company-import-dialog.component').CompanyImportDialogComponent,
            undefined,
            import('./company-import-dialog.component').CompanyImportDialogResult
        >(() =>
            import('./company-import-dialog.component').then((m) => m.CompanyImportDialogComponent),
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'imported') this.reloadAll();
        });
    }

    async exportCompanies(): Promise<void> {
        try {
            const csv = await this.companyService.exportCompanies({
                search: this.searchQuery().trim() || undefined,
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'companies.csv';
            anchor.click();
            URL.revokeObjectURL(url);
            this.toastService.success('Export complete', 'Companies CSV downloaded.');
        } catch {
            this.toastService.error('Export failed', 'Could not export companies.');
        }
    }

    async openCreateDialog(): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./company-create-dialog.component').CompanyCreateDialogComponent,
            undefined,
            CompanyCreateDialogResult
        >(() =>
            import('./company-create-dialog.component').then((m) => m.CompanyCreateDialogComponent),
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'created') this.reloadAll();
        });
    }

    async openDetailById(companyId: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./company-detail-dialog.component').CompanyDetailDialogComponent,
            CompanyDetailDialogData,
            CompanyDetailDialogResult
        >(
            () =>
                import('./company-detail-dialog.component').then(
                    (m) => m.CompanyDetailDialogComponent,
                ),
            { data: { companyId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'deleted' || result === 'updated') this.reloadAll();
        });
    }

    async openDetailDialog(company: Company, event?: MouseEvent): Promise<void> {
        event?.stopPropagation();
        await this.openDetailById(company.id);
    }
}
