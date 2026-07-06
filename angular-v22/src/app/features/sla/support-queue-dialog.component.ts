/**
 * Support Queue Dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { SlaPolicy, SupportQueue } from '@models/enterprise.model';
import { PermissionService, SlaService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
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

export interface SupportQueueDialogData {
    queueId?: string;
}

export type SupportQueueDialogResult = 'saved' | 'deleted' | 'updated';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-support-queue-dialog',
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
    ],
    template: `
        <app-dialog
            [title]="data.queueId ? 'Support queue' : 'New support queue'"
            description="Route inbound cases to teams with SLA policies."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="queue-name" label="Name" formControlName="name" [required]="true" />
                    <app-textarea id="queue-description" label="Description" formControlName="description" />
                    <app-select
                        id="queue-sla"
                        label="SLA policy"
                        formControlName="slaPolicyId"
                        [options]="policyOptions()"
                        placeholder="No policy"
                    />
                    <app-checkbox id="queue-default" label="Default queue" formControlName="isDefault" />
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (queue()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteQueue()"
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
                            Save queue
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class SupportQueueDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly slaService = inject(SlaService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<SupportQueueDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<SupportQueueDialogResult>);

    readonly queue = signal<SupportQueue | null>(null);
    readonly policies = signal<SlaPolicy[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    readonly policyOptions = computed((): SelectOption[] =>
        this.policies().map((policy) => ({ value: policy.id, label: policy.name })),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        slaPolicyId: [''],
        isDefault: [false],
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
            const policiesPage = await this.slaService.listPolicies({ pageSize: 100 });
            this.policies.set(policiesPage.data);

            if (this.data.queueId) {
                const item = await this.slaService.getQueue(this.data.queueId);
                this.queue.set(item);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        description: item.description ?? '',
                        slaPolicyId: item.slaPolicyId ?? '',
                        isDefault: item.isDefault,
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load queue');
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
                slaPolicyId: raw.slaPolicyId || undefined,
                isDefault: raw.isDefault,
            };

            if (this.queue()?.id) {
                await this.slaService.updateQueue(this.queue()!.id, payload);
                this.toastService.success('Queue updated');
                this.dialogRef.close('updated');
            } else {
                await this.slaService.createQueue(payload);
                this.toastService.success('Queue created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save queue');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteQueue(): Promise<void> {
        const id = this.queue()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.slaService.deleteQueue(id);
            this.toastService.success('Queue deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete queue');
        } finally {
            this.submitting.set(false);
        }
    }
}
