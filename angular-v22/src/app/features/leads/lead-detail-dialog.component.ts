/**
 * Lead Detail Dialog — lifecycle actions, history, edit
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
    Lead,
    LEAD_HISTORY_ACTION_LABELS,
    LEAD_STAGE_LABELS,
    LeadHistoryEntry,
    LeadStage,
} from '@models/index';
import { LeadService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    DatePickerComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import { TagBadgesComponent } from '@shared/components/tag-badges.component';
import {
    formatLeadDate,
    formatLeadRating,
    formatLeadStage,
    isFollowUpOverdue,
    leadRatingBadgeVariant,
    leadStageBadgeClass,
} from '@shared/config/leads-table.config';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface LeadDetailDialogData {
    leadId: string;
}

export type LeadDetailDialogResult = 'deleted' | 'updated';

type DialogMode = 'view' | 'edit' | 'qualify' | 'disqualify' | 'convert' | 'delete';

const EDITABLE_STAGES = Object.entries(LEAD_STAGE_LABELS).filter(
    ([stage]) => !['CONVERTED', 'LOST'].includes(stage),
) as [LeadStage, string][];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-lead-detail-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        DatePickerComponent,
        TagBadgesComponent,
        SelectComponent,
        TextareaComponent,
        CheckboxComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="dialogTitle()"
            [description]="dialogDescription()"
            size="lg"
            [showFooter]="footerVisible()"
        >
            @if (mode() === 'delete') {
                <p class="text-sm text-muted-foreground">
                    Delete lead
                    <span class="font-medium text-foreground">{{ lead()!.contact.fullName }}</span
                    >? The linked contact will also be removed.
                </p>
            } @else if (isLoading()) {
                <div class="dialog-loading">
                    <app-loader />
                </div>
            } @else if (lead(); as item) {
                @if (mode() === 'edit') {
                    <form [formGroup]="editForm" class="space-y-4">
                        <app-select
                            id="edit-stage"
                            label="Stage"
                            formControlName="stage"
                            [options]="stageSelectOptions"
                        />
                        <app-date-picker
                            id="edit-follow-up"
                            label="Next follow-up"
                            formControlName="nextFollowUpAt"
                        />
                        <app-textarea
                            id="edit-qualification-notes"
                            label="Qualification notes"
                            formControlName="qualificationNotes"
                        />
                    </form>
                } @else if (mode() === 'qualify') {
                    <form [formGroup]="qualifyForm" class="space-y-4">
                        <app-textarea
                            id="qualify-notes"
                            label="Qualification notes"
                            formControlName="qualificationNotes"
                        />
                    </form>
                } @else if (mode() === 'disqualify') {
                    <form [formGroup]="disqualifyForm" class="space-y-4">
                        <app-textarea
                            id="disqualify-reason"
                            label="Reason"
                            formControlName="lostReason"
                            [error]="disqualifyError()"
                        />
                    </form>
                } @else if (mode() === 'convert') {
                    <form [formGroup]="convertForm" class="space-y-4">
                        <app-select
                            id="convert-status"
                            label="New contact status"
                            formControlName="status"
                            [options]="convertStatusOptions"
                        />
                        <div class="dialog-convert-panel">
                            <app-checkbox
                                id="convert-create-deal"
                                label="Create deal from this lead"
                                formControlName="createDeal"
                            />
                            @if (convertForm.controls.createDeal.value) {
                                <app-input
                                    id="convert-deal-title"
                                    label="Deal title"
                                    formControlName="dealTitle"
                                />
                                <app-input
                                    id="convert-deal-value"
                                    type="number"
                                    label="Deal value"
                                    formControlName="dealValue"
                                />
                            }
                        </div>
                    </form>
                } @else {
                    <div class="space-y-6">
                        <div class="dialog-detail-header">
                            <div>
                                <p class="text-lg font-semibold text-foreground">
                                    {{ item.contact.fullName }}
                                </p>
                                <p class="text-sm text-muted-foreground">
                                    {{ item.contact.jobTitle || '—' }} ·
                                    {{ item.contact.companyRef?.name || item.contact.company || 'No company' }}
                                </p>
                            </div>
                            <span [class]="stageBadgeClass(item.stage)">{{
                                formatStage(item.stage)
                            }}</span>
                        </div>

                        @if (item.contact.tags?.length) {
                            <app-tag-badges [tags]="item.contact.tags" />
                        }

                        <dl class="dialog-detail-grid">
                            <div>
                                <dt>Email</dt>
                                <dd>{{ item.contact.email || '—' }}</dd>
                            </div>
                            <div>
                                <dt>Phone</dt>
                                <dd>{{ item.contact.phone || '—' }}</dd>
                            </div>
                            <div>
                                <dt>Score</dt>
                                <dd class="tabular-nums">{{ item.score }}</dd>
                            </div>
                            <div>
                                <dt>Rating</dt>
                                <dd>
                                    @if (item.rating) {
                                        <app-badge [variant]="ratingBadgeVariant(item.rating)">{{
                                            formatRating(item.rating)
                                        }}</app-badge>
                                    } @else {
                                        —
                                    }
                                </dd>
                            </div>
                            <div>
                                <dt>Follow-up</dt>
                                <dd
                                    [class.text-destructive]="isOverdue(item.nextFollowUpAt) && isOpen(item.stage)"
                                >
                                    {{ formatDate(item.nextFollowUpAt) }}
                                </dd>
                            </div>
                            <div>
                                <dt>Owner</dt>
                                <dd>{{ item.contact.owner?.email || '—' }}</dd>
                            </div>
                        </dl>

                        @if (item.qualificationNotes) {
                            <div class="rounded-md border p-3 text-sm">
                                <p class="font-medium text-foreground">Qualification notes</p>
                                <p class="mt-1 text-muted-foreground whitespace-pre-wrap">
                                    {{ item.qualificationNotes }}
                                </p>
                            </div>
                        }

                        @if (history().length) {
                            <div class="space-y-2">
                                <p class="text-sm font-medium text-foreground">History</p>
                                <ul class="space-y-2 max-h-48 overflow-y-auto">
                                    @for (entry of history(); track entry.id) {
                                        <li class="rounded-md border px-3 py-2 text-sm">
                                            <div class="flex items-center justify-between gap-2">
                                                <span class="font-medium">{{
                                                    historyActionLabel(entry.action)
                                                }}</span>
                                                <span class="text-xs text-muted-foreground">{{
                                                    formatDate(entry.createdAt)
                                                }}</span>
                                            </div>
                                            @if (entry.user) {
                                                <p class="text-xs text-muted-foreground mt-1">
                                                    {{ entry.user.email }}
                                                </p>
                                            }
                                        </li>
                                    }
                                </ul>
                            </div>
                        }
                    </div>
                }
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (mode() === 'view' && lead() && canManage()) {
                    <div class="flex flex-wrap gap-2 w-full justify-between">
                        <div class="flex flex-wrap gap-2">
                            @if (isOpen(lead()!.stage)) {
                                <app-button size="sm" variant="outline" (clicked)="setMode('edit')">
                                    Edit
                                </app-button>
                                <app-button size="sm" variant="outline" (clicked)="scoreLead()">
                                    Score
                                </app-button>
                                <app-button size="sm" variant="outline" (clicked)="setMode('qualify')">
                                    Qualify
                                </app-button>
                                <app-button
                                    size="sm"
                                    variant="outline"
                                    (clicked)="setMode('disqualify')"
                                >
                                    Disqualify
                                </app-button>
                                <app-button size="sm" (clicked)="setMode('convert')">
                                    Convert
                                </app-button>
                            }
                        </div>
                        <app-button
                            size="sm"
                            variant="destructive"
                            (clicked)="setMode('delete')"
                        >
                            Delete
                        </app-button>
                    </div>
                } @else if (mode() !== 'view') {
                    <app-button variant="outline" type="button" (clicked)="cancelMode()">
                        Back
                    </app-button>
                    @if (mode() === 'delete') {
                        <app-button
                            variant="destructive"
                            [disabled]="isSubmitting()"
                            (clicked)="deleteLead()"
                        >
                            Delete lead
                        </app-button>
                    } @else {
                        <app-button [disabled]="isSubmitting()" (clicked)="submitMode()">
                            @if (isSubmitting()) {
                                <app-loader size="sm" [inline]="true" />
                            } @else {
                                {{ submitLabel() }}
                            }
                        </app-button>
                    }
                }
            </div>
        </app-dialog>
    `,
})
export class LeadDetailDialogComponent implements OnInit {
    private readonly leadService = inject(LeadService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly dialogRef = inject(DialogRef<LeadDetailDialogResult>);
    private readonly data = inject<LeadDetailDialogData>(DIALOG_DATA);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageLeads),
    );

    readonly lead = signal<Lead | null>(null);
    readonly history = signal<LeadHistoryEntry[]>([]);
    readonly mode = signal<DialogMode>('view');
    readonly isLoading = signal(true);
    readonly isSubmitting = signal(false);

    readonly formatStage = formatLeadStage;
    readonly formatRating = formatLeadRating;
    readonly formatDate = formatLeadDate;
    readonly stageBadgeClass = leadStageBadgeClass;
    readonly ratingBadgeVariant = leadRatingBadgeVariant;
    readonly isOverdue = isFollowUpOverdue;
    readonly historyActionLabel = (action: LeadHistoryEntry['action']) =>
        LEAD_HISTORY_ACTION_LABELS[action] ?? action;

    readonly stageSelectOptions: SelectOption[] = EDITABLE_STAGES.map(([value, label]) => ({
        value,
        label,
    }));

    readonly convertStatusOptions: SelectOption[] = [
        { value: 'PROSPECT', label: 'Prospect' },
        { value: 'CUSTOMER', label: 'Customer' },
    ];

    readonly editForm = this.fb.group({
        stage: ['NEW' as LeadStage],
        nextFollowUpAt: this.fb.control<string | null>(null),
        qualificationNotes: [''],
    });

    readonly qualifyForm = this.fb.group({
        qualificationNotes: [''],
    });

    readonly disqualifyForm = this.fb.group({
        lostReason: [''],
    });

    readonly convertForm = this.fb.group({
        status: ['PROSPECT' as 'PROSPECT' | 'CUSTOMER'],
        createDeal: [false],
        dealTitle: [''],
        dealValue: [0],
    });

    readonly dialogTitle = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Edit lead';
            case 'qualify':
                return 'Qualify lead';
            case 'disqualify':
                return 'Disqualify lead';
            case 'convert':
                return 'Convert lead';
            case 'delete':
                return 'Delete lead';
            default:
                return this.lead()?.contact.fullName ?? 'Lead';
        }
    });

    readonly dialogDescription = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Update stage, follow-up, and qualification notes.';
            case 'qualify':
                return 'Mark this lead as qualified for the pipeline.';
            case 'disqualify':
                return 'Record why this lead will not proceed.';
            case 'convert':
                return 'Promote to prospect or customer and optionally create a deal.';
            case 'delete':
                return 'This action cannot be undone.';
            default:
                return 'Lead pipeline details and lifecycle actions.';
        }
    });

    readonly footerVisible = computed(() => this.mode() !== 'view' || this.canManage());

    readonly submitLabel = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Save changes';
            case 'qualify':
                return 'Qualify';
            case 'disqualify':
                return 'Disqualify';
            case 'convert':
                return 'Convert';
            default:
                return 'Save';
        }
    });

    isOpen(stage: LeadStage): boolean {
        return !['CONVERTED', 'LOST'].includes(stage);
    }

    ngOnInit(): void {
        void this.loadLead();
    }

    async loadLead(): Promise<void> {
        this.isLoading.set(true);
        try {
            const [lead, history] = await Promise.all([
                this.leadService.getLeadById(this.data.leadId),
                this.leadService.getLeadHistory(this.data.leadId),
            ]);
            this.lead.set(lead);
            this.history.set(history);
            if (lead) {
                this.editForm.patchValue({
                    stage: lead.stage,
                    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
                    qualificationNotes: lead.qualificationNotes ?? '',
                });
            }
        } catch {
            this.toastService.error('Load failed', 'Could not load lead.');
        } finally {
            this.isLoading.set(false);
        }
    }

    setMode(mode: DialogMode): void {
        this.mode.set(mode);
    }

    cancelMode(): void {
        this.mode.set('view');
    }

    disqualifyError(): string | null {
        const control = this.disqualifyForm.controls.lostReason;
        if (!control.touched || control.value.trim()) return null;
        return 'Reason is required';
    }

    async scoreLead(): Promise<void> {
        const item = this.lead();
        if (!item || this.isSubmitting()) return;

        this.isSubmitting.set(true);
        try {
            const updated = await this.leadService.scoreLead(item.id);
            if (!updated) return;
            this.lead.set(updated);
            this.history.set(await this.leadService.getLeadHistory(item.id));
            this.toastService.success('Lead scored', `Score: ${updated.score}`);
        } catch {
            this.toastService.error('Score failed', 'Could not score lead.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async submitMode(): Promise<void> {
        const item = this.lead();
        if (!item || this.isSubmitting()) return;

        this.isSubmitting.set(true);
        try {
            switch (this.mode()) {
                case 'edit': {
                    const value = this.editForm.getRawValue();
                    const updated = await this.leadService.updateLead(item.id, {
                        stage: value.stage,
                        nextFollowUpAt: value.nextFollowUpAt,
                        qualificationNotes: value.qualificationNotes || null,
                    });
                    if (!updated) return;
                    this.lead.set(updated);
                    break;
                }
                case 'qualify': {
                    const notes = this.qualifyForm.controls.qualificationNotes.value;
                    const updated = await this.leadService.qualifyLead(item.id, notes || undefined);
                    if (!updated) return;
                    this.lead.set(updated);
                    break;
                }
                case 'disqualify': {
                    const reason = this.disqualifyForm.controls.lostReason.value.trim();
                    if (!reason) {
                        this.disqualifyForm.markAllAsTouched();
                        return;
                    }
                    const updated = await this.leadService.disqualifyLead(item.id, reason);
                    if (!updated) return;
                    this.lead.set(updated);
                    break;
                }
                case 'convert': {
                    const value = this.convertForm.getRawValue();
                    const payload: {
                        status: 'PROSPECT' | 'CUSTOMER';
                        deal?: { title: string; value: number };
                    } = { status: value.status };
                    if (value.createDeal && value.dealTitle.trim()) {
                        payload.deal = {
                            title: value.dealTitle.trim(),
                            value: Number(value.dealValue) || 0,
                        };
                    }
                    const result = await this.leadService.convertLead(item.id, payload);
                    if (!result) return;
                    this.lead.set(result.lead);
                    this.toastService.success('Lead converted', 'Contact updated successfully.');
                    this.dialogRef.close('updated');
                    return;
                }
            }

            this.history.set(await this.leadService.getLeadHistory(item.id));
            this.toastService.success('Lead updated', 'Changes saved.');
            this.mode.set('view');
            this.dialogRef.close('updated');
        } catch {
            this.toastService.error('Update failed', 'Could not update lead.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    async deleteLead(): Promise<void> {
        const item = this.lead();
        if (!item || this.isSubmitting()) return;

        this.isSubmitting.set(true);
        try {
            await this.leadService.deleteLead(item.id);
            this.toastService.success('Lead deleted', 'Lead was removed.');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Delete failed', 'Could not delete lead.');
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
