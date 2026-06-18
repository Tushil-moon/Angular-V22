/**
 * Deal Detail Dialog
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
    Activity,
    ACTIVITY_TYPE_LABELS,
    ActivityType,
    Deal,
    DEAL_STAGE_LABELS,
    DealStage,
} from '@models/index';
import { ActivityService, DealService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
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
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import { ignorePromise } from '@utils/form-display.util';
import { createActivitySchema, safeValidate, updateDealSchema } from '@utils/validators';

export interface DealDetailDialogData {
    dealId: string;
}

export type DealDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'delete' | 'activity';

const STAGE_OPTIONS = Object.entries(DEAL_STAGE_LABELS) as [DealStage, string][];
const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][];

@Component({
    selector: 'app-deal-detail-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
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
                        <app-input
                            id="edit-close-date"
                            type="date"
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
                                <dt class="text-xs font-medium text-muted-foreground">Owner</dt>
                                <dd class="text-sm text-foreground">
                                    {{ item.owner?.email || '—' }}
                                </dd>
                            </div>
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

            <div dialogFooter>
                @if (mode() === 'view' && deal()) {
                    <app-button variant="outline" type="button" (clicked)="mode.set('delete')"
                        >Delete</app-button
                    >
                    <app-button variant="outline" type="button" (clicked)="enterEditMode()"
                        >Edit</app-button
                    >
                    <app-button type="button" (clicked)="close()">Close</app-button>
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

    mode = signal<DialogMode>('view');
    deal = signal<Deal | null>(null);
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
    });

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
            if (deal) ignorePromise(this.loadActivities(deal.id));
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
                this.activityForm.reset({ type: 'NOTE', subject: '', body: '' });
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
