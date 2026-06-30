/**
 * Deals Kanban Board
 */

import {
    CdkDrag,
    CdkDragDrop,
    CdkDropList,
    CdkDropListGroup,
    moveItemInArray,
    transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, computed, inject, resource, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Deal, DealBoardColumn, DealStage } from '@models/index';
import { AuthService, DealService, DialogService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    SkeletonComponent,
} from '@shared/components';
import {
    dealStageBadgeVariant,
    formatDealStage,
    formatDealValue,
    OPEN_DEAL_STAGES,
} from '@shared/config/deals-table.config';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';

@Component({
    selector: 'app-deals-board',
    imports: [
        RouterLink,
        CdkDropListGroup,
        CdkDropList,
        CdkDrag,
        ButtonComponent,
        IconComponent,
        SkeletonComponent,
        BadgeComponent,
    ],
    template: `
        <div class="page-shell page-shell-fill">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Deal board</h1>
                    <p class="page-description">Drag deals between pipeline stages</p>
                </div>
                <app-button
                    variant="outline"
                    size="sm"
                    routerLink="/dashboard/deals"
                >
                    <app-icon name="list" [size]="14" />
                    List view
                </app-button>
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            @if (isLoading()) {
                <div class="kanban-board">
                    @for (stage of stageOptions; track stage) {
                        <div class="kanban-column">
                            <div class="kanban-column-header">
                                <app-skeleton className="h-5 w-20 rounded-full" />
                                <app-skeleton className="h-4 w-6" />
                            </div>
                            <div class="kanban-column-body space-y-2">
                                @for (_ of skeletonCards; track $index) {
                                    <app-skeleton className="h-20 w-full rounded-md" />
                                }
                            </div>
                        </div>
                    }
                </div>
            } @else {
                <div class="kanban-board" cdkDropListGroup>
                    @for (column of columns(); track column.stage) {
                        <div class="kanban-column">
                            <div class="kanban-column-header">
                                <app-badge [variant]="stageBadgeVariant(column.stage)">{{
                                    formatStage(column.stage)
                                }}</app-badge>
                                <span class="text-xs text-muted-foreground">{{
                                    column.deals.length
                                }}</span>
                            </div>

                            <div
                                class="kanban-column-body"
                                cdkDropList
                                [cdkDropListData]="column.deals"
                                [id]="column.stage"
                                [cdkDropListConnectedTo]="connectedLists()"
                                (cdkDropListDropped)="onDrop($event, column.stage)"
                            >
                                @for (deal of column.deals; track deal.id) {
                                    <div
                                        class="kanban-card"
                                        cdkDrag
                                        role="button"
                                        tabindex="0"
                                        [cdkDragDisabled]="!canManage()"
                                        (click)="openDetailDialog(deal)"
                                        (keydown.enter)="openDetailDialog(deal)"
                                    >
                                        <p class="kanban-card-title">{{ deal.title }}</p>
                                        <p class="kanban-card-value">
                                            {{ formatValue(deal.value, deal.currency) }}
                                        </p>
                                        @if (deal.contact?.fullName) {
                                            <p class="kanban-card-meta">
                                                {{ deal.contact.fullName }}
                                            </p>
                                        }
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    `,
    styleUrl: './board.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class DealsBoardComponent {
    private readonly authService = inject(AuthService);
    private readonly dealService = inject(DealService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );
    readonly stageBadgeVariant = dealStageBadgeVariant;
    readonly formatStage = formatDealStage;
    readonly formatValue = formatDealValue;

    readonly stageOptions = OPEN_DEAL_STAGES;
    readonly skeletonCards = Array.from({ length: 3 }, (_, i) => i);

    columns = signal<DealBoardColumn[]>([]);

    readonly boardResource = resource({
        params: () => (this.authService.isAuthenticated() ? true : undefined),
        loader: async ({ abortSignal }) =>
            runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const board = await this.dealService.getBoard();
                    throwIfAborted(abortSignal);
                    this.columns.set(board);
                    return board;
                },
                { fallback: [], logMessage: 'Failed to fetch deal board:' },
            ),
    });

    readonly isLoading = computed(() => this.boardResource.isLoading());
    readonly loadError = computed(() => this.boardResource.error()?.message ?? null);

    connectedLists = computed(() => OPEN_DEAL_STAGES);

    async openDetailDialog(deal: Deal): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./deal-detail-dialog.component').DealDetailDialogComponent,
            import('./deal-detail-dialog.component').DealDetailDialogData,
            import('./deal-detail-dialog.component').DealDetailDialogResult
        >(() => import('./deal-detail-dialog.component').then((m) => m.DealDetailDialogComponent), {
            data: { dealId: deal.id },
        });

        ref.afterClosed().subscribe((result) => {
            if (result === 'deleted' || result === 'updated') this.boardResource.reload();
        });
    }

    async onDrop(event: CdkDragDrop<Deal[]>, targetStage: DealStage): Promise<void> {
        if (!this.canManage()) return;

        const deal = event.previousContainer.data[event.previousIndex];

        if (event.previousContainer === event.container) {
            if (event.previousIndex === event.currentIndex) return;
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
            return;
        }

        transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            event.currentIndex,
        );
        deal.stage = targetStage;

        try {
            const updated = await this.dealService.updateDeal(deal.id, { stage: targetStage });
            if (updated) {
                deal.stage = updated.stage;
                this.toastService.show({
                    title: 'Deal moved',
                    description: `${deal.title} → ${this.formatStage(targetStage)}`,
                });
            }
        } catch {
            this.boardResource.reload();
            this.toastService.show({
                title: 'Move failed',
                description: 'Could not update deal stage.',
                variant: 'destructive',
            });
        }
    }
}
