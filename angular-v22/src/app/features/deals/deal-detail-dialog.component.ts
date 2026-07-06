/**
 * Deal Detail Dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
    Activity,
    ACTIVITY_TYPE_LABELS,
    ActivityType,
    Deal,
    DEAL_HISTORY_ACTION_LABELS,
    DEAL_STAGE_LABELS,
    DealHistoryEntry,
    DealStage,
} from '@models/index';
import { ActivityService, DealService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    DatePickerComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import {
    dealStageBadgeVariant,
    formatDealDate,
    formatDealStage,
    formatDealValue,
} from '@shared/config/deals-table.config';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import { ignorePromise } from '@utils/form-display.util';
import { createActivitySchema, safeValidate, updateDealSchema } from '@utils/validators';

export interface DealDetailDialogData {
    dealId: string;
}

export type DealDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'delete' | 'activity' | 'win' | 'lose';

const STAGE_OPTIONS = Object.entries(DEAL_STAGE_LABELS) as [DealStage, string][];
const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-deal-detail-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        DatePickerComponent,
        BadgeComponent,
        SelectComponent,
        TextareaComponent,
    ],
    template: `
        <app-dialog
            [title]="dialogTitle()"
            [description]="dialogDescription()"
            size="lg"
            [showFooter]="footerVisible()"
        >
            @if (mode() === 'delete') {
                <p class="text-sm text-muted-foreground">
                    Delete
                    <span class="font-medium text-foreground">{{ deal()?.title }}</span
                    >? This action cannot be undone.
                </p>
            } @else if (isLoading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else if (deal(); as item) {
                @if (mode() === 'edit') {
                    <form [formGroup]="editForm" class="space-y-4">
                        <app-input id="edit-title" label="Title" formControlName="title" />
                        <div class="grid gap-4 sm:grid-cols-2">
                            <app-input
                                id="edit-value"
                                type="number"
                                label="Value"
                                formControlName="value"
                            />
                            <app-input
                                id="edit-currency"
                                label="Currency"
                                formControlName="currency"
                            />
                        </div>
                        <app-select
                            id="edit-stage"
                            label="Stage"
                            formControlName="stage"
                            [options]="stageSelectOptions"
                        />
                        <app-date-picker
                            id="edit-close-date"
                            label="Expected close"
                            formControlName="expectedCloseDate"
                        />
                        <app-textarea
                            id="edit-description"
                            label="Description"
                            formControlName="description"
                        />
                    </form>
                } @else if (mode() === 'activity') {
                    <form [formGroup]="activityForm" class="space-y-4">
                        <app-select
                            id="deal-activity-type"
                            label="Type"
                            formControlName="type"
                            [options]="activitySelectOptions"
                        />
                        <app-input
                            id="deal-activity-subject"
                            label="Subject"
                            formControlName="subject"
                        />
                        <app-textarea
                            id="deal-activity-body"
                            label="Details"
                            formControlName="body"
                        />
                        <app-date-picker
                            id="deal-activity-due"
                            label="Due date"
                            formControlName="dueAt"
                        />
                    </form>
                } @else if (mode() === 'win') {
                    <form [formGroup]="winForm" class="space-y-4">
                        <app-textarea id="win-reason" label="Win reason" formControlName="winReason" />
                    </form>
                } @else if (mode() === 'lose') {
                    <form [formGroup]="loseForm" class="space-y-4">
                        <app-textarea
                            id="lose-reason"
                            label="Loss reason"
                            formControlName="lossReason"
                        />
                        <app-input
                            id="lose-competitor"
                            label="Competitor"
                            formControlName="competitor"
                        />
                    </form>
                } @else {
                    <div class="space-y-6">
                        <div class="dialog-detail-header">
                            <div>
                                <p class="text-lg font-semibold text-foreground">
                                    {{ item.title }}
                                </p>
                                <p class="text-sm text-muted-foreground">
                                    {{ item.contact?.fullName || 'No linked contact' }}
                                    @if (item.contact?.company) {
                                        · {{ item.contact.company }}
                                    }
                                </p>
                            </div>
                            <app-badge [variant]="stageBadgeVariant(item.stage)">{{
                                formatStage(item.stage)
                            }}</app-badge>
                        </div>

                        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">Value</dt>
                                <dd class="text-sm font-medium text-foreground">
                                    {{ formatValue(item.value, item.currency) }}
                                </dd>
                            </div>
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">
                                    Expected close
                                </dt>
                                <dd class="text-sm text-foreground">
                                    {{ formatDate(item.expectedCloseDate) }}
                                </dd>
                            </div>
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">Probability</dt>
                                <dd class="text-sm text-foreground">
                                    {{ item.probability }}% ·
                                    {{ formatValue(item.weightedValue, item.currency) }} weighted
                                </dd>
                            </div>
                            @if (item.company?.name) {
                                <div class="space-y-1">
                                    <dt class="text-xs font-medium text-muted-foreground">Company</dt>
                                    <dd class="text-sm text-foreground">{{ item.company.name }}</dd>
                                </div>
                            }
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">Updated</dt>
                                <dd class="text-sm text-foreground">
                                    {{ formatDate(item.updatedAt) }}
                                </dd>
                            </div>
                        </dl>

                        @if (item.description) {
                            <div class="space-y-1">
                                <p class="text-xs font-medium text-muted-foreground">Description</p>
                                <p class="text-sm text-foreground whitespace-pre-wrap">
                                    {{ item.description }}
                                </p>
                            </div>
                        }

                        @if (history().length) {
                            <div class="space-y-2">
                                <p class="text-sm font-medium text-foreground">History</p>
                                <ul class="space-y-2 max-h-40 overflow-y-auto">
                                    @for (entry of history(); track entry.id) {
                                        <li class="rounded-md border px-3 py-2 text-sm">
                                            <div class="flex items-center justify-between gap-2">
                                                <span class="font-medium">{{
                                                    historyLabel(entry.action)
                                                }}</span>
                                                <span class="text-xs text-muted-foreground">{{
                                                    formatDate(entry.createdAt)
                                                }}</span>
                                            </div>
                                        </li>
                                    }
                                </ul>
                            </div>
                        }

                        <div class="space-y-3">
                            <div class="dialog-section-toolbar">
                                <p class="text-sm font-medium text-foreground">Recent activity</p>
                                <app-button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    (clicked)="mode.set('activity')"
                                >
                                    Log activity
                                </app-button>
                            </div>
                            @if (activitiesLoading()) {
                                <div class="flex justify-center py-4"><app-loader size="sm" /></div>
                            } @else if (activities().length === 0) {
                                <p class="text-sm text-muted-foreground">No activity logged yet.</p>
                            } @else {
                                <div class="dialog-activity-list">
                                    @for (activity of activities(); track activity.id) {
                                        <div class="dialog-activity-item">
                                            <div class="flex items-center justify-between gap-2">
                                                <p class="text-sm font-medium text-foreground">
                                                    {{ activity.subject }}
                                                </p>
                                                <span class="text-xs text-muted-foreground">{{
                                                    formatActivityType(activity.type)
                                                }}</span>
                                            </div>
                                            @if (activity.body) {
                                                <p class="text-sm text-muted-foreground">
                                                    {{ activity.body }}
                                                </p>
                                            }
                                            <p class="text-xs text-muted-foreground">
                                                {{ formatDate(activity.createdAt) }}
                                            </p>
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                }
            } @else {
                <p class="text-sm text-muted-foreground">
                    Deal not found or you do not have access.
                </p>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (mode() === 'view' && deal()) {
                    <div class="flex flex-wrap gap-2 w-full justify-between">
                        <div class="flex flex-wrap gap-2">
                            @if (canManage() && isOpen(deal()!.stage)) {
                                <app-button size="sm" variant="outline" (clicked)="mode.set('win')">
                                    Mark won
                                </app-button>
                                <app-button size="sm" variant="outline" (clicked)="mode.set('lose')">
                                    Mark lost
                                </app-button>
                            }
                            @if (canManage() && !isOpen(deal()!.stage)) {
                                <app-button size="sm" variant="outline" (clicked)="reopenDeal()">
                                    Reopen
                                </app-button>
                            }
                            <app-button variant="outline" type="button" (clicked)="enterEditMode()">
                                Edit
                            </app-button>
                        </div>
                        <app-button variant="outline" type="button" (clicked)="mode.set('delete')">
                            Delete
                        </app-button>
                    </div>
                } @else if (mode() === 'win' || mode() === 'lose') {
                    <app-button variant="outline" type="button" (clicked)="mode.set('view')">
                        Cancel
                    </app-button>
                    <app-button type="button" [disabled]="isSubmitting()" (clicked)="submitOutcome()">
                        @if (isSubmitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save
                        }
                    </app-button>
                } @else if (mode() === 'edit') {
                    <app-button variant="outline" type="button" (clicked)="cancelEdit()"
                        >Cancel</app-button
                    >
                    <app-button type="button" [disabled]="isSubmitting()" (clicked)="saveEdit()">
                        @if (isSubmitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save changes
                        }
                    </app-button>
                } @else if (mode() === 'activity') {
                    <app-button variant="outline" type="button" (clicked)="mode.set('view')"
                        >Cancel</app-button
                    >
                    <app-button
                        type="button"
                        [disabled]="isSubmitting()"
                        (clicked)="saveActivity()"
                    >
                        @if (isSubmitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Log activity
                        }
                    </app-button>
                } @else if (mode() === 'delete') {
                    <app-button variant="outline" type="button" (clicked)="mode.set('view')"
                        >Cancel</app-button
                    >
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="isSubmitting()"
                        (clicked)="confirmDelete()"
                    >
                        @if (isSubmitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Delete deal
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class DealDetailDialogComponent implements OnInit {
    private readonly dealService = inject(DealService);
    private readonly activityService = inject(ActivityService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<DealDetailDialogComponent, DealDetailDialogResult>,
    );
    private readonly data = inject<DealDetailDialogData>(DIALOG_DATA);

    readonly stageOptions = STAGE_OPTIONS;
    readonly activityOptions = ACTIVITY_OPTIONS;
    readonly stageSelectOptions: SelectOption[] = STAGE_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));
    readonly activitySelectOptions: SelectOption[] = ACTIVITY_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));
    readonly stageBadgeVariant = dealStageBadgeVariant;
    readonly formatStage = formatDealStage;
    readonly formatValue = formatDealValue;
    readonly formatDate = formatDealDate;
    readonly formatActivityType = (type: ActivityType) => ACTIVITY_TYPE_LABELS[type];
    readonly historyLabel = (action: DealHistoryEntry['action']) =>
        DEAL_HISTORY_ACTION_LABELS[action] ?? action;

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    mode = signal<DialogMode>('view');
    deal = signal<Deal | null>(null);
    history = signal<DealHistoryEntry[]>([]);
    activities = signal<Activity[]>([]);
    isLoading = signal(true);
    activitiesLoading = signal(true);
    isSubmitting = signal(false);
    wasUpdated = signal(false);

    editForm = this.fb.group({
        title: [''],
        value: [0],
        currency: ['USD'],
        stage: ['LEAD'],
        expectedCloseDate: [''],
        description: [''],
    });

    activityForm = this.fb.group({
        type: ['NOTE'],
        subject: [''],
        body: [''],
        dueAt: [''],
    });

    winForm = this.fb.group({ winReason: [''] });
    loseForm = this.fb.group({ lossReason: [''], competitor: [''] });

    isOpen(stage: DealStage): boolean {
        return !['WON', 'LOST'].includes(stage);
    }

    dialogTitle = computed(() => {
        if (this.mode() === 'edit') return 'Edit deal';
        if (this.mode() === 'delete') return 'Delete deal';
        if (this.mode() === 'activity') return 'Log activity';
        return this.deal()?.title ?? 'Deal details';
    });

    dialogDescription = computed(() => {
        if (this.mode() === 'edit') return 'Update deal details and stage.';
        if (this.mode() === 'delete') return 'This action cannot be undone.';
        if (this.mode() === 'activity') return 'Record progress on this deal.';
        if (this.mode() === 'win') return 'Record why this deal was won.';
        if (this.mode() === 'lose') return 'Record why this deal was lost.';
        return 'Pipeline opportunity overview.';
    });

    footerVisible = computed(() => {
        if (this.isLoading()) return false;
        if (this.mode() === 'view' && !this.deal()) return false;
        return true;
    });

    ngOnInit(): void {
        ignorePromise(this.loadDeal());
    }

    close(): void {
        this.dialogRef.close(this.wasUpdated() ? 'updated' : undefined);
    }

    cancelEdit(): void {
        this.mode.set('view');
    }

    enterEditMode(): void {
        const item = this.deal();
        if (!item) return;
        this.editForm.patchValue({
            title: item.title,
            value: item.value,
            currency: item.currency,
            stage: item.stage,
            expectedCloseDate: item.expectedCloseDate
                ? item.expectedCloseDate.toISOString().slice(0, 10)
                : '',
            description: item.description ?? '',
        });
        this.mode.set('edit');
    }

    async loadDeal(): Promise<void> {
        this.isLoading.set(true);
        try {
            const deal = await this.dealService.getDealById(this.data.dealId);
            this.deal.set(deal);
            if (deal) {
                ignorePromise(this.loadActivities(deal.id));
                ignorePromise(this.loadHistory(deal.id));
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    async loadActivities(dealId: string): Promise<void> {
        this.activitiesLoading.set(true);
        try {
            const result = await this.activityService.listActivities({ dealId, pageSize: 5 });
            this.activities.set(result.data);
        } finally {
            this.activitiesLoading.set(false);
        }
    }

    async loadHistory(dealId: string): Promise<void> {
        this.history.set(await this.dealService.getDealHistory(dealId));
    }

    async submitOutcome(): Promise<void> {
        const item = this.deal();
        if (!item || this.isSubmitting()) return;

        this.isSubmitting.set(true);
        try {
            if (this.mode() === 'win') {
                const updated = await this.dealService.winDeal(
                    item.id,
                    this.winForm.controls.winReason.value || undefined,
                );
                if (updated) this.deal.set(updated);
            } else if (this.mode() === 'lose') {
                const reason = this.loseForm.controls.lossReason.value.trim();
                if (!reason) return;
                const updated = await this.dealService.loseDeal(
                    item.id,
                    reason,
                    this.loseForm.controls.competitor.value || undefined,
                );
                if (updated) this.deal.set(updated);
            }
            await this.loadHistory(item.id);
            this.wasUpdated.set(true);
            this.mode.set('view');
            this.toastService.success('Deal updated', 'Outcome saved.');
        } catch {
            this.toastService.error('Update failed', 'Could not update deal.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async reopenDeal(): Promise<void> {
        const item = this.deal();
        if (!item || this.isSubmitting()) return;

        this.isSubmitting.set(true);
        try {
            const updated = await this.dealService.reopenDeal(item.id, 'QUALIFIED');
            if (updated) {
                this.deal.set(updated);
                await this.loadHistory(item.id);
                this.wasUpdated.set(true);
                this.toastService.success('Deal reopened', item.title);
            }
        } catch {
            this.toastService.error('Reopen failed', 'Could not reopen deal.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async saveEdit(): Promise<void> {
        const item = this.deal();
        if (!item) return;

        const raw = this.editForm.getRawValue();
        const payload = {
            title: raw.title.trim(),
            value: raw.value,
            currency: raw.currency.trim(),
            stage: raw.stage,
            expectedCloseDate: raw.expectedCloseDate || undefined,
            description: raw.description.trim() || undefined,
        };

        const validation = safeValidate(updateDealSchema, payload);
        if (!validation.success) return;

        this.isSubmitting.set(true);
        try {
            const updated = await this.dealService.updateDeal(
                item.id,
                validation.data ?? undefined,
            );
            if (updated) {
                this.deal.set(updated);
                this.wasUpdated.set(true);
                this.toastService.show({ title: 'Deal updated', description: updated.title });
                this.mode.set('view');
            }
        } catch {
            this.toastService.show({ title: 'Update failed', variant: 'destructive' });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async saveActivity(): Promise<void> {
        const item = this.deal();
        if (!item) return;

        const raw = this.activityForm.getRawValue();
        const validation = safeValidate(createActivitySchema, {
            type: raw.type,
            subject: raw.subject.trim(),
            body: raw.body.trim() || undefined,
            dueAt: raw.dueAt || undefined,
        });
        if (!validation.success) return;

        this.isSubmitting.set(true);
        const activityData = validation.data;
        try {
            const activity = await this.activityService.createActivity({
                ...activityData,
                dealId: item.id,
                contactId: item.contactId ?? undefined,
            });
            if (activity) {
                this.activities.update((items) => [activity, ...items].slice(0, 5));
                this.activityForm.reset({ type: 'NOTE', subject: '', body: '', dueAt: '' });
                this.wasUpdated.set(true);
                this.toastService.show({ title: 'Activity logged', description: activity.subject });
                this.mode.set('view');
            }
        } catch {
            this.toastService.show({ title: 'Failed to log activity', variant: 'destructive' });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async confirmDelete(): Promise<void> {
        const item = this.deal();
        if (!item) return;

        this.isSubmitting.set(true);
        try {
            await this.dealService.deleteDeal(item.id);
            this.toastService.show({ title: 'Deal deleted', description: item.title });
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.show({ title: 'Delete failed', variant: 'destructive' });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
