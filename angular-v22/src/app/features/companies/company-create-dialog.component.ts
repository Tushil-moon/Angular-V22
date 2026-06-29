/**
 * Company Create Dialog
 */

import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';
import { createCompanySchema, safeValidate } from '@utils/validators';

export type CompanyCreateDialogResult = 'created';

@Component({
    selector: 'app-company-create-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        InputComponent,
        LoaderComponent,
        TextareaComponent,
    ],
    template: `
        <app-dialog title="Add company" description="Create a new B2B account." size="lg">
            <form
                id="company-create-form"
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
                class="space-y-4"
            >
                <app-input
                    id="company-name"
                    label="Company name"
                    formControlName="name"
                    [error]="fieldError('name')"
                    [required]="true"
                />
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-input id="company-domain" label="Domain" formControlName="domain" />
                    <app-input id="company-industry" label="Industry" formControlName="industry" />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <app-input id="company-size" label="Size" formControlName="size" />
                    <app-input
                        id="company-website"
                        label="Website"
                        formControlName="website"
                        [error]="fieldError('website')"
                    />
                </div>
                <app-input id="company-address" label="Address" formControlName="address" />
                <app-textarea id="company-notes" label="Notes" formControlName="notes" />
            </form>

            <div dialogFooter>
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                <app-button type="submit" form="company-create-form" [disabled]="isSubmitting()">
                    @if (isSubmitting()) {
                        <app-loader size="sm" [inline]="true" />
                    } @else {
                        Create company
                    }
                </app-button>
            </div>
        </app-dialog>
    `,
})
export class CompanyCreateDialogComponent {
    private readonly companyService = inject(CompanyService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(
        DialogRef<CompanyCreateDialogComponent, CompanyCreateDialogResult>,
    );

    form = this.fb.group({
        name: ['', Validators.required],
        domain: [''],
        industry: [''],
        size: [''],
        website: [''],
        address: [''],
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
            name: raw.name.trim(),
            domain: raw.domain.trim() || undefined,
            industry: raw.industry.trim() || undefined,
            size: raw.size.trim() || undefined,
            website: raw.website.trim() || undefined,
            address: raw.address.trim() || undefined,
            notes: raw.notes.trim() || undefined,
        };

        const validation = safeValidate(createCompanySchema, payload);
        if (!validation.success) {
            this.fieldErrors.set(validation.errors ?? {});
            return;
        }

        this.fieldErrors.set({});
        this.isSubmitting.set(true);

        try {
            const company = await this.companyService.createCompany(validation.data);
            if (company) {
                this.toastService.success('Company created', `${company.name} has been added.`);
                this.dialogRef.close('created');
            }
        } catch {
            this.toastService.show({
                title: 'Failed to create company',
                description: 'Please check the details and try again.',
                variant: 'destructive',
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
