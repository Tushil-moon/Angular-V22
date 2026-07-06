/**
 * Workflow Detail Dialog — step builder, test run, run history
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Workflow, WorkflowRun } from '@models/enterprise.model';
import { PermissionService, WorkflowService } from '@services/index';
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

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

export interface WorkflowDetailDialogData {
    workflowId?: string;
}

export type WorkflowDetailDialogResult = 'saved' | 'deleted' | 'updated';

const TRIGGER_OPTIONS: SelectOption[] = [
    { value: 'lead.created', label: 'Lead created' },
    { value: 'deal.created', label: 'Deal created' },
    { value: 'contact.created', label: 'Contact created' },
    { value: 'case.created', label: 'Case created' },
];

const ACTION_OPTIONS: SelectOption[] = [
    { value: 'ASSIGN_OWNER', label: 'Assign owner' },
    { value: 'CREATE_TASK', label: 'Create task' },
    { value: 'CREATE_ACTIVITY', label: 'Create activity' },
    { value: 'NOTIFY', label: 'Notify (log)' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-detail-dialog',
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
            [title]="data.workflowId ? 'Workflow details' : 'New workflow'"
            description="Automate CRM actions when records are created or updated."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="workflow-name" label="Name" formControlName="name" [required]="true" />
                        <app-select
                            id="workflow-trigger"
                            label="Trigger"
                            formControlName="trigger"
                            [options]="triggerOptions"
                        />
                    </div>
                    <app-textarea id="workflow-description" label="Description" formControlName="description" />

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
                                    [id]="'step-type-' + $index"
                                    label="Action"
                                    [options]="actionOptions"
                                    [ngModel]="step.type"
                                    [ngModelOptions]="{ standalone: true }"
                                    (ngModelChange)="updateStep($index, 'type', $event)"
                                />
                                <app-input
                                    [id]="'step-title-' + $index"
                                    label="Config (title / ownerId)"
                                    [ngModel]="step.configTitle"
                                    [ngModelOptions]="{ standalone: true }"
                                    (ngModelChange)="updateStep($index, 'configTitle', $event)"
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

                    @if (workflow(); as item) {
                        <div class="flex flex-wrap gap-2 border-t border-border pt-4">
                            <app-badge [variant]="item.active ? 'default' : 'secondary'">
                                {{ item.active ? 'Active' : 'Inactive' }}
                            </app-badge>
                            <span class="text-xs text-muted-foreground">{{ item.runCount ?? 0 }} runs</span>
                        </div>

                        @if (runs().length) {
                            <div class="space-y-2 border-t border-border pt-4">
                                <p class="text-sm font-medium">Recent runs</p>
                                @for (run of runs(); track run.id) {
                                    <div class="rounded-md border px-3 py-2 text-sm">
                                        <div class="flex items-center justify-between gap-2">
                                            <span>{{ formatStatus(run.status) }}</span>
                                            <span class="text-xs text-muted-foreground">{{
                                                formatDate(run.createdAt)
                                            }}</span>
                                        </div>
                                        <p class="text-xs text-muted-foreground">{{ run.triggerEvent }}</p>
                                    </div>
                                }
                            </div>
                        }
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (workflow()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteWorkflow()"
                    >
                        Delete
                    </app-button>
                    @if (workflow()?.active) {
                        <app-button
                            variant="outline"
                            type="button"
                            [disabled]="submitting()"
                            (clicked)="deactivate()"
                        >
                            Deactivate
                        </app-button>
                    } @else {
                        <app-button
                            variant="secondary"
                            type="button"
                            [disabled]="submitting()"
                            (clicked)="activate()"
                        >
                            Activate
                        </app-button>
                    }
                    <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="testRun()">
                        Test run
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save workflow
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class WorkflowDetailDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly workflowService = inject(WorkflowService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<WorkflowDetailDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<WorkflowDetailDialogResult>);

    readonly workflow = signal<Workflow | null>(null);
    readonly runs = signal<WorkflowRun[]>([]);
    readonly steps = signal<{ order: number; type: string; configTitle: string }[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly triggerOptions = TRIGGER_OPTIONS;
    readonly actionOptions = ACTION_OPTIONS;
    readonly formatStatus = formatEnterpriseStatus;
    readonly formatDate = formatEnterpriseDate;

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        trigger: ['lead.created'],
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
            { order: current.length, type: 'CREATE_TASK', configTitle: 'Follow up task' },
        ]);
    }

    removeStep(index: number): void {
        this.steps.update((current) =>
            current.filter((_, i) => i !== index).map((step, order) => ({ ...step, order })),
        );
    }

    updateStep(index: number, field: 'type' | 'configTitle', value: string): void {
        this.steps.update((current) =>
            current.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
        );
    }

    private buildDefinition() {
        return {
            steps: this.steps().map((step) => ({
                order: step.order,
                type: step.type,
                config:
                    step.type === 'ASSIGN_OWNER'
                        ? { ownerId: step.configTitle }
                        : { title: step.configTitle, dueInDays: 1 },
            })),
        };
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.data.workflowId) {
                const [item, runs] = await Promise.all([
                    this.workflowService.getById(this.data.workflowId),
                    this.workflowService.listRuns(this.data.workflowId, { page: 1, pageSize: 5 }),
                ]);
                this.workflow.set(item);
                this.runs.set(runs.data);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        description: item.description ?? '',
                        trigger: item.trigger,
                    });
                    const defSteps = (item.definition?.['steps'] as Record<string, unknown>[]) ?? [];
                    this.steps.set(
                        defSteps.map((step, index) => ({
                            order: Number(step['order'] ?? index),
                            type: String(step['type'] ?? 'CREATE_TASK'),
                            configTitle: String(
                                (step['config'] as Record<string, unknown>)?.['title'] ??
                                    (step['config'] as Record<string, unknown>)?.['ownerId'] ??
                                    '',
                            ),
                        })),
                    );
                }
            }
        } catch {
            this.toastService.error('Failed to load workflow');
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
                description: raw.description || null,
                trigger: raw.trigger,
                definition: this.buildDefinition(),
            };

            if (this.workflow()?.id) {
                await this.workflowService.update(this.workflow()!.id, payload);
                this.toastService.success('Workflow updated');
                this.dialogRef.close('updated');
            } else {
                await this.workflowService.create({ ...payload, active: true });
                this.toastService.success('Workflow created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save workflow');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteWorkflow(): Promise<void> {
        const id = this.workflow()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.workflowService.delete(id);
            this.toastService.success('Workflow deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete workflow');
        } finally {
            this.submitting.set(false);
        }
    }

    async activate(): Promise<void> {
        const id = this.workflow()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.workflowService.activate(id);
            this.toastService.success('Workflow activated');
            this.dialogRef.close('updated');
        } catch {
            this.toastService.error('Failed to activate workflow');
        } finally {
            this.submitting.set(false);
        }
    }

    async deactivate(): Promise<void> {
        const id = this.workflow()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.workflowService.deactivate(id);
            this.toastService.success('Workflow deactivated');
            this.dialogRef.close('updated');
        } catch {
            this.toastService.error('Failed to deactivate workflow');
        } finally {
            this.submitting.set(false);
        }
    }

    async testRun(): Promise<void> {
        const id = this.workflow()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.workflowService.test(id);
            this.toastService.success('Test run started');
            const runs = await this.workflowService.listRuns(id, { page: 1, pageSize: 5 });
            this.runs.set(runs.data);
        } catch {
            this.toastService.error('Failed to start test run');
        } finally {
            this.submitting.set(false);
        }
    }
}
