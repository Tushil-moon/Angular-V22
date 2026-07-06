/**
 * Lead Create Dialog
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LEAD_SOURCE_LABELS, LEAD_STAGE_LABELS, LeadSource, LeadStage } from '@models/index';
import { LeadService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DatePickerComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';

export type LeadCreateDialogResult = 'created';

const SOURCE_OPTIONS = Object.entries(LEAD_SOURCE_LABELS) as [LeadSource, string][];
const STAGE_OPTIONS = Object.entries(LEAD_STAGE_LABELS).filter(
    ([stage]) => !['CONVERTED', 'LOST'].includes(stage),
) as [LeadStage, string][];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-lead-create-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        InputComponent,
        LoaderComponent,
        SelectComponent,
        TextareaComponent,
        DatePickerComponent,
    ],
    template: `
        <app-dialog title="Add lead" description="Create a new sales lead." size="lg">
            <form
                id="lead-create-form"
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
                class="space-y-4"
            >
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-input
                        id="lead-first-name"
                        label="First name"
                        formControlName="firstName"
                        [error]="fieldError('firstName')"
                        [required]="true"
                    />
                    <app-input
                        id="lead-last-name"
                        label="Last name"
                        formControlName="lastName"
                        [error]="fieldError('lastName')"
                        [required]="true"
                    />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-input
                        id="lead-email"
                        type="email"
                        label="Email"
                        formControlName="email"
                    />
                    <app-input id="lead-phone" label="Phone" formControlName="phone" />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-input id="lead-company" label="Company" formControlName="company" />
                    <app-input id="lead-job-title" label="Job title" formControlName="jobTitle" />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-select
                        id="lead-source"
                        label="Lead source"
                        formControlName="leadSource"
                        [options]="sourceSelectOptions"
                    />
                    <app-select
                        id="lead-stage"
                        label="Stage"
                        formControlName="stage"
                        [options]="stageSelectOptions"
                    />
                </div>
                <app-date-picker
                    id="lead-follow-up"
                    label="Next follow-up"
                    formControlName="nextFollowUpAt"
                />
                <app-textarea id="lead-notes" label="Notes" formControlName="notes" />
            </form>

            <div dialogFooter class="flex flex-wrap gap-2">
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                <app-button type="submit" form="lead-create-form" [disabled]="isSubmitting()">
                    @if (isSubmitting()) {
                        <app-loader size="sm" [inline]="true" />
                    } @else {
                        Create lead
                    }
                </app-button>
            </div>
        </app-dialog>
    `,
})
export class LeadCreateDialogComponent {
    private readonly leadService = inject(LeadService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(DialogRef<LeadCreateDialogResult>);

    readonly isSubmitting = signal(false);

    readonly sourceSelectOptions: SelectOption[] = SOURCE_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));

    readonly stageSelectOptions: SelectOption[] = STAGE_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));

    readonly form = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: [''],
        phone: [''],
        company: [''],
        jobTitle: [''],
        leadSource: ['WEBSITE' as LeadSource],
        stage: ['NEW' as LeadStage],
        nextFollowUpAt: this.fb.control<string | null>(null),
        notes: [''],
    });

    fieldError(field: 'firstName' | 'lastName'): string | null {
        const control = this.form.controls[field];
        if (!control.touched || !control.errors) return null;
        if (control.errors['required']) return 'Required';
        return null;
    }

    close(): void {
        this.dialogRef.close();
    }

    async onSubmit(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.isSubmitting()) return;

        this.isSubmitting.set(true);
        try {
            const value = this.form.getRawValue();
            const lead = await this.leadService.createLead({
                firstName: value.firstName,
                lastName: value.lastName,
                email: value.email || undefined,
                phone: value.phone || undefined,
                company: value.company || undefined,
                jobTitle: value.jobTitle || undefined,
                leadSource: value.leadSource,
                stage: value.stage,
                nextFollowUpAt: value.nextFollowUpAt ?? undefined,
                notes: value.notes || undefined,
            });

            if (!lead) {
                this.toastService.error('Create failed', 'Could not create lead.');
                return;
            }

            this.toastService.success('Lead created', `${lead.contact.fullName} was added.`);
            this.dialogRef.close('created');
        } catch {
            this.toastService.error('Create failed', 'Could not create lead.');
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
