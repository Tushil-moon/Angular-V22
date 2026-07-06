/**
 * Email Sequence Dialog — multi-step drip builder
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { EmailSequence, SequenceStep } from '@models/enterprise.model';
import { EmailSequenceService, EmailTemplateService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface EmailSequenceDialogData {
    sequenceId?: string;
}

export type EmailSequenceDialogResult = 'saved' | 'deleted' | 'updated';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-email-sequence-dialog',
    host: { class: 'contents' },
    imports: [
        FormsModule,
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        SelectComponent,
        TextareaComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="data.sequenceId ? 'Edit sequence' : 'New sequence'"
            description="Automated multi-step email nurture flows."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="sequence-name" label="Name" formControlName="name" [required]="true" />
                    <app-textarea id="sequence-description" label="Description" formControlName="description" />

                    <div class="space-y-3 border-t border-border pt-4">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium">Steps</p>
                            @if (canManage()) {
                                <app-button variant="outline" size="sm" type="button" (clicked)="addStep()">
                                    Add step
                                </app-button>
                            }
                        </div>

                        @for (step of steps(); track $index) {
                            <div class="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]">
                                <app-select
                                    [id]="'step-template-' + $index"
                                    label="Template"
                                    [options]="templateOptions()"
                                    [ngModel]="step.templateId"
                                    [ngModelOptions]="{ standalone: true }"
                                    (ngModelChange)="updateStep($index, 'templateId', $event)"
                                />
                                <app-input
                                    [id]="'step-delay-' + $index"
                                    label="Delay (days)"
                                    type="number"
                                    [ngModel]="step.delayDays"
                                    [ngModelOptions]="{ standalone: true }"
                                    (ngModelChange)="updateStep($index, 'delayDays', +$event)"
                                />
                                @if (canManage()) {
                                    <div class="flex items-end">
                                        <app-button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            (clicked)="removeStep($index)"
                                        >
                                            Remove
                                        </app-button>
                                    </div>
                                }
                            </div>
                        }
                    </div>

                    @if (sequence(); as item) {
                        <app-badge [variant]="item.active ? 'default' : 'secondary'">
                            {{ item.active ? 'Active' : 'Inactive' }}
                        </app-badge>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (sequence()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteSequence()"
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
                            Save sequence
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class EmailSequenceDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly emailSequenceService = inject(EmailSequenceService);
    private readonly emailTemplateService = inject(EmailTemplateService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<EmailSequenceDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<EmailSequenceDialogResult>);

    readonly sequence = signal<EmailSequence | null>(null);
    readonly steps = signal<{ order: number; delayDays: number; templateId: string }[]>([]);
    readonly templateOptions = signal<SelectOption[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageContacts),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
    });

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    addStep(): void {
        this.steps.update((current) => [
            ...current,
            { order: current.length, delayDays: 0, templateId: this.templateOptions()[0]?.value ?? '' },
        ]);
    }

    removeStep(index: number): void {
        this.steps.update((current) =>
            current.filter((_, i) => i !== index).map((step, order) => ({ ...step, order })),
        );
    }

    updateStep(index: number, field: 'templateId' | 'delayDays', value: string | number): void {
        this.steps.update((current) =>
            current.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
        );
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            const templates = await this.emailTemplateService.list({ page: 1, pageSize: 100, active: true });
            this.templateOptions.set(templates.data.map((t) => ({ value: t.id, label: t.name })));

            if (this.data.sequenceId) {
                const item = await this.emailSequenceService.getById(this.data.sequenceId);
                this.sequence.set(item);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        description: item.description ?? '',
                    });
                    this.steps.set(
                        (item.steps ?? []).map((step: SequenceStep) => ({
                            order: step.order,
                            delayDays: step.delayDays,
                            templateId: step.templateId,
                        })),
                    );
                }
            }
        } catch {
            this.toastService.error('Failed to load sequence');
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
                steps: this.steps().filter((step) => step.templateId),
            };

            if (this.sequence()?.id) {
                await this.emailSequenceService.update(this.sequence()!.id, payload);
                this.toastService.success('Sequence updated');
                this.dialogRef.close('updated');
            } else {
                await this.emailSequenceService.create(payload);
                this.toastService.success('Sequence created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save sequence');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteSequence(): Promise<void> {
        const id = this.sequence()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.emailSequenceService.delete(id);
            this.toastService.success('Sequence deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete sequence');
        } finally {
            this.submitting.set(false);
        }
    }
}
