/**
 * Leads List Page — pipeline table with stage, score, and follow-up filters
 */

import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { FilterOptions, Lead, LEAD_STAGE_LABELS,LeadStage } from '@models/index';
import { AuthService, DialogService, LeadService, PermissionService, ToastService } from '@services/index';
import {
    BadgeComponent,
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    FilterSelectComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    IconComponent,
    PaginationComponent,
    SearchInputComponent,
} from '@shared/components';
import type { SelectOption } from '@shared/components/select.component';
import { TagBadgesComponent } from '@shared/components/tag-badges.component';
import {
    formatLeadDate,
    formatLeadRating,
    formatLeadStage,
    isFollowUpOverdue,
    LEAD_TABLE_COLUMNS,
    leadRatingBadgeVariant,
    leadStageBadgeClass,
} from '@shared/config/leads-table.config';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { asOptionalString } from '@utils/form-display.util';

import { LeadCreateDialogResult } from './lead-create-dialog.component';
import { LeadDetailDialogData, LeadDetailDialogResult } from './lead-detail-dialog.component';

interface LeadsPageResult {
    leads: Lead[];
    total: number;
}

const EMPTY_PAGE: LeadsPageResult = { leads: [], total: 0 };

const STAGE_FILTER_OPTIONS: SelectOption[] = [
    { value: '', label: 'All stages' },
    ...Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => ({ value, label })),
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-leads-list',
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
        TagBadgesComponent,
        BadgeComponent,
        FilterSelectComponent,
    ],
    template: `
        <div class="page-shell page-shell-fill">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Leads</h1>
                    <p class="page-description">Qualify, score, and convert inbound opportunities</p>
                </div>
                @if (canManage()) {
                    <div class="flex gap-2">
                        <app-button size="sm" variant="outline" (clicked)="exportLeads()">
                            Export CSV
                        </app-button>
                        <app-button size="sm" variant="outline" (clicked)="openImportDialog()">
                            Import CSV
                        </app-button>
                        <app-button size="sm" (clicked)="openCreateDialog()">
                            <app-icon name="plus" [size]="14" />
                            Add lead
                        </app-button>
                    </div>
                }
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <app-card [fill]="true">
                <app-card-header [row]="true">
                    <div class="min-w-0 space-y-1">
                        <app-card-title>Lead pipeline</app-card-title>
                        <app-card-description>{{ totalLeads() }} total leads</app-card-description>
                    </div>
                    <div class="card-toolbar flex-wrap">
                        <app-filter-select
                            [value]="stageFilter()"
                            [options]="stageFilterOptions"
                            placeholder="All stages"
                            ariaLabel="Filter by stage"
                            (valueChange)="onStageFilter($event)"
                        />
                        <label class="checkbox-label text-sm">
                            <input
                                type="checkbox"
                                class="checkbox"
                                [checked]="followUpDue()"
                                (change)="onFollowUpDue($any($event.target).checked)"
                            />
                            <span>Follow-up due</span>
                        </label>
                        <app-search-input
                            placeholder="Search leads..."
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
                        [empty]="!isLoading() && leads().length === 0"
                        emptyTitle="No leads found"
                        emptyDescription="Try adjusting filters or add a new lead."
                        [flush]="true"
                        [skeletonRowCount]="5"
                    >
                        @for (lead of leads(); track lead.id) {
                            <app-flex-table-row
                                [interactive]="true"
                                (click)="openDetailDialog(lead)"
                            >
                                <app-flex-table-cell column="name">
                                    <div class="min-w-0 space-y-1">
                                        <p class="truncate font-medium text-foreground">
                                            {{ lead.contact.fullName }}
                                        </p>
                                        @if (lead.contact.jobTitle) {
                                            <p class="truncate text-xs text-muted-foreground">
                                                {{ lead.contact.jobTitle }}
                                            </p>
                                        }
                                        @if (lead.contact.tags?.length) {
                                            <app-tag-badges [tags]="lead.contact.tags" />
                                        }
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="company">
                                    <span class="truncate text-muted-foreground">{{
                                        lead.contact.companyRef?.name || lead.contact.company || '—'
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="stage">
                                    <span [class]="stageBadgeClass(lead.stage)">{{
                                        formatStage(lead.stage)
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="score">
                                    <span class="tabular-nums text-muted-foreground">{{
                                        lead.score
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="rating">
                                    @if (lead.rating) {
                                        <app-badge [variant]="ratingBadgeVariant(lead.rating)">{{
                                            formatRating(lead.rating)
                                        }}</app-badge>
                                    } @else {
                                        <span class="text-muted-foreground">—</span>
                                    }
                                </app-flex-table-cell>
                                <app-flex-table-cell column="followUp">
                                    <span
                                        class="text-sm"
                                        [class.text-destructive]="isOverdue(lead.nextFollowUpAt) && isOpen(lead.stage)"
                                    >
                                        {{ formatDate(lead.nextFollowUpAt) }}
                                    </span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="actions">
                                    <app-button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        (clicked)="openDetailDialog(lead, $event)"
                                    >
                                        <span class="sr-only">View lead</span>
                                        <app-icon name="eye" [size]="16" />
                                    </app-button>
                                </app-flex-table-cell>
                            </app-flex-table-row>
                        }
                    </app-flex-table>
                    <app-pagination
                        [page]="currentPage()"
                        [pageSize]="pageSize()"
                        [total]="totalLeads()"
                        (pageChange)="currentPage.set($event)"
                    />
                </app-card-body>
            </app-card>
        </div>
    `,
})
export class LeadsListComponent {
    private readonly authService = inject(AuthService);
    private readonly leadService = inject(LeadService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageLeads),
    );

    readonly columns = LEAD_TABLE_COLUMNS;
    readonly stageFilterOptions = STAGE_FILTER_OPTIONS;
    readonly formatStage = formatLeadStage;
    readonly formatRating = formatLeadRating;
    readonly formatDate = formatLeadDate;
    readonly stageBadgeClass = leadStageBadgeClass;
    readonly ratingBadgeVariant = leadRatingBadgeVariant;
    readonly isOverdue = isFollowUpOverdue;

    searchQuery = signal('');
    stageFilter = signal('');
    followUpDue = signal(false);
    currentPage = signal(1);
    pageSize = signal(10);

    readonly leadsResource = resource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            return {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                search: this.searchQuery().trim() || undefined,
                stage: this.stageFilter() || undefined,
                followUpDue: this.followUpDue() || undefined,
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
                        stage: asOptionalString(params.stage),
                        followUpDue: params.followUpDue ? true : undefined,
                    };
                    const result = await this.leadService.listLeads(filters);
                    throwIfAborted(abortSignal);
                    return {
                        leads: result.data,
                        total: result.total,
                    } satisfies LeadsPageResult;
                },
                { fallback: EMPTY_PAGE, logMessage: 'Failed to fetch leads:' },
            );
        },
    });

    readonly leads = computed(() => this.leadsResource.value()?.leads ?? []);
    readonly totalLeads = computed(() => this.leadsResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.leadsResource.isLoading());
    readonly loadError = computed(() => this.leadsResource.error()?.message ?? null);

    isOpen(stage: LeadStage): boolean {
        return !['CONVERTED', 'LOST'].includes(stage);
    }

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
    }

    onStageFilter(value: string): void {
        this.stageFilter.set(value);
        this.currentPage.set(1);
    }

    onFollowUpDue(checked: boolean): void {
        this.followUpDue.set(checked);
        this.currentPage.set(1);
    }

    async openCreateDialog(): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./lead-create-dialog.component').LeadCreateDialogComponent,
            undefined,
            LeadCreateDialogResult
        >(() =>
            import('./lead-create-dialog.component').then((m) => m.LeadCreateDialogComponent),
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'created') this.leadsResource.reload();
        });
    }

    async openImportDialog(): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./lead-import-dialog.component').LeadImportDialogComponent,
            undefined,
            import('./lead-import-dialog.component').LeadImportDialogResult
        >(() =>
            import('./lead-import-dialog.component').then((m) => m.LeadImportDialogComponent),
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'imported') this.leadsResource.reload();
        });
    }

    async exportLeads(): Promise<void> {
        try {
            const csv = await this.leadService.exportLeads({
                search: this.searchQuery().trim() || undefined,
                stage: this.stageFilter() || undefined,
                followUpDue: this.followUpDue() || undefined,
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'leads.csv';
            anchor.click();
            URL.revokeObjectURL(url);
            this.toastService.success('Export complete', 'Leads CSV downloaded.');
        } catch {
            this.toastService.error('Export failed', 'Could not export leads.');
        }
    }

    async openDetailDialog(lead: Lead, event?: MouseEvent): Promise<void> {
        event?.stopPropagation();

        const ref = await this.dialogService.openLazy<
            import('./lead-detail-dialog.component').LeadDetailDialogComponent,
            LeadDetailDialogData,
            LeadDetailDialogResult
        >(
            () =>
                import('./lead-detail-dialog.component').then((m) => m.LeadDetailDialogComponent),
            { data: { leadId: lead.id } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'deleted' || result === 'updated') this.leadsResource.reload();
        });
    }
}
