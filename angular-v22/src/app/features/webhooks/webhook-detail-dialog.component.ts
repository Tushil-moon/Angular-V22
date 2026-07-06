/**
 * Webhook Detail Dialog — events, delivery log, test ping
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Webhook, WebhookDelivery } from '@models/enterprise.model';
import { PermissionService, WebhookService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

export interface WebhookDetailDialogData {
    webhookId?: string;
}

export type WebhookDetailDialogResult = 'saved' | 'deleted' | 'updated';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-webhook-detail-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        TextareaComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="data.webhookId ? 'Webhook details' : 'New webhook'"
            description="Deliver CRM events to external systems with signed payloads."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="webhook-url" label="Endpoint URL" formControlName="url" [required]="true" />
                    <app-textarea
                        id="webhook-events"
                        label="Events (comma-separated)"
                        formControlName="eventsText"
                        [required]="true"
                    />
                    <app-input
                        id="webhook-secret"
                        label="Signing secret"
                        formControlName="secret"
                        placeholder="Min 8 characters"
                    />

                    @if (webhook(); as item) {
                        <div class="flex flex-wrap gap-2 border-t border-border pt-4">
                            <app-badge [variant]="item.active ? 'default' : 'secondary'">
                                {{ item.active ? 'Active' : 'Inactive' }}
                            </app-badge>
                        </div>

                        @if (deliveries().length) {
                            <div class="space-y-2 border-t border-border pt-4">
                                <p class="text-sm font-medium">Recent deliveries</p>
                                @for (delivery of deliveries(); track delivery.id) {
                                    <div class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                        <div>
                                            <p>{{ delivery.event }} · {{ formatStatus(delivery.status) }}</p>
                                            <p class="text-xs text-muted-foreground">
                                                {{ formatDate(delivery.createdAt) }}
                                                @if (delivery.responseStatus !== null && delivery.responseStatus !== undefined) {
                                                    · HTTP {{ delivery.responseStatus }}
                                                }
                                            </p>
                                        </div>
                                        @if (canManage() && delivery.status === 'FAILED') {
                                            <app-button
                                                variant="outline"
                                                size="sm"
                                                type="button"
                                                [disabled]="submitting()"
                                                (clicked)="retry(delivery.id)"
                                            >
                                                Retry
                                            </app-button>
                                        }
                                    </div>
                                }
                            </div>
                        }
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (webhook()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteWebhook()"
                    >
                        Delete
                    </app-button>
                    <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="testPing()">
                        Send test
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save webhook
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class WebhookDetailDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly webhookService = inject(WebhookService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<WebhookDetailDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<WebhookDetailDialogResult>);

    readonly webhook = signal<Webhook | null>(null);
    readonly deliveries = signal<WebhookDelivery[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly formatStatus = formatEnterpriseStatus;
    readonly formatDate = formatEnterpriseDate;

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly form = this.fb.group({
        url: ['', Validators.required],
        eventsText: ['lead.created', Validators.required],
        secret: [''],
    });

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    private parseEvents(text: string): string[] {
        return text
            .split(',')
            .map((event) => event.trim())
            .filter(Boolean);
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.data.webhookId) {
                const [item, deliveries] = await Promise.all([
                    this.webhookService.getById(this.data.webhookId),
                    this.webhookService.listDeliveries(this.data.webhookId, { page: 1, pageSize: 10 }),
                ]);
                this.webhook.set(item);
                this.deliveries.set(deliveries.data);
                if (item) {
                    this.form.patchValue({
                        url: item.url,
                        eventsText: item.events.join(', '),
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load webhook');
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            const events = this.parseEvents(raw.eventsText);
            const payload: Record<string, unknown> = {
                url: raw.url,
                events,
                active: true,
            };
            if (raw.secret) payload['secret'] = raw.secret;

            if (this.webhook()?.id) {
                await this.webhookService.update(this.webhook()!.id, payload);
                this.toastService.success('Webhook updated');
                this.dialogRef.close('updated');
            } else {
                if (!raw.secret) {
                    payload['secret'] = 'changeme12345678';
                }
                await this.webhookService.create(payload);
                this.toastService.success('Webhook created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save webhook');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteWebhook(): Promise<void> {
        const id = this.webhook()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.webhookService.delete(id);
            this.toastService.success('Webhook deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete webhook');
        } finally {
            this.submitting.set(false);
        }
    }

    async testPing(): Promise<void> {
        const id = this.webhook()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.webhookService.test(id);
            this.toastService.success('Test delivery queued');
            const deliveries = await this.webhookService.listDeliveries(id, { page: 1, pageSize: 10 });
            this.deliveries.set(deliveries.data);
        } catch {
            this.toastService.error('Failed to send test');
        } finally {
            this.submitting.set(false);
        }
    }

    async retry(deliveryId: string): Promise<void> {
        const id = this.webhook()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.webhookService.retryDelivery(id, deliveryId);
            this.toastService.success('Retry queued');
            const deliveries = await this.webhookService.listDeliveries(id, { page: 1, pageSize: 10 });
            this.deliveries.set(deliveries.data);
        } catch {
            this.toastService.error('Failed to retry delivery');
        } finally {
            this.submitting.set(false);
        }
    }
}
