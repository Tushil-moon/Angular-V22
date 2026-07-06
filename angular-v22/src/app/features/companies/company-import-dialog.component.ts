/**
 * Company Import Dialog — CSV import with duplicate skip option
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CompanyImportResult } from '@models/index';
import { CompanyService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    SubmitButtonComponent,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';

export type CompanyImportDialogResult = 'imported';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-company-import-dialog',
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
            title="Import companies"
            description="Paste CSV with headers: name, domain, industry, size, website, employee_count, annual_revenue, parent_domain, ownership_percent, notes"
            size="lg"
            [showFooter]="true"
        >
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="importCompanies()">
                <app-textarea
                    id="import-company-csv"
                    label="CSV data"
                    formControlName="csv"
                    [rows]="12"
                />
                <app-checkbox
                    id="skip-company-duplicates"
                    label="Skip rows that match existing companies"
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
                    (clicked)="importCompanies()"
                />
            </div>
        </app-dialog>
    `,
})
export class CompanyImportDialogComponent {
    private readonly companyService = inject(CompanyService);
    private readonly toastService = inject(ToastService);
    private readonly dialogRef = inject(DialogRef<CompanyImportDialogResult>);
    private readonly fb = inject(NonNullableFormBuilder);

    loading = signal(false);
    result = signal<CompanyImportResult | null>(null);

    form = this.fb.group({
        csv: this.fb.control(''),
        skipDuplicates: this.fb.control(true),
    });

    async importCompanies(): Promise<void> {
        const value = this.form.getRawValue();
        if (!value.csv.trim()) {
            this.toastService.error('CSV required', 'Paste CSV content to import companies.');
            return;
        }

        this.loading.set(true);
        try {
            const importResult = await this.companyService.importCompaniesCsv(
                value.csv,
                value.skipDuplicates,
            );
            this.result.set(importResult);
            this.toastService.success(
                'Import complete',
                `${importResult.createdCount} companies created.`,
            );
            if (importResult.createdCount > 0) {
                this.dialogRef.close('imported');
            }
        } catch {
            this.toastService.error('Import failed', 'Could not import companies from CSV.');
        } finally {
            this.loading.set(false);
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}
