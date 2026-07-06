/**
 * Lead Score Rule Dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { LeadScoreRule } from '@models/enterprise.model';
import { LeadScoringService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface LeadScoreRuleDialogData {
    ruleId?: string;
}

export type LeadScoreRuleDialogResult = 'saved' | 'deleted' | 'updated';

const OPERATOR_OPTIONS: SelectOption[] = [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'gt', label: 'Greater than' },
    { value: 'lt', label: 'Less than' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-lead-score-rule-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        SelectComponent,
        CheckboxComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="data.ruleId ? 'Scoring rule' : 'New scoring rule'"
            description="Automatically adjust lead scores when field conditions match."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="rule-name" label="Name" formControlName="name" [required]="true" />
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="rule-field" label="Field" formControlName="field" [required]="true" />
                        <app-select
                            id="rule-operator"
                            label="Operator"
                            formControlName="operator"
                            [options]="operatorOptions"
                        />
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="rule-value" label="Value" formControlName="value" [required]="true" />
                        <app-input
                            id="rule-points"
                            label="Points"
                            type="number"
                            formControlName="points"
                            [required]="true"
                        />
                    </div>
                    <app-checkbox id="rule-active" label="Active" formControlName="active" />

                    @if (rule(); as item) {
                        <app-badge [variant]="item.active ? 'default' : 'secondary'">
                            {{ item.active ? 'Active' : 'Inactive' }}
                        </app-badge>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (rule()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteRule()"
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
                            Save rule
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class LeadScoreRuleDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly leadScoringService = inject(LeadScoringService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<LeadScoreRuleDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<LeadScoreRuleDialogResult>);

    readonly operatorOptions = OPERATOR_OPTIONS;

    readonly rule = signal<LeadScoreRule | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageContacts),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        field: ['status', Validators.required],
        operator: ['eq', Validators.required],
        value: ['', Validators.required],
        points: [10, Validators.required],
        active: [true],
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
            if (this.data.ruleId) {
                const item = await this.leadScoringService.getById(this.data.ruleId);
                this.rule.set(item);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        field: item.field,
                        operator: item.operator,
                        value: item.value,
                        points: item.points,
                        active: item.active,
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load rule');
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
                name: raw.name,
                field: raw.field,
                operator: raw.operator,
                value: raw.value,
                points: Number(raw.points),
                active: raw.active,
            };

            if (this.rule()?.id) {
                await this.leadScoringService.update(this.rule()!.id, payload);
                this.toastService.success('Rule updated');
                this.dialogRef.close('updated');
            } else {
                await this.leadScoringService.create(payload);
                this.toastService.success('Rule created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save rule');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteRule(): Promise<void> {
        const id = this.rule()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.leadScoringService.delete(id);
            this.toastService.success('Rule deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete rule');
        } finally {
            this.submitting.set(false);
        }
    }
}
