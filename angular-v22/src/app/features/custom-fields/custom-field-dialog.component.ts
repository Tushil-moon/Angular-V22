/**
 * Custom Field Dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { CustomFieldDefinition } from '@models/enterprise.model';
import { CustomFieldService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface CustomFieldDialogData {
    fieldId?: string;
}

export type CustomFieldDialogResult = 'saved' | 'deleted' | 'updated';

const ENTITY_OPTIONS: SelectOption[] = [
    { value: 'contact', label: 'Contact' },
    { value: 'company', label: 'Company' },
    { value: 'deal', label: 'Deal' },
    { value: 'lead', label: 'Lead' },
];

const TYPE_OPTIONS: SelectOption[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'select', label: 'Select' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-custom-field-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        SelectComponent,
    ],
    template: `
        <app-dialog
            [title]="data.fieldId ? 'Custom field' : 'New custom field'"
            description="Extend CRM records with additional structured data."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-select
                            id="field-entity"
                            label="Entity"
                            formControlName="entityType"
                            [options]="entityOptions"
                        />
                        <app-select
                            id="field-type"
                            label="Field type"
                            formControlName="fieldType"
                            [options]="typeOptions"
                        />
                    </div>
                    <app-input id="field-key" label="Key" formControlName="key" [required]="true" />
                    <app-input id="field-label" label="Label" formControlName="label" [required]="true" />
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (field()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteField()"
                    >
                        Delete
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save field
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class CustomFieldDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly customFieldService = inject(CustomFieldService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<CustomFieldDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<CustomFieldDialogResult>);

    readonly entityOptions = ENTITY_OPTIONS;
    readonly typeOptions = TYPE_OPTIONS;

    readonly field = signal<CustomFieldDefinition | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly form = this.fb.group({
        entityType: ['contact', Validators.required],
        key: ['', Validators.required],
        label: ['', Validators.required],
        fieldType: ['text', Validators.required],
    });

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.data.fieldId) {
                const item = await this.customFieldService.getById(this.data.fieldId);
                this.field.set(item);
                if (item) {
                    this.form.patchValue({
                        entityType: item.entityType,
                        key: item.key,
                        label: item.label,
                        fieldType: item.fieldType,
                    });
                    this.form.controls.key.disable();
                    this.form.controls.entityType.disable();
                }
            }
        } catch {
            this.toastService.error('Failed to load field');
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            const payload = {
                entityType: raw.entityType,
                key: raw.key,
                label: raw.label,
                fieldType: raw.fieldType,
            };

            if (this.field()?.id) {
                await this.customFieldService.update(this.field()!.id, {
                    label: raw.label,
                    fieldType: raw.fieldType,
                });
                this.toastService.success('Field updated');
                this.dialogRef.close('updated');
            } else {
                await this.customFieldService.create(payload);
                this.toastService.success('Field created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save field');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteField(): Promise<void> {
        const id = this.field()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.customFieldService.delete(id);
            this.toastService.success('Field deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete field');
        } finally {
            this.submitting.set(false);
        }
    }
}
