/**
 * Deal Import Dialog
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DealImportResult } from '@models/index';
import { DealService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    SubmitButtonComponent,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog';

export type DealImportDialogResult = 'imported';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-deal-import-dialog',
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
            title="Import deals"
            description="Paste CSV with headers: title, value, currency, stage, contact_email, company, expected_close_date, description, competitor"
            size="lg"
            [showFooter]="true"
        >
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="importDeals()">
                <app-textarea
                    id="import-csv"
                    label="CSV data"
                    formControlName="csv"
                    [rows]="12"
                />
                <app-checkbox
                    id="skip-missing-contacts"
                    label="Skip rows when contact email is not found"
                    formControlName="skipMissingContacts"
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
                    (clicked)="importDeals()"
                />
            </div>
        </app-dialog>
    `,
})
export class DealImportDialogComponent {
    private readonly dealService = inject(DealService);
    private readonly toastService = inject(ToastService);
    private readonly dialogRef = inject(DialogRef<DealImportDialogResult>);
    private readonly fb = inject(NonNullableFormBuilder);

    readonly loading = signal(false);
    readonly result = signal<DealImportResult | null>(null);

    readonly form = this.fb.group({
        csv: [''],
        skipMissingContacts: [true],
    });

    close(): void {
        this.dialogRef.close(this.result() ? 'imported' : undefined);
    }

    async importDeals(): Promise<void> {
        const csv = this.form.controls.csv.value.trim();
        if (!csv || this.loading()) return;

        this.loading.set(true);
        try {
            const importResult = await this.dealService.importDealsCsv(
                csv,
                this.form.controls.skipMissingContacts.value,
            );
            this.result.set(importResult);
            this.toastService.success(
                'Import complete',
                `Created ${importResult.createdCount} deals.`,
            );
        } catch {
            this.toastService.error('Import failed', 'Could not import deals.');
        } finally {
            this.loading.set(false);
        }
    }
}
