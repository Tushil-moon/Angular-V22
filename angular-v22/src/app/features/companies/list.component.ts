/**
 * Companies List Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { Company, FilterOptions } from '@models/index';
import { AuthService, CompanyService } from '@services/index';
import {
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    SearchInputComponent,
} from '@shared/components';
import { COMPANY_TABLE_COLUMNS, formatCompanyDate } from '@shared/config/companies-table.config';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { asOptionalString } from '@utils/form-display.util';

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
        SearchInputComponent,
        FlexTableComponent,
        FlexTableRowComponent,
        FlexTableCellComponent,
    ],
    template: `
        <div class="page-shell page-shell-fill">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Companies</h1>
                    <p class="page-description">Manage B2B accounts and organizations</p>
                </div>
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
                        emptyDescription="Try adjusting your search."
                        [flush]="true"
                        [skeletonRowCount]="5"
                    >
                        @for (company of companies(); track company.id) {
                            <app-flex-table-row>
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
                            </app-flex-table-row>
                        }
                    </app-flex-table>
                </app-card-body>
            </app-card>
        </div>
    `,
})
export class CompaniesListComponent {
    private readonly authService = inject(AuthService);
    private readonly companyService = inject(CompanyService);

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

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
    }
}
