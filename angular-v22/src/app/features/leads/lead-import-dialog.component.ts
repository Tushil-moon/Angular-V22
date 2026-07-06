/**
 * Lead Import Dialog — CSV import with duplicate skip option
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LeadImportResult } from '@models/index';
import { LeadService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    SubmitButtonComponent,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';

export type LeadImportDialogResult = 'imported';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-lead-import-dialog',
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
            title="Import leads"
            description="Paste CSV with headers: first_name, last_name, email, phone, company, job_title, lead_source, stage, notes"
            size="lg"
            [showFooter]="true"
        >
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="importLeads()">
                <app-textarea
                    id="import-csv"
                    label="CSV data"
                    formControlName="csv"
                    [rows]="12"
                    placeholder="first_name,last_name,email,phone,company&#10;Jane,Doe,jane@example.com,+1 555-0199,Example Inc"
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
                    (clicked)="importLeads()"
                />
            </div>
        </app-dialog>
    `,
})
export class LeadImportDialogComponent {
    private readonly leadService = inject(LeadService);
    private readonly toastService = inject(ToastService);
    private readonly dialogRef = inject(DialogRef<LeadImportDialogResult>);
    private readonly fb = inject(NonNullableFormBuilder);

    readonly loading = signal(false);
    readonly result = signal<LeadImportResult | null>(null);

    readonly form = this.fb.group({
        csv: [''],
        skipDuplicates: [true],
    });

    close(): void {
        this.dialogRef.close(this.result() ? 'imported' : undefined);
    }

    async importLeads(): Promise<void> {
        const csv = this.form.controls.csv.value.trim();
        if (!csv || this.loading()) return;

        this.loading.set(true);
        try {
            const importResult = await this.leadService.importLeadsCsv(
                csv,
                this.form.controls.skipDuplicates.value,
            );
            this.result.set(importResult);
            this.toastService.success(
                'Import complete',
                `Created ${importResult.createdCount} leads.`,
            );
        } catch {
            this.toastService.error('Import failed', 'Could not import leads.');
        } finally {
            this.loading.set(false);
        }
    }
}
