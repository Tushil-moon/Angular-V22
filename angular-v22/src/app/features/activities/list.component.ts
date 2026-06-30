/**
 * Activities List Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { Activity, ActivityType, FilterOptions } from '@models/index';
import { ActivityService, AuthService, DialogService, PermissionService } from '@services/index';
import {
    BadgeComponent,
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    DateRangePickerComponent,
    FilterSelectComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    IconComponent,
    PaginationComponent,
    SearchInputComponent,
    SelectOption,
} from '@shared/components';
import { SavedViewsPickerComponent } from '@shared/components/saved-views-picker.component';
import {
    ACTIVITY_TABLE_COLUMNS,
    formatActivityDate,
    formatActivityType,
} from '@shared/config/activities-table.config';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { DateRangeValue, EMPTY_DATE_RANGE, isDateWithinRange } from '@utils/date.util';
import { asOptionalString } from '@utils/form-display.util';

import { ActivityCreateDialogResult } from './activity-create-dialog.component';
import {
    ActivityDetailDialogData,
    ActivityDetailDialogResult,
} from './activity-detail-dialog.component';

interface ActivitiesPageResult {
    activities: Activity[];
    total: number;
}

const EMPTY_PAGE: ActivitiesPageResult = { activities: [], total: 0 };

@Component({
    selector: 'app-activities-list',
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
        BadgeComponent,
        FilterSelectComponent,
        DateRangePickerComponent,
        SavedViewsPickerComponent,
        PaginationComponent,
    ],
    template: `
        <div class="page-shell page-shell-fill">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Activities</h1>
                    <p class="page-description">Calls, emails, meetings, tasks, and notes</p>
                </div>
                @if (canManage()) {
                    <app-button size="sm" (clicked)="openCreateDialog()">
                        <app-icon name="plus" [size]="14" />
                        Log activity
                    </app-button>
                }
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <app-card [fill]="true">
                <app-card-header [row]="true">
                    <div class="min-w-0 space-y-1">
                        <app-card-title>All activities</app-card-title>
                        <app-card-description
                            >{{ totalActivities() }} total activities</app-card-description
                        >
                    </div>
                    <div class="card-toolbar">
                        <app-saved-views-picker
                            entityType="ACTIVITIES"
                            [filters]="currentFilters()"
                            (filtersChange)="applySavedFilters($event)"
                        />
                        <app-filter-select
                            [value]="typeFilter()"
                            [options]="typeFilterOptions"
                            placeholder="All types"
                            ariaLabel="Filter by activity type"
                            (valueChange)="onTypeFilterValue($event)"
                        />
                        <app-date-range-picker
                            [compact]="true"
                            placeholder="Due date"
                            ariaLabel="Filter by due date"
                            (valueChange)="onDueDateRangeChange($event)"
                        />
                        <app-search-input
                            placeholder="Search activities..."
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
                        [empty]="!isLoading() && filteredActivities().length === 0"
                        emptyTitle="No activities found"
                        emptyDescription="Log activity from a contact or deal detail view."
                        [flush]="true"
                        [skeletonRowCount]="5"
                    >
                        @for (activity of filteredActivities(); track activity.id) {
                            <app-flex-table-row
                                [interactive]="true"
                                (click)="openDetailDialog(activity)"
                            >
                                <app-flex-table-cell column="subject">
                                    <div class="min-w-0">
                                        <p class="truncate font-medium text-foreground">
                                            {{ activity.subject }}
                                        </p>
                                        @if (activity.body) {
                                            <p class="truncate text-xs text-muted-foreground">
                                                {{ activity.body }}
                                            </p>
                                        }
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="type">
                                    <app-badge variant="secondary">{{
                                        formatType(activity.type)
                                    }}</app-badge>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="contact">
                                    <span class="truncate text-muted-foreground">{{
                                        activity.contact?.fullName || '—'
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="deal">
                                    <span class="truncate text-muted-foreground">{{
                                        activity.deal?.title || '—'
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="dueAt">
                                    <span class="truncate text-muted-foreground">{{
                                        formatDate(activity.dueAt)
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="createdAt">
                                    <span class="truncate text-muted-foreground">{{
                                        formatDate(activity.createdAt)
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="actions">
                                    <app-button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        (clicked)="openDetailDialog(activity, $event)"
                                    >
                                        <span class="sr-only">View activity</span>
                                        <app-icon name="eye" [size]="16" />
                                    </app-button>
                                </app-flex-table-cell>
                            </app-flex-table-row>
                        }
                    </app-flex-table>
                    <app-pagination
                        [page]="currentPage()"
                        [pageSize]="pageSize()"
                        [total]="totalActivities()"
                        (pageChange)="currentPage.set($event)"
                    />
                </app-card-body>
            </app-card>
        </div>
    `,
})
export class ActivitiesListComponent {
    private readonly authService = inject(AuthService);
    private readonly activityService = inject(ActivityService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    readonly columns = ACTIVITY_TABLE_COLUMNS;
    readonly formatDate = formatActivityDate;
    readonly formatType = formatActivityType;

    readonly typeOptions: [ActivityType, string][] = [
        ['NOTE', 'Note'],
        ['CALL', 'Call'],
        ['EMAIL', 'Email'],
        ['MEETING', 'Meeting'],
        ['TASK', 'Task'],
    ];

    readonly typeFilterOptions: SelectOption[] = [
        { value: '', label: 'All types' },
        ...this.typeOptions.map(([value, label]) => ({ value, label })),
    ];

    searchQuery = signal('');
    typeFilter = signal('');
    dueDateRange = signal<DateRangeValue>(EMPTY_DATE_RANGE);
    currentPage = signal(1);
    pageSize = signal(20);

    readonly activitiesResource = resource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            return {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                search: this.searchQuery().trim() || undefined,
                type: this.typeFilter() || undefined,
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
                        type: asOptionalString(params.type),
                    };
                    const result = await this.activityService.listActivities(filters);
                    throwIfAborted(abortSignal);
                    return {
                        activities: result.data,
                        total: result.total,
                    } satisfies ActivitiesPageResult;
                },
                { fallback: EMPTY_PAGE, logMessage: 'Failed to fetch activities:' },
            );
        },
    });

    readonly activities = computed(() => this.activitiesResource.value()?.activities ?? []);
    readonly filteredActivities = computed(() => {
        const range = this.dueDateRange();
        return this.activities().filter((activity) => isDateWithinRange(activity.dueAt, range));
    });
    readonly totalActivities = computed(() => this.activitiesResource.value()?.total ?? 0);
    readonly isLoading = computed(() => this.activitiesResource.isLoading());
    readonly loadError = computed(() => this.activitiesResource.error()?.message ?? null);

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
    }

    onTypeFilterValue(value: string): void {
        this.typeFilter.set(value);
        this.currentPage.set(1);
    }

    onDueDateRangeChange(range: DateRangeValue): void {
        this.dueDateRange.set(range);
    }

    currentFilters = computed(() => ({
        search: this.searchQuery().trim() || undefined,
        status: this.typeFilter() || undefined,
        closeDateFrom: this.dueDateRange().from || undefined,
        closeDateTo: this.dueDateRange().to || undefined,
    }));

    applySavedFilters(filters: import('@models/index').SavedViewFilters): void {
        this.searchQuery.set(filters.search ?? '');
        this.typeFilter.set(filters.status ?? '');
        this.dueDateRange.set({
            from: filters.closeDateFrom ?? '',
            to: filters.closeDateTo ?? '',
        });
        this.currentPage.set(1);
    }

    async openCreateDialog(): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./activity-create-dialog.component').ActivityCreateDialogComponent,
            undefined,
            ActivityCreateDialogResult
        >(() =>
            import('./activity-create-dialog.component').then(
                (m) => m.ActivityCreateDialogComponent,
            ),
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'created') this.activitiesResource.reload();
        });
    }

    async openDetailDialog(activity: Activity, event?: MouseEvent): Promise<void> {
        event?.stopPropagation();

        const ref = await this.dialogService.openLazy<
            import('./activity-detail-dialog.component').ActivityDetailDialogComponent,
            ActivityDetailDialogData,
            ActivityDetailDialogResult
        >(
            () =>
                import('./activity-detail-dialog.component').then(
                    (m) => m.ActivityDetailDialogComponent,
                ),
            { data: { activityId: activity.id } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'deleted' || result === 'updated')
                this.activitiesResource.reload();
        });
    }
}
