import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Webhook } from '@models/enterprise.model';
import { DialogService, WebhookService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseBool } from '../enterprise/enterprise-list.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-webhooks-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
        />
    `,
})
export class WebhooksListComponent {
    private readonly webhookService = inject(WebhookService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<Webhook>>('shell');

    readonly config: EnterpriseListConfig<Webhook> = {
        title: 'Webhooks',
        description: 'Outbound event notifications',
        entityLabel: 'webhook',
        cardTitle: (w) => w.url,
        cardSubtitle: (w) => w.events.join(', ') || 'No events',
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'true' },
            { label: 'Inactive', value: 'false' },
        ],
        columns: [
            { key: 'url', label: 'URL', cell: (w) => w.url },
            {
                key: 'events',
                label: 'Events',
                cell: (w) => w.events.join(', ') || '—',
                hideBelow: 'md',
            },
            { key: 'active', label: 'Active', cell: (w) => formatEnterpriseBool(w.active) },
        ],
    };

    readonly listFn = (filters: Parameters<WebhookService['list']>[0]) => {
        const status = filters?.['status'];
        const active = status === 'true' ? true : status === 'false' ? false : undefined;
        return this.webhookService.list({ ...filters, active, status: undefined });
    };

    readonly createFn = async () => {
        await this.openWebhookDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.webhookService.delete(id);

    readonly openDetailFn = (item: Webhook) => this.openWebhookDialog(item.id);

    private async openWebhookDialog(webhookId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./webhook-detail-dialog.component').WebhookDetailDialogComponent,
            import('./webhook-detail-dialog.component').WebhookDetailDialogData,
            import('./webhook-detail-dialog.component').WebhookDetailDialogResult
        >(
            () =>
                import('./webhook-detail-dialog.component').then(
                    (m) => m.WebhookDetailDialogComponent,
                ),
            { data: { webhookId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}
