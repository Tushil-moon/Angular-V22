/**
 * Campaign Detail Dialog — members, templates, lifecycle, send
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Campaign, CampaignHistoryEntry } from '@models/enterprise.model';
import {
    CampaignService,
    ContactService,
    EmailTemplateService,
    PermissionService,
} from '@services/index';
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

import { formatEnterpriseCurrency, formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import { enterpriseStatusBadge, formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

export interface CampaignDetailDialogData {
    campaignId?: string;
}

export type CampaignDetailDialogResult = 'saved' | 'deleted' | 'updated';

const TYPE_OPTIONS: SelectOption[] = [
    { value: 'EMAIL', label: 'Email' },
    { value: 'EVENT', label: 'Event' },
];

const HISTORY_LABELS: Record<string, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    ACTIVATED: 'Activated',
    COMPLETED: 'Completed',
    MEMBER_ADDED: 'Members added',
    MEMBER_REMOVED: 'Member removed',
    SENT: 'Sent',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-campaign-detail-dialog',
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
            [title]="data.campaignId ? 'Campaign details' : 'New campaign'"
            description="Manage audience, email content, and campaign lifecycle."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="campaign-name" label="Name" formControlName="name" [required]="true" />
                        <app-select id="campaign-type" label="Type" formControlName="type" [options]="typeOptions" />
                    </div>
                    <app-textarea id="campaign-description" label="Description" formControlName="description" />
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="campaign-budget" label="Budget" type="number" formControlName="budget" />
                        <app-select
                            id="campaign-template"
                            label="Email template"
                            formControlName="emailTemplateId"
                            [options]="templateOptions()"
                            placeholder="Optional"
                        />
                    </div>

                    @if (campaign(); as item) {
                        <div class="flex flex-wrap gap-2 border-t border-border pt-4">
                            <app-badge [variant]="statusVariant(item.status)">{{
                                formatStatus(item.status)
                            }}</app-badge>
                            <app-badge variant="secondary">{{ formatStatus(item.type) }}</app-badge>
                        </div>

                        <dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <div>
                                <dt class="text-muted-foreground">Sent</dt>
                                <dd>{{ item.sentCount ?? 0 }}</dd>
                            </div>
                            <div>
                                <dt class="text-muted-foreground">Opened</dt>
                                <dd>{{ item.openedCount ?? 0 }}</dd>
                            </div>
                            <div>
                                <dt class="text-muted-foreground">Clicked</dt>
                                <dd>{{ item.clickedCount ?? 0 }}</dd>
                            </div>
                            <div>
                                <dt class="text-muted-foreground">Budget</dt>
                                <dd>{{ item.budget !== null && item.budget !== undefined ? formatCurrency(item.budget) : '—' }}</dd>
                            </div>
                        </dl>

                        <div class="space-y-2 border-t border-border pt-4">
                            <p class="text-sm font-medium">Audience ({{ item.members?.length ?? 0 }})</p>
                            @if (item.members?.length) {
                                @for (member of item.members; track member.id) {
                                    <div class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                        <div>
                                            <p>{{ member.contact?.fullName ?? 'Contact' }}</p>
                                            <p class="text-xs text-muted-foreground">
                                                {{ member.contact?.email ?? member.contactId }} ·
                                                {{ formatStatus(member.status) }}
                                            </p>
                                        </div>
                                        @if (canManage()) {
                                            <app-button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                [disabled]="submitting()"
                                                (clicked)="removeMember(member.contactId)"
                                            >
                                                Remove
                                            </app-button>
                                        }
                                    </div>
                                }
                            } @else {
                                <p class="text-sm text-muted-foreground">No members yet.</p>
                            }

                            @if (canManage()) {
                                <app-select
                                    id="campaign-add-contact"
                                    label="Add contact"
                                    formControlName="addContactId"
                                    [options]="contactOptions()"
                                    placeholder="Select contact"
                                />
                                <app-button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    [disabled]="submitting() || !form.controls.addContactId.value"
                                    (clicked)="addMember()"
                                >
                                    Add to campaign
                                </app-button>
                            }
                        </div>

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
                @if (campaign()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteCampaign()"
                    >
                        Delete
                    </app-button>
                    @if (campaign()?.status === 'DRAFT') {
                        <app-button
                            variant="secondary"
                            type="button"
                            [disabled]="submitting()"
                            (clicked)="activate()"
                        >
                            Activate
                        </app-button>
                    }
                    @if (campaign()?.status === 'ACTIVE') {
                        <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="send()">
                            Send batch
                        </app-button>
                        <app-button variant="outline" type="button" [disabled]="submitting()" (clicked)="complete()">
                            Complete
                        </app-button>
                    }
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save campaign
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class CampaignDetailDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly campaignService = inject(CampaignService);
    private readonly contactService = inject(ContactService);
    private readonly emailTemplateService = inject(EmailTemplateService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<CampaignDetailDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<CampaignDetailDialogResult>);

    readonly campaign = signal<Campaign | null>(null);
    readonly history = signal<CampaignHistoryEntry[]>([]);
    readonly templateOptions = signal<SelectOption[]>([]);
    readonly contactOptions = signal<SelectOption[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly typeOptions = TYPE_OPTIONS;
    readonly formatStatus = formatEnterpriseStatus;
    readonly formatDateTime = formatEnterpriseDate;
    readonly formatCurrency = formatEnterpriseCurrency;
    readonly statusVariant = enterpriseStatusBadge;

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageContacts),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        type: ['EMAIL'],
        budget: [''],
        emailTemplateId: [''],
        addContactId: [''],
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
            const [templates, contacts] = await Promise.all([
                this.emailTemplateService.list({ page: 1, pageSize: 100, active: true }),
                this.contactService.listContacts({ page: 1, pageSize: 100 }),
            ]);

            this.templateOptions.set(
                templates.data.map((t) => ({ value: t.id, label: `${t.name} — ${t.subject}` })),
            );

            const memberIds = new Set(this.campaign()?.members?.map((m) => m.contactId) ?? []);
            this.contactOptions.set(
                contacts.data
                    .filter((c) => !memberIds.has(c.id))
                    .map((c) => ({
                        value: c.id,
                        label: `${c.firstName} ${c.lastName}`.trim() || c.email || c.id,
                    })),
            );

            if (this.data.campaignId) {
                const [item, history] = await Promise.all([
                    this.campaignService.getById(this.data.campaignId),
                    this.campaignService.listHistory(this.data.campaignId),
                ]);
                this.campaign.set(item);
                this.history.set(history);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        description: item.description ?? '',
                        type: item.type,
                        budget: item.budget !== null && item.budget !== undefined ? String(item.budget) : '',
                        emailTemplateId: item.emailTemplateId ?? '',
                    });
                    const ids = new Set(item.members?.map((m) => m.contactId) ?? []);
                    this.contactOptions.set(
                        contacts.data
                            .filter((c) => !ids.has(c.id))
                            .map((c) => ({
                                value: c.id,
                                label: `${c.firstName} ${c.lastName}`.trim() || c.email || c.id,
                            })),
                    );
                }
            }
        } catch {
            this.toastService.error('Failed to load campaign');
        } finally {
            this.loading.set(false);
        }
    }

    private async refreshCampaign(): Promise<void> {
        const id = this.campaign()?.id ?? this.data.campaignId;
        if (!id) return;
        const [item, history] = await Promise.all([
            this.campaignService.getById(id),
            this.campaignService.listHistory(id),
        ]);
        this.campaign.set(item);
        this.history.set(history);
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            const payload: Record<string, unknown> = {
                name: raw.name,
                description: raw.description || null,
                type: raw.type,
                budget: raw.budget ? Number(raw.budget) : null,
                emailTemplateId: raw.emailTemplateId || null,
            };

            if (this.campaign()?.id) {
                await this.campaignService.update(this.campaign()!.id, payload);
                this.toastService.success('Campaign updated');
                await this.refreshCampaign();
                this.dialogRef.close('updated');
            } else {
                const created = await this.campaignService.create({
                    ...payload,
                    status: 'DRAFT',
                });
                this.campaign.set(created);
                this.toastService.success('Campaign created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save campaign');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteCampaign(): Promise<void> {
        const id = this.campaign()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.campaignService.delete(id);
            this.toastService.success('Campaign deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete campaign');
        } finally {
            this.submitting.set(false);
        }
    }

    async activate(): Promise<void> {
        const id = this.campaign()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.campaignService.activate(id);
            this.toastService.success('Campaign activated');
            await this.refreshCampaign();
            this.dialogRef.close('updated');
        } catch {
            this.toastService.error('Failed to activate campaign');
        } finally {
            this.submitting.set(false);
        }
    }

    async complete(): Promise<void> {
        const id = this.campaign()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.campaignService.complete(id);
            this.toastService.success('Campaign completed');
            await this.refreshCampaign();
            this.dialogRef.close('updated');
        } catch {
            this.toastService.error('Failed to complete campaign');
        } finally {
            this.submitting.set(false);
        }
    }

    async send(): Promise<void> {
        const id = this.campaign()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.campaignService.send(id);
            this.toastService.success('Campaign send queued');
            await this.refreshCampaign();
            this.dialogRef.close('updated');
        } catch {
            this.toastService.error('Failed to send campaign');
        } finally {
            this.submitting.set(false);
        }
    }

    async addMember(): Promise<void> {
        const id = this.campaign()?.id;
        const contactId = this.form.controls.addContactId.value;
        if (!id || !contactId) return;
        this.submitting.set(true);
        try {
            await this.campaignService.addMembers(id, [contactId]);
            this.form.controls.addContactId.setValue('');
            await this.refreshCampaign();
            this.toastService.success('Member added');
        } catch {
            this.toastService.error('Failed to add member');
        } finally {
            this.submitting.set(false);
        }
    }

    async removeMember(contactId: string): Promise<void> {
        const id = this.campaign()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.campaignService.removeMember(id, contactId);
            await this.refreshCampaign();
            this.toastService.success('Member removed');
        } catch {
            this.toastService.error('Failed to remove member');
        } finally {
            this.submitting.set(false);
        }
    }
}
