/**
 * Activity Create Dialog
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ACTIVITY_TYPE_LABELS, ActivityType } from '@models/index';
import { ActivityService, ContactService, DealService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';
import { createActivitySchema, safeValidate } from '@utils/validators';

export type ActivityCreateDialogResult = 'created';

const TYPE_OPTIONS = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][];

@Component({
    selector: 'app-activity-create-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        InputComponent,
        LoaderComponent,
        SelectComponent,
        TextareaComponent,
    ],
    template: `
        <app-dialog title="Log activity" description="Record a call, email, meeting, task, or note." size="lg">
            <form
                id="activity-create-form"
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
                class="space-y-4"
            >
                <app-select
                    id="activity-type"
                    label="Type"
                    formControlName="type"
                    [options]="typeSelectOptions"
                />
                <app-input
                    id="activity-subject"
                    label="Subject"
                    formControlName="subject"
                    [error]="fieldError('subject')"
                    [required]="true"
                />
                <app-textarea id="activity-body" label="Details" formControlName="body" />
                <app-select
                    id="activity-contact"
                    label="Contact"
                    formControlName="contactId"
                    [options]="contactOptions()"
                    placeholder="Select contact (optional)"
                />
                <app-select
                    id="activity-deal"
                    label="Deal"
                    formControlName="dealId"
                    [options]="dealOptions()"
                    placeholder="Select deal (optional)"
                />
                <app-input
                    id="activity-due"
                    type="date"
                    label="Due date"
                    formControlName="dueAt"
                />
            </form>

            <div dialogFooter>
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                <app-button type="submit" form="activity-create-form" [disabled]="isSubmitting()">
                    @if (isSubmitting()) {
                        <app-loader size="sm" [inline]="true" />
                    } @else {
                        Log activity
                    }
                </app-button>
            </div>
        </app-dialog>
    `,
})
export class ActivityCreateDialogComponent implements OnInit {
    private readonly activityService = inject(ActivityService);
    private readonly contactService = inject(ContactService);
    private readonly dealService = inject(DealService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<ActivityCreateDialogComponent, ActivityCreateDialogResult>,
    );

    readonly typeSelectOptions: SelectOption[] = TYPE_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));

    contactOptions = signal<SelectOption[]>([{ value: '', label: 'None' }]);
    dealOptions = signal<SelectOption[]>([{ value: '', label: 'None' }]);

    form = this.fb.group({
        type: ['NOTE' as ActivityType],
        subject: ['', Validators.required],
        body: [''],
        contactId: [''],
        dealId: [''],
        dueAt: [''],
    });

    fieldErrors = signal<Record<string, string[]>>({});
    isSubmitting = signal(false);

    ngOnInit(): void {
        void this.loadOptions();
    }

    async loadOptions(): Promise<void> {
        const [contacts, deals] = await Promise.all([
            this.contactService.listContacts({ page: 1, pageSize: 50 }),
            this.dealService.listDeals({ page: 1, pageSize: 50 }),
        ]);

        this.contactOptions.set([
            { value: '', label: 'None' },
            ...contacts.data.map((c) => ({ value: c.id, label: c.fullName })),
        ]);
        this.dealOptions.set([
            { value: '', label: 'None' },
            ...deals.data.map((d) => ({ value: d.id, label: d.title })),
        ]);
    }

    close(): void {
        this.dialogRef.close();
    }

    fieldError(field: string): string | null {
        return this.fieldErrors()[field]?.[0] ?? null;
    }

    async onSubmit(): Promise<void> {
        const raw = this.form.getRawValue();
        const payload = {
            type: raw.type,
            subject: raw.subject.trim(),
            body: raw.body.trim() || undefined,
            contactId: raw.contactId || undefined,
            dealId: raw.dealId || undefined,
            dueAt: raw.dueAt || undefined,
        };

        if (!payload.contactId && !payload.dealId) {
            this.fieldErrors.set({
                contactId: ['Link to a contact or deal'],
            });
            return;
        }

        const validation = safeValidate(createActivitySchema, payload);
        if (!validation.success) {
            this.fieldErrors.set(validation.errors ?? {});
            return;
        }

        this.fieldErrors.set({});
        this.isSubmitting.set(true);

        try {
            const activity = await this.activityService.createActivity(validation.data);
            if (activity) {
                this.toastService.success('Activity logged', activity.subject);
                this.dialogRef.close('created');
            }
        } catch {
            this.toastService.show({
                title: 'Failed to log activity',
                description: 'Please check the details and try again.',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
