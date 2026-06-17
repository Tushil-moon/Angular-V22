/**
 * Activities List Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { AuthService, ActivityService, PermissionService } from '@services/index';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardDescriptionComponent,
  CardBodyComponent,
  SearchInputComponent,
  FlexTableComponent,
  FlexTableRowComponent,
  FlexTableCellComponent,
  BadgeComponent,
  FilterSelectComponent,
  SelectOption,
} from '@shared/components';
import { SavedViewSelectComponent } from '@shared/components/saved-view-select.component';
import { Permissions } from '@shared/constants/permissions';
import {
  ACTIVITY_TABLE_COLUMNS,
  formatActivityDate,
  formatActivityType,
} from '@shared/config/activities-table.config';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { Activity, ActivityType, FilterOptions } from '@models/index';

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
    SearchInputComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    FlexTableCellComponent,
    BadgeComponent,
    FilterSelectComponent,
    SavedViewSelectComponent,
  ],
  template: `
    <div class="page-shell page-shell-fill">
      <div class="page-toolbar">
        <div class="page-header">
          <h1 class="page-title">Activities</h1>
          <p class="page-description">Calls, emails, meetings, tasks, and notes</p>
        </div>
      </div>

      @if (loadError()) {
        <p class="text-sm text-destructive">{{ loadError() }}</p>
      }

      <app-card [fill]="true">
        <app-card-header [row]="true">
          <div class="min-w-0 space-y-1">
            <app-card-title>All activities</app-card-title>
            <app-card-description>{{ totalActivities() }} total activities</app-card-description>
          </div>
          <div class="card-toolbar">
            <app-filter-select
              [value]="typeFilter()"
              [options]="typeFilterOptions"
              placeholder="All types"
              ariaLabel="Filter by activity type"
              (valueChange)="onTypeFilterValue($event)"
            />
            <app-saved-view-select
              entityType="ACTIVITIES"
              [currentFilters]="activeFilters()"
              [canSave]="canManage()"
              (viewSelected)="applySavedView($event)"
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
            [empty]="!isLoading() && activities().length === 0"
            emptyTitle="No activities found"
            emptyDescription="Log activity from a contact or deal detail view."
            [flush]="true"
            [skeletonRowCount]="5"
          >
            @for (activity of activities(); track activity.id) {
              <app-flex-table-row>
                <app-flex-table-cell column="subject">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-foreground">{{ activity.subject }}</p>
                    @if (activity.body) {
                      <p class="truncate text-xs text-muted-foreground">{{ activity.body }}</p>
                    }
                  </div>
                </app-flex-table-cell>
                <app-flex-table-cell column="type">
                  <app-badge variant="secondary">{{ formatType(activity.type) }}</app-badge>
                </app-flex-table-cell>
                <app-flex-table-cell column="contact">
                  <span class="truncate text-muted-foreground">{{ activity.contact?.fullName || '—' }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="deal">
                  <span class="truncate text-muted-foreground">{{ activity.deal?.title || '—' }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="dueAt">
                  <span class="truncate text-muted-foreground">{{ formatDate(activity.dueAt) }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="createdAt">
                  <span class="truncate text-muted-foreground">{{ formatDate(activity.createdAt) }}</span>
                </app-flex-table-cell>
              </app-flex-table-row>
            }
          </app-flex-table>
        </app-card-body>
      </app-card>
    </div>
  `,
})
export class ActivitiesListComponent {
  private readonly authService = inject(AuthService);
  private readonly activityService = inject(ActivityService);
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
  savedFilters = signal<Record<string, unknown>>({});
  currentPage = signal(1);
  pageSize = signal(20);

  readonly activeFilters = computed(() => ({
    search: this.searchQuery().trim() || undefined,
    type: this.typeFilter() || undefined,
    ...this.savedFilters(),
  }));

  readonly activitiesResource = resource({
    params: () => {
      if (!this.authService.isAuthenticated()) return undefined;
      return {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        ...this.activeFilters(),
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
            search: params.search as string | undefined,
            type: params.type as string | undefined,
          };
          const result = await this.activityService.listActivities(filters);
          throwIfAborted(abortSignal);
          return { activities: result.data, total: result.total } satisfies ActivitiesPageResult;
        },
        { fallback: EMPTY_PAGE, logMessage: 'Failed to fetch activities:' },
      );
    },
  });

  readonly activities = computed(() => this.activitiesResource.value()?.activities ?? []);
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

  applySavedView(filters: Record<string, unknown> | null): void {
    this.savedFilters.set(filters ?? {});
    if (filters?.['search']) this.searchQuery.set(String(filters['search']));
    if (filters?.['type']) this.typeFilter.set(String(filters['type']));
    this.currentPage.set(1);
  }
}
