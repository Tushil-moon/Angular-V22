/**
 * Activity Detail Dialog — view, edit, delete
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ACTIVITY_TYPE_LABELS, Activity, ActivityType } from '@models/index';
import { ActivityService, PermissionService } from '@services/index';
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
    formatActivityDate,
    formatActivityType,
} from '@shared/config/activities-table.config';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';
import { safeValidate, updateActivitySchema } from '@utils/validators';

export interface ActivityDetailDialogData {
    activityId: string;
}

export type ActivityDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'delete';

const TYPE_OPTIONS = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][];

@Component({
    selector: 'app-activity-detail-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        SelectComponent,
        TextareaComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="dialogTitle()"
            [description]="dialogDescription()"
            size="lg"
            [showFooter]="true"
        >
            @if (mode() === 'delete') {
                <p class="text-sm text-muted-foreground">
                    Delete activity
                    <span class="font-medium text-foreground">{{ activity()?.subject }}</span
                    >?
                </p>
            } @else if (isLoading()) {
                <div class="dialog-loading">
                    <app-loader />
                </div>
            } @else if (activity(); as item) {
                @if (mode() === 'edit') {
                    <form [formGroup]="editForm" class="space-y-4">
                        <app-select
                            id="edit-type"
                            label="Type"
                            formControlName="type"
                            [options]="typeSelectOptions"
                        />
                        <app-input
                            id="edit-subject"
                            label="Subject"
                            formControlName="subject"
                            [error]="fieldError('subject')"
                        />
                        <app-textarea id="edit-body" label="Details" formControlName="body" />
                        <app-input
                            id="edit-due"
                            type="date"
                            label="Due date"
                            formControlName="dueAt"
                        />
                    </form>
                } @else {
                    <div class="space-y-4">
                        <app-badge variant="secondary">{{ formatType(item.type) }}</app-badge>
                        @if (item.body) {
                            <p class="text-sm whitespace-pre-wrap text-muted-foreground">
                                {{ item.body }}
                            </p>
                        }
                        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">Contact</dt>
                                <dd class="text-sm">{{ item.contact?.fullName || '—' }}</dd>
                            </div>
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">Deal</dt>
                                <dd class="text-sm">{{ item.deal?.title || '—' }}</dd>
                            </div>
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">Due</dt>
                                <dd class="text-sm">{{ formatDate(item.dueAt) }}</dd>
                            </div>
                            <div class="space-y-1">
                                <dt class="text-xs font-medium text-muted-foreground">Logged</dt>
                                <dd class="text-sm">{{ formatDate(item.createdAt) }}</dd>
                            </div>
                        </dl>
                    </div>
                }
            }

            <div dialogFooter>
                @if (mode() === 'delete') {
                    <app-button variant="outline" type="button" (clicked)="setMode('view')"
                        >Cancel</app-button
                    >
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="isSubmitting()"
                        (clicked)="confirmDelete()"
                    >
                        Delete activity
                    </app-button>
                } @else if (mode() === 'edit') {
                    <app-button variant="outline" type="button" (clicked)="setMode('view')"
                        >Cancel</app-button
                    >
                    <app-button type="button" [disabled]="isSubmitting()" (clicked)="saveEdit()">
                        Save changes
                    </app-button>
                } @else if (canManage()) {
                    <app-button variant="outline" type="button" (clicked)="setMode('edit')"
                        >Edit</app-button
                    >
                    <app-button
                        variant="destructive"
                        type="button"
                        (clicked)="setMode('delete')"
                    >
                        Delete
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class ActivityDetailDialogComponent implements OnInit {
    private readonly activityService = inject(ActivityService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<ActivityDetailDialogComponent, ActivityDetailDialogResult>,
    );
    private readonly data = inject<ActivityDetailDialogData>(DIALOG_DATA);

    readonly formatDate = formatActivityDate;
    readonly formatType = formatActivityType;
    readonly typeSelectOptions: SelectOption[] = TYPE_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));

    activity = signal<Activity | null>(null);
    mode = signal<DialogMode>('view');
    isLoading = signal(true);
    isSubmitting = signal(false);
    fieldErrors = signal<Record<string, string[]>>({});

    editForm = this.fb.group({
        type: ['NOTE' as ActivityType],
        subject: [''],
        body: [''],
        dueAt: [''],
    });

    canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    dialogTitle = computed(() => {
        if (this.mode() === 'delete') return 'Delete activity';
        if (this.mode() === 'edit') return 'Edit activity';
        return this.activity()?.subject ?? 'Activity';
    });

    dialogDescription = computed(() => {
        if (this.mode() === 'delete') return 'This action cannot be undone.';
        if (this.mode() === 'edit') return 'Update activity details.';
        return 'Activity details';
    });

    ngOnInit(): void {
        void this.loadActivity();
    }

    async loadActivity(): Promise<void> {
        this.isLoading.set(true);
        try {
            const activity = await this.activityService.getActivityById(this.data.activityId);
            this.activity.set(activity);
            if (activity) this.patchEditForm(activity);
        } finally {
            this.isLoading.set(false);
        }
    }

    setMode(next: DialogMode): void {
        this.mode.set(next);
        if (next === 'edit' && this.activity()) {
            this.patchEditForm(this.activity()!);
        }
    }

    fieldError(field: string): string | null {
        return this.fieldErrors()[field]?.[0] ?? null;
    }

    async saveEdit(): Promise<void> {
        const activity = this.activity();
        if (!activity) return;

        const raw = this.editForm.getRawValue();
        const payload = {
            type: raw.type,
            subject: raw.subject.trim() || undefined,
            body: raw.body.trim() || undefined,
            dueAt: raw.dueAt || undefined,
        };

        const validation = safeValidate(updateActivitySchema, payload);
        if (!validation.success) {
            this.fieldErrors.set(validation.errors ?? {});
            return;
        }

        this.fieldErrors.set({});
        this.isSubmitting.set(true);
        try {
            const updated = await this.activityService.updateActivity(
                activity.id,
                validation.data,
            );
            if (updated) {
                this.activity.set(updated);
                this.toastService.success('Activity updated', 'Changes saved.');
                this.dialogRef.close('updated');
            }
        } catch {
            this.toastService.show({
                title: 'Update failed',
                description: 'Could not save activity.',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async confirmDelete(): Promise<void> {
        const activity = this.activity();
        if (!activity) return;

        this.isSubmitting.set(true);
        try {
            await this.activityService.deleteActivity(activity.id);
            this.toastService.success('Activity deleted', 'Activity was removed.');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.show({
                title: 'Delete failed',
                description: 'Could not delete activity.',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    private patchEditForm(activity: Activity): void {
        const dueAt =
            activity.dueAt instanceof Date
                ? activity.dueAt.toISOString().slice(0, 10)
                : activity.dueAt
                  ? String(activity.dueAt).slice(0, 10)
                  : '';
        this.editForm.patchValue({
            type: activity.type,
            subject: activity.subject,
            body: activity.body ?? '',
            dueAt,
        });
    }
}
