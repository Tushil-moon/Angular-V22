/**
 * Contact Create Dialog
 */

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONTACT_STATUS_LABELS, ContactStatus } from '@models/index';
import { ContactService } from '@services/index';
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
import { createContactSchema, safeValidate } from '@utils/validators';

export type ContactCreateDialogResult = 'created';

const STATUS_OPTIONS = Object.entries(CONTACT_STATUS_LABELS) as [ContactStatus, string][];

@Component({
    selector: 'app-contact-create-dialog',
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
        <app-dialog title="Add contact" description="Create a new CRM contact.">
            <form
                id="contact-create-form"
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
                class="space-y-4"
            >
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-input
                        id="contact-first-name"
                        label="First name"
                        formControlName="firstName"
                        [error]="fieldError('firstName')"
                        [required]="true"
                    />
                    <app-input
                        id="contact-last-name"
                        label="Last name"
                        formControlName="lastName"
                        [error]="fieldError('lastName')"
                        [required]="true"
                    />
                </div>
                <app-input
                    id="contact-email"
                    type="email"
                    label="Email"
                    formControlName="email"
                    [error]="fieldError('email')"
                />
                <app-input
                    id="contact-phone"
                    label="Phone"
                    formControlName="phone"
                    [error]="fieldError('phone')"
                />
                <app-input
                    id="contact-company"
                    label="Company"
                    formControlName="company"
                    [error]="fieldError('company')"
                />
                <app-input
                    id="contact-job-title"
                    label="Job title"
                    formControlName="jobTitle"
                    [error]="fieldError('jobTitle')"
                />
                <app-select
                    id="contact-status"
                    label="Status"
                    formControlName="status"
                    [options]="statusSelectOptions"
                />
                <app-input
                    id="contact-tags"
                    label="Tags"
                    formControlName="tags"
                    placeholder="vip, enterprise (comma separated)"
                />
                <app-textarea id="contact-notes" label="Notes" formControlName="notes" />
            </form>

            <div dialogFooter>
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                <app-button type="submit" form="contact-create-form" [disabled]="isSubmitting()">
                    @if (isSubmitting()) {
                        <app-loader size="sm" [inline]="true" />
                    } @else {
                        Create contact
                    }
                </app-button>
            </div>
        </app-dialog>
    `,
})
export class ContactCreateDialogComponent {
    private readonly contactService = inject(ContactService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<ContactCreateDialogComponent, ContactCreateDialogResult>,
    );

    readonly statusOptions = STATUS_OPTIONS;
    readonly statusSelectOptions: SelectOption[] = STATUS_OPTIONS.map(([value, label]) => ({
        value,
        label,
    }));

    form = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: [''],
        phone: [''],
        company: [''],
        jobTitle: [''],
        status: ['LEAD'],
        tags: [''],
        notes: [''],
    });

    fieldErrors = signal<Record<string, string[]>>({});
    isSubmitting = signal(false);

    close(): void {
        this.dialogRef.close();
    }

    fieldError(field: string): string | null {
        return this.fieldErrors()[field]?.[0] ?? null;
    }

    async onSubmit(): Promise<void> {
        const raw = this.form.getRawValue();
        const payload = {
            firstName: raw.firstName.trim(),
            lastName: raw.lastName.trim(),
            email: raw.email.trim() || undefined,
            phone: raw.phone.trim() || undefined,
            company: raw.company.trim() || undefined,
            jobTitle: raw.jobTitle.trim() || undefined,
            status: raw.status,
            notes: raw.notes.trim() || undefined,
            tagNames: raw.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
        };

        const { tagNames, ...contactPayload } = payload;
        const validation = safeValidate(createContactSchema, contactPayload);
        if (!validation.success) {
            this.fieldErrors.set(validation.errors ?? {});
            return;
        }

        this.fieldErrors.set({});
        this.isSubmitting.set(true);

        const validatedData = validation.data;
        try {
            const contact = await this.contactService.createContact({
                ...validatedData,
                ...(tagNames.length ? { tagNames } : {}),
            });
            if (contact) {
                this.toastService.show({
                    title: 'Contact created',
                    description: `${contact.fullName} has been added.`,
                });
                this.dialogRef.close('created');
            }
        } catch {
            this.toastService.show({
                title: 'Failed to create contact',
                description: 'Please check the details and try again.',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
