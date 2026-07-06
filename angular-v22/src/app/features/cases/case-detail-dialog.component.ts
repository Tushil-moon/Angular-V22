/**
 * Case Detail Dialog — triage, comments, SLA, lifecycle
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { CaseHistoryEntry, CaseRecord } from '@models/enterprise.model';
import { CaseService, PermissionService, SlaService } from '@services/index';
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
import {
    enterprisePriorityBadge,
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';

export interface CaseDetailDialogData {
    caseId?: string;
}

export type CaseDetailDialogResult = 'saved' | 'deleted' | 'updated';

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
];

const HISTORY_LABELS: Record<string, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    ASSIGNED: 'Assigned',
    STATUS_CHANGED: 'Status changed',
    COMMENT_ADDED: 'Comment added',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    REOPENED: 'Reopened',
    SLA_BREACH: 'SLA breached',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-case-detail-dialog',
    host: { class: 'contents' },
    imports: [
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
            [title]="data.caseId ? 'Case details' : 'New case'"
            description="Track customer issues, SLA targets, and agent responses."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="case-subject" label="Subject" formControlName="subject" [required]="true" />
                        <app-input id="case-number" label="Case number" formControlName="caseNumber" />
                    </div>
                    <app-textarea id="case-description" label="Description" formControlName="description" />
                    <div class="grid gap-4 sm:grid-cols-3">
                        <app-select id="case-status" label="Status" formControlName="status" [options]="statusOptions" />
                        <app-select
                            id="case-priority"
                            label="Priority"
                            formControlName="priority"
                            [options]="priorityOptions"
                        />
                        <app-select
                            id="case-queue"
                            label="Queue"
                            formControlName="queueId"
                            [options]="queueOptions()"
                            placeholder="Optional"
                        />
                    </div>

                    @if (caseItem(); as item) {
                        <div class="flex flex-wrap gap-2 border-t border-border pt-4">
                            <app-badge [variant]="statusVariant(item.status)">{{
                                formatStatus(item.status)
                            }}</app-badge>
                            <app-badge [variant]="priorityVariant(item.priority)">{{
                                formatStatus(item.priority)
                            }}</app-badge>
                            @if (item.slaBreached) {
                                <app-badge variant="destructive">SLA breached</app-badge>
                            }
                        </div>

                        <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                            <div>
                                <dt class="text-muted-foreground">First response due</dt>
                                <dd>{{ formatDateTime(item.firstResponseDueAt) }}</dd>
                            </div>
                            <div>
                                <dt class="text-muted-foreground">Resolution due</dt>
                                <dd>{{ formatDateTime(item.resolutionDueAt) }}</dd>
                            </div>
                            <div>
                                <dt class="text-muted-foreground">Contact</dt>
                                <dd>{{ item.contact?.fullName ?? '—' }}</dd>
                            </div>
                            <div>
                                <dt class="text-muted-foreground">Company</dt>
                                <dd>{{ item.company?.name ?? '—' }}</dd>
                            </div>
                        </dl>

                        @if (item.comments?.length) {
                            <div class="space-y-2 border-t border-border pt-4">
                                <p class="text-sm font-medium">Conversation</p>
                                @for (comment of item.comments; track comment.id) {
                                    <div class="rounded-md border px-3 py-2 text-sm">
                                        <p class="whitespace-pre-wrap">{{ comment.body }}</p>
                                        <p class="mt-1 text-xs text-muted-foreground">
                                            {{ comment.user?.email ?? 'Agent' }} ·
                                            {{ formatDateTime(comment.createdAt) }}
                                        </p>
                                    </div>
                                }
                            </div>
                        }

                        @if (canManage()) {
                            <div class="space-y-2 border-t border-border pt-4">
                                <app-textarea
                                    id="case-comment"
                                    label="Add comment"
                                    formControlName="comment"
                                />
                            </div>
                        }

                        @if (history().length) {
                            <div class="space-y-2 border-t border-border pt-4">
                                <p class="text-sm font-medium">History</p>
                                @for (entry of history(); track entry.id) {
                                    <div class="rounded-md border px-3 py-2 text-sm">
                                        <p class="font-medium">{{ historyLabel(entry.action) }}</p>
                                        <p class="text-xs text-muted-foreground">
                                            {{ formatDateTime(entry.createdAt) }}
                                        </p>
                                    </div>
                                }
                            </div>
                        }
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (caseItem()?.id && canManage()) {
                    <app-button variant="destructive" type="button" [disabled]="submitting()" (clicked)="deleteCase()">
                        Delete
                    </app-button>
                    @if (caseItem()?.status !== 'RESOLVED' && caseItem()?.status !== 'CLOSED') {
                        <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="resolveCase()">
                            Resolve
                        </app-button>
                    }
                    @if (caseItem()?.status === 'RESOLVED') {
                        <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="closeCase()">
                            Close
                        </app-button>
                    }
                    @if (caseItem()?.status === 'CLOSED') {
                        <app-button variant="outline" type="button" [disabled]="submitting()" (clicked)="reopenCase()">
                            Reopen
                        </app-button>
                    }
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save case
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class CaseDetailDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly caseService = inject(CaseService);
    private readonly slaService = inject(SlaService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<CaseDetailDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<CaseDetailDialogResult>);

    readonly caseItem = signal<CaseRecord | null>(null);
    readonly history = signal<CaseHistoryEntry[]>([]);
    readonly queueOptions = signal<SelectOption[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly statusOptions = STATUS_OPTIONS;
    readonly priorityOptions = PRIORITY_OPTIONS;
    readonly formatStatus = formatEnterpriseStatus;
    readonly formatDateTime = formatEnterpriseDate;
    readonly statusVariant = enterpriseStatusBadge;
    readonly priorityVariant = enterprisePriorityBadge;

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    readonly form = this.fb.group({
        subject: ['', Validators.required],
        caseNumber: [''],
        description: [''],
        status: ['OPEN'],
        priority: ['MEDIUM'],
        queueId: [''],
        comment: [''],
    });

    ngOnInit(): void {
        void this.load();
    }

    historyLabel(action: string): string {
        return HISTORY_LABELS[action] ?? action;
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            const queues = await this.slaService.listQueues({ page: 1, pageSize: 100 });
            this.queueOptions.set([
                { value: '', label: 'No queue' },
                ...queues.data.map((queue) => ({ value: queue.id, label: queue.name })),
            ]);

            if (this.data.caseId) {
                const [item, history] = await Promise.all([
                    this.caseService.getById(this.data.caseId),
                    this.caseService.listHistory(this.data.caseId),
                ]);
                if (item) {
                    this.caseItem.set(item);
                    this.history.set(history);
                    this.form.patchValue({
                        subject: item.subject,
                        caseNumber: item.caseNumber ?? '',
                        description: item.description ?? '',
                        status: item.status,
                        priority: item.priority,
                        queueId: item.queueId ?? '',
                    });
                    if (!this.canManage()) this.form.disable();
                }
            }
        } catch {
            this.toastService.show({
                title: 'Load failed',
                description: 'Could not load case details.',
                variant: 'destructive',
            });
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        try {
            const value = this.form.getRawValue();
            const payload = {
                subject: value.subject,
                description: value.description || undefined,
                status: value.status,
                priority: value.priority,
                queueId: value.queueId || undefined,
            };

            let saved: CaseRecord | null;
            if (this.data.caseId) {
                saved = await this.caseService.update(this.data.caseId, payload);
                if (value.comment.trim()) {
                    saved = await this.caseService.addComment(this.data.caseId, value.comment.trim());
                }
            } else {
                saved = await this.caseService.create(payload);
            }

            if (saved) {
                this.toastService.success('Saved', 'Case saved.');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.show({
                title: 'Save failed',
                description: 'Could not save case.',
                variant: 'destructive',
            });
        } finally {
            this.submitting.set(false);
        }
    }

    async resolveCase(): Promise<void> {
        const id = this.caseItem()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.caseService.resolve(id);
            this.toastService.success('Resolved', 'Case marked resolved.');
            this.dialogRef.close('updated');
        } finally {
            this.submitting.set(false);
        }
    }

    async closeCase(): Promise<void> {
        const id = this.caseItem()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.caseService.close(id);
            this.toastService.success('Closed', 'Case closed.');
            this.dialogRef.close('updated');
        } finally {
            this.submitting.set(false);
        }
    }

    async reopenCase(): Promise<void> {
        const id = this.caseItem()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.caseService.reopen(id);
            this.toastService.success('Reopened', 'Case reopened.');
            this.dialogRef.close('updated');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteCase(): Promise<void> {
        const id = this.caseItem()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.caseService.delete(id);
            this.toastService.success('Deleted', 'Case removed.');
            this.dialogRef.close('deleted');
        } finally {
            this.submitting.set(false);
        }
    }
}
