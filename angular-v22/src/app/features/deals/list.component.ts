/**
 * Deals List Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { AuthService, DealService, DialogService } from '@services/index';
import {
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
} from '@shared/components';
import {
  DEAL_TABLE_COLUMNS,
  dealStageBadgeClass,
  formatDealDate,
  formatDealStage,
  formatDealValue,
} from '@shared/config/deals-table.config';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { Deal, DealStage, FilterOptions } from '@models/index';
import { DealCreateDialogResult } from './deal-create-dialog.component';
import { DealDetailDialogData, DealDetailDialogResult } from './deal-detail-dialog.component';

interface DealsPageResult {
  deals: Deal[];
  total: number;
}

const EMPTY_PAGE: DealsPageResult = { deals: [], total: 0 };

@Component({
  selector: 'app-deals-list',
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
  ],
  template: `
    <div class="page-shell">
      <div class="page-toolbar">
        <div class="page-header">
          <h1 class="page-title">Deals</h1>
          <p class="page-description">Track pipeline opportunities and revenue</p>
        </div>
        <app-button class="w-full sm:w-auto" size="sm" (clicked)="openCreateDialog()">
          <app-icon name="plus" [size]="14" />
          Create deal
        </app-button>
      </div>

      @if (loadError()) {
        <p class="text-sm text-destructive">{{ loadError() }}</p>
      }

      <app-card>
        <app-card-header [row]="true">
          <div class="min-w-0 space-y-1">
            <app-card-title>Pipeline</app-card-title>
            <app-card-description>{{ totalDeals() }} total deals</app-card-description>
          </div>
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select class="input w-full sm:w-40" [value]="stageFilter()" (change)="onStageFilter($event)">
              <option value="">All stages</option>
              @for (stage of stageOptions; track stage) {
                <option [value]="stage">{{ formatStage(stage) }}</option>
              }
            </select>
            <app-search-input
              class="w-full sm:max-w-xs"
              placeholder="Search deals..."
              [initialValue]="searchQuery()"
              (searchChange)="onSearch($event)"
            />
          </div>
        </app-card-header>

        <app-card-body [flush]="true">
          <app-flex-table
            [columns]="columns"
            [loading]="isLoading()"
            [empty]="!isLoading() && deals().length === 0"
            emptyTitle="No deals found"
            emptyDescription="Create a deal or adjust your filters."
            [flush]="true"
            [skeletonRowCount]="5"
          >
            @for (deal of deals(); track deal.id) {
              <app-flex-table-row [interactive]="true" (click)="openDetailDialog(deal)">
                <app-flex-table-cell column="title">
                  <span class="truncate font-medium text-foreground">{{ deal.title }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="contact">
                  <span class="truncate text-muted-foreground">{{ deal.contact?.fullName || '—' }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="value">
                  <span class="font-medium text-foreground">{{ formatValue(deal.value, deal.currency) }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="stage">
                  <span [class]="stageBadgeClass(deal.stage)">{{ formatStage(deal.stage) }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="closeDate">
                  <span class="truncate text-muted-foreground">{{ formatDate(deal.expectedCloseDate) }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="actions">
                  <app-button variant="ghost" size="sm" type="button" (clicked)="openDetailDialog(deal, $event)">
                    <app-icon name="eye" [size]="14" />
                    <span class="hidden sm:inline">View</span>
                  </app-button>
                </app-flex-table-cell>
              </app-flex-table-row>
            }
          </app-flex-table>
        </app-card-body>
      </app-card>
    </div>
  `,
})
export class DealsListComponent {
  private readonly authService = inject(AuthService);
  private readonly dealService = inject(DealService);
  private readonly dialogService = inject(DialogService);

  readonly columns = DEAL_TABLE_COLUMNS;
  readonly stageBadgeClass = dealStageBadgeClass;
  readonly formatStage = formatDealStage;
  readonly formatValue = formatDealValue;
  readonly formatDate = formatDealDate;
  readonly stageOptions: DealStage[] = [
    'LEAD',
    'QUALIFIED',
    'PROPOSAL',
    'NEGOTIATION',
    'WON',
    'LOST',
  ];

  searchQuery = signal('');
  stageFilter = signal('');
  currentPage = signal(1);
  pageSize = signal(10);

  readonly dealsResource = resource({
    params: () => {
      if (!this.authService.isAuthenticated()) return undefined;
      return {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        search: this.searchQuery().trim(),
        stage: this.stageFilter(),
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
            search: params.search || undefined,
            stage: params.stage || undefined,
          };
          const result = await this.dealService.listDeals(filters);
          throwIfAborted(abortSignal);
          return { deals: result.data, total: result.total } satisfies DealsPageResult;
        },
        { fallback: EMPTY_PAGE, logMessage: 'Failed to fetch deals:' },
      );
    },
  });

  readonly deals = computed(() => this.dealsResource.value()?.deals ?? []);
  readonly totalDeals = computed(() => this.dealsResource.value()?.total ?? 0);
  readonly isLoading = computed(() => this.dealsResource.isLoading());
  readonly loadError = computed(() => this.dealsResource.error()?.message ?? null);

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onStageFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.stageFilter.set(value);
    this.currentPage.set(1);
  }

  async openCreateDialog(): Promise<void> {
    const ref = await this.dialogService.openLazy<
      import('./deal-create-dialog.component').DealCreateDialogComponent,
      undefined,
      DealCreateDialogResult
    >(() => import('./deal-create-dialog.component').then((m) => m.DealCreateDialogComponent));

    ref.afterClosed().subscribe((result) => {
      if (result === 'created') void this.dealsResource.reload();
    });
  }

  async openDetailDialog(deal: Deal, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();

    const ref = await this.dialogService.openLazy<
      import('./deal-detail-dialog.component').DealDetailDialogComponent,
      DealDetailDialogData,
      DealDetailDialogResult
    >(
      () => import('./deal-detail-dialog.component').then((m) => m.DealDetailDialogComponent),
      { data: { dealId: deal.id } },
    );

    ref.afterClosed().subscribe((result) => {
      if (result === 'deleted' || result === 'updated') void this.dealsResource.reload();
    });
  }
}
