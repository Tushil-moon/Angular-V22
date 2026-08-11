/**
 * Stock adjustment dialog — captures a non-zero quantity delta and an optional note.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    SubmitButtonComponent,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_DATA } from '@shared/dialog/dialog.tokens';

export interface InventoryAdjustDialogData {
    itemLabel: string;
    warehouseName: string;
    onHand: number;
}

export interface InventoryAdjustDialogResult {
    quantityDelta: number;
    note?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-inventory-adjust-dialog',
    imports: [
        FormField,
        DialogComponent,
        InputComponent,
        TextareaComponent,
        ButtonComponent,
        SubmitButtonComponent,
    ],
    template: `
        <app-dialog
            title="Adjust stock"
            [description]="subtitle()"
            [showFooter]="false"
            size="default"
        >
            <form class="dialog-form" (submit)="onSubmit($event)">
                <app-input
                    id="adjust-delta"
                    type="number"
                    label="Quantity change"
                    placeholder="e.g. 10 or -5"
                    [formField]="adjustForm.quantityDelta"
                    [required]="true"
                    [hint]="hint()"
                    [error]="deltaError()"
                />
                <app-textarea
                    id="adjust-note"
                    label="Note"
                    placeholder="Reason for the adjustment (optional)"
                    [rows]="3"
                    [formField]="adjustForm.note"
                />
                <div class="dialog-form-actions">
                    <app-button type="button" variant="outline" (clicked)="cancel()">
                        Cancel
                    </app-button>
                    <app-submit-button
                        label="Apply adjustment"
                        loadingLabel="Applying..."
                        [loading]="saving()"
                        [disabled]="!canSubmit()"
                    />
                </div>
            </form>
        </app-dialog>
    `,
})
export class InventoryAdjustDialogComponent {
    readonly data = inject<InventoryAdjustDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<InventoryAdjustDialogComponent, InventoryAdjustDialogResult | null>,
    );

    readonly saving = signal(false);
    readonly submitted = signal(false);

    readonly model = signal({ quantityDelta: '', note: '' });

    readonly adjustForm = form(this.model);

    readonly subtitle = computed(
        () => `${this.data.itemLabel} · ${this.data.warehouseName} · ${this.data.onHand} on hand`,
    );

    readonly delta = computed(() => Number.parseInt(this.model().quantityDelta, 10));

    readonly hint = computed(() => {
        const delta = this.delta();
        if (!Number.isFinite(delta) || delta === 0) return 'Use a negative value to remove stock.';
        return `New on hand: ${this.data.onHand + delta}`;
    });

    readonly deltaError = computed(() => {
        if (!this.submitted() && !this.model().quantityDelta) return null;
        const delta = this.delta();
        if (!Number.isFinite(delta) || delta === 0) {
            return this.submitted() ? 'Enter a non-zero quantity change.' : null;
        }
        return this.data.onHand + delta < 0 ? 'Adjustment exceeds available on-hand stock.' : null;
    });

    canSubmit(): boolean {
        const delta = this.delta();
        return Number.isFinite(delta) && delta !== 0 && this.data.onHand + delta >= 0;
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.submitted.set(true);
        if (!this.canSubmit() || this.saving()) return;
        this.saving.set(true);
        this.dialogRef.close({
            quantityDelta: this.delta(),
            note: this.model().note.trim() || undefined,
        });
    }
}
