/**
 * Generic create/edit dialog driven by a field spec.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    SelectComponent,
    type SelectOption,
    SubmitButtonComponent,
    TextareaComponent,
} from '@shared/components';
import { DialogRef } from '@shared/dialog/dialog-ref';
import { DIALOG_DATA } from '@shared/dialog/dialog.tokens';

export type RecordFormFieldType = 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select';

export interface RecordFormField {
    key: string;
    label: string;
    type?: RecordFormFieldType;
    placeholder?: string;
    hint?: string;
    required?: boolean;
    options?: SelectOption[];
    value?: string;
}

export interface RecordFormData {
    title: string;
    description?: string;
    submitLabel?: string;
    fields: RecordFormField[];
}

export type RecordFormResult = Record<string, string>;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-record-form-dialog',
    imports: [
        DialogComponent,
        InputComponent,
        TextareaComponent,
        SelectComponent,
        ButtonComponent,
        SubmitButtonComponent,
    ],
    template: `
        <app-dialog
            [title]="data.title"
            [description]="data.description ?? ''"
            [showFooter]="false"
            size="default"
        >
            <form class="dialog-form" (submit)="onSubmit($event)">
                @for (field of data.fields; track field.key) {
                    @switch (field.type ?? 'text') {
                        @case ('select') {
                            <app-select
                                [id]="'rf-' + field.key"
                                [label]="field.label"
                                [options]="field.options ?? []"
                                [value]="fieldValue(field.key)"
                                [placeholder]="field.placeholder || 'Select an option'"
                                [ariaLabel]="field.label"
                                (valueChange)="setValue(field.key, $event)"
                            />
                        }
                        @case ('textarea') {
                            <app-textarea
                                [id]="'rf-' + field.key"
                                [label]="field.label"
                                [placeholder]="field.placeholder ?? ''"
                                [hint]="field.hint ?? ''"
                                [required]="!!field.required"
                                [rows]="3"
                                [modelValue]="fieldValue(field.key)"
                                [error]="fieldError(field)"
                                (valueChange)="setValue(field.key, $event)"
                            />
                        }
                        @default {
                            <app-input
                                [id]="'rf-' + field.key"
                                [label]="field.label"
                                [type]="inputType(field.type)"
                                [placeholder]="field.placeholder ?? ''"
                                [hint]="field.hint ?? ''"
                                [required]="!!field.required"
                                [modelValue]="fieldValue(field.key)"
                                [error]="fieldError(field)"
                                (valueChange)="setValue(field.key, $event)"
                            />
                        }
                    }
                }

                <div class="dialog-form-actions">
                    <app-button type="button" variant="outline" (clicked)="cancel()">
                        Cancel
                    </app-button>
                    <app-submit-button
                        [label]="data.submitLabel ?? 'Save'"
                        loadingLabel="Saving..."
                        [loading]="saving()"
                        [disabled]="!canSubmit()"
                    />
                </div>
            </form>
        </app-dialog>
    `,
})
export class RecordFormDialogComponent {
    readonly data = inject<RecordFormData>(DIALOG_DATA);
    private readonly dialogRef = inject(
        DialogRef<RecordFormDialogComponent, RecordFormResult | null>,
    );

    readonly saving = signal(false);
    readonly submitted = signal(false);

    readonly values = signal<RecordFormResult>(
        Object.fromEntries(this.data.fields.map((field) => [field.key, field.value ?? ''])),
    );

    readonly canSubmit = computed(() => {
        const current = this.values();
        return this.data.fields
            .filter((field) => field.required)
            .every((field) => (current[field.key] ?? '').trim().length > 0);
    });

    fieldValue(key: string): string {
        return this.values()[key] ?? '';
    }

    fieldError(field: RecordFormField): string | null {
        if (!this.submitted() || !field.required) return null;
        return this.fieldValue(field.key).trim() ? null : `${field.label} is required`;
    }

    inputType(type: RecordFormFieldType | undefined): string {
        switch (type) {
            case 'email':
                return 'email';
            case 'password':
                return 'password';
            case 'number':
                return 'number';
            case 'date':
                return 'date';
            default:
                return 'text';
        }
    }

    setValue(key: string, value: string): void {
        this.values.update((current) => ({ ...current, [key]: value }));
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    onSubmit(event: Event): void {
        event.preventDefault();
        this.submitted.set(true);
        if (!this.canSubmit() || this.saving()) return;
        this.saving.set(true);

        const current = this.values();
        const trimmed: RecordFormResult = {};
        for (const field of this.data.fields) {
            trimmed[field.key] = (current[field.key] ?? '').trim();
        }
        this.dialogRef.close(trimmed);
    }
}
