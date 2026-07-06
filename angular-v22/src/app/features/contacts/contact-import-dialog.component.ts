/**
 * Contact Import Dialog — CSV import with duplicate skip option
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ContactImportResult } from '@models/index';
import { ContactService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    SubmitButtonComponent,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';

export type ContactImportDialogResult = 'imported';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-contact-import-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        CheckboxComponent,
        TextareaComponent,
        SubmitButtonComponent,
    ],
    template: `
        <app-dialog
            title="Import contacts"
            description="Paste CSV content with headers: first_name, last_name, email, phone, company, job_title, status, lead_source, notes"
            size="lg"
            [showFooter]="true"
        >
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="importContacts()">
                <app-textarea
                    id="import-csv"
                    label="CSV data"
                    formControlName="csv"
                    [rows]="12"
                    placeholder="first_name,last_name,email,phone,company&#10;Alice,Johnson,alice@example.com,+1 555-0101,Acme Corp"
                />
                <app-checkbox
                    id="skip-duplicates"
                    label="Skip rows that match existing contacts"
                    formControlName="skipDuplicates"
                />

                @if (result()) {
                    <div class="rounded-md border p-3 text-sm space-y-1">
                        <p>Created: {{ result()?.createdCount }}</p>
                        <p>Skipped: {{ result()?.skippedCount }}</p>
                        <p>Failed: {{ result()?.failedCount }}</p>
                    </div>
                }
            </form>

            <div dialogFooter class="flex flex-wrap gap-2">
                <app-button type="button" variant="outline" (clicked)="close()">Close</app-button>
                <app-submit-button
                    label="Import"
                    loadingLabel="Importing..."
                    [loading]="loading()"
                    (clicked)="importContacts()"
                />
            </div>
        </app-dialog>
    `,
})
export class ContactImportDialogComponent {
    private readonly contactService = inject(ContactService);
    private readonly toastService = inject(ToastService);
    private readonly dialogRef = inject(DialogRef<ContactImportDialogResult>);
    private readonly fb = inject(NonNullableFormBuilder);

    loading = signal(false);
    result = signal<ContactImportResult | null>(null);

    form = this.fb.group({
        csv: this.fb.control(''),
        skipDuplicates: this.fb.control(true),
    });

    async importContacts(): Promise<void> {
        const value = this.form.getRawValue();
        if (!value.csv.trim()) {
            this.toastService.error('CSV required', 'Paste CSV content to import contacts.');
            return;
        }

        this.loading.set(true);
        try {
            const importResult = await this.contactService.importContactsCsv(
                value.csv,
                value.skipDuplicates,
            );
            this.result.set(importResult);
            this.toastService.success(
                'Import complete',
                `${importResult.createdCount} contacts created.`,
            );
            if (importResult.createdCount > 0) {
                this.dialogRef.close('imported');
            }
        } catch {
            this.toastService.error('Import failed', 'Could not import contacts from CSV.');
        } finally {
            this.loading.set(false);
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}
