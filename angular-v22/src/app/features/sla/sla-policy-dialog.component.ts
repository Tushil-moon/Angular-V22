/**
 * SLA Policy Dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { SlaPolicy } from '@models/enterprise.model';
import { PermissionService, SlaService } from '@services/index';
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
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

export interface SlaPolicyDialogData {
    policyId?: string;
}

export type SlaPolicyDialogResult = 'saved' | 'deleted' | 'updated';

const PRIORITY_OPTIONS: SelectOption[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sla-policy-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        SelectComponent,
        TextareaComponent,
        CheckboxComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="data.policyId ? 'SLA policy' : 'New SLA policy'"
            description="Set first-response and resolution targets by priority."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="policy-name" label="Name" formControlName="name" [required]="true" />
                    <app-textarea id="policy-description" label="Description" formControlName="description" />
                    <div class="grid gap-4 sm:grid-cols-3">
                        <app-select
                            id="policy-priority"
                            label="Priority"
                            formControlName="priority"
                            [options]="priorityOptions"
                        />
                        <app-input
                            id="policy-first-response"
                            label="First response (hours)"
                            type="number"
                            formControlName="firstResponseHours"
                            [required]="true"
                        />
                        <app-input
                            id="policy-resolution"
                            label="Resolution (hours)"
                            type="number"
                            formControlName="resolutionHours"
                            [required]="true"
                        />
                    </div>
                    <app-checkbox id="policy-active" label="Active" formControlName="active" />

                    @if (policy(); as item) {
                        <app-badge variant="secondary">{{ formatStatus(item.priority) }}</app-badge>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (policy()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deletePolicy()"
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
                            Save policy
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class SlaPolicyDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly slaService = inject(SlaService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<SlaPolicyDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<SlaPolicyDialogResult>);

    readonly priorityOptions = PRIORITY_OPTIONS;
    readonly formatStatus = formatEnterpriseStatus;

    readonly policy = signal<SlaPolicy | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        priority: ['MEDIUM'],
        firstResponseHours: [4, Validators.required],
        resolutionHours: [24, Validators.required],
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
            if (this.data.policyId) {
                const item = await this.slaService.getPolicy(this.data.policyId);
                this.policy.set(item);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        description: item.description ?? '',
                        priority: item.priority,
                        firstResponseHours: item.firstResponseHours,
                        resolutionHours: item.resolutionHours,
                        active: item.active,
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load SLA policy');
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
                description: raw.description || undefined,
                priority: raw.priority,
                firstResponseHours: Number(raw.firstResponseHours),
                resolutionHours: Number(raw.resolutionHours),
                active: raw.active,
            };

            if (this.policy()?.id) {
                await this.slaService.updatePolicy(this.policy()!.id, payload);
                this.toastService.success('Policy updated');
                this.dialogRef.close('updated');
            } else {
                await this.slaService.createPolicy(payload);
                this.toastService.success('Policy created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save policy');
        } finally {
            this.submitting.set(false);
        }
    }

    async deletePolicy(): Promise<void> {
        const id = this.policy()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.slaService.deletePolicy(id);
            this.toastService.success('Policy deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete policy');
        } finally {
            this.submitting.set(false);
        }
    }
}
