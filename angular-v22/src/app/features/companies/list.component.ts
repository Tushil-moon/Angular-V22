/**
 * Companies List Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { Company, FilterOptions } from '@models/index';
import { AuthService, CompanyService, DialogService, PermissionService } from '@services/index';
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

const EMPTY_PAGE: CompaniesPageResult = { companies: [], total: 0 };

@Component({
    selector: 'app-companies-list',
    imports: [
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
    ],
    template: `
        <div class="page-shell page-shell-fill">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Companies</h1>
                    <p class="page-description">Manage B2B accounts and organizations</p>
                </div>
                @if (canManage()) {
                    <app-button size="sm" (clicked)="openCreateDialog()">
                        <app-icon name="plus" [size]="14" />
                        Add company
                    </app-button>
                }
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <app-card [fill]="true">
                <app-card-header [row]="true">
                    <div class="min-w-0 space-y-1">
                        <app-card-title>All companies</app-card-title>
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
                                        @if (company.website) {
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
        </div>
    `,
})
export class CompaniesListComponent {
    private readonly authService = inject(AuthService);
    private readonly companyService = inject(CompanyService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageCompanies),
    );

    readonly columns = COMPANY_TABLE_COLUMNS;
    readonly formatDate = formatCompanyDate;

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

    readonly companies = computed(() => this.companiesResource.value()?.companies ?? []);
    readonly totalCompanies = computed(() => this.companiesResource.value()?.total ?? 0);
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

    async openCreateDialog(): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./company-create-dialog.component').CompanyCreateDialogComponent,
            undefined,
            CompanyCreateDialogResult
        >(() =>
            import('./company-create-dialog.component').then((m) => m.CompanyCreateDialogComponent),
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'created') this.companiesResource.reload();
        });
    }

    async openDetailDialog(company: Company, event?: MouseEvent): Promise<void> {
        event?.stopPropagation();

        const ref = await this.dialogService.openLazy<
            import('./company-detail-dialog.component').CompanyDetailDialogComponent,
            CompanyDetailDialogData,
            CompanyDetailDialogResult
        >(
            () =>
                import('./company-detail-dialog.component').then(
                    (m) => m.CompanyDetailDialogComponent,
                ),
            { data: { companyId: company.id } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'deleted' || result === 'updated')
                this.companiesResource.reload();
        });
    }
}
