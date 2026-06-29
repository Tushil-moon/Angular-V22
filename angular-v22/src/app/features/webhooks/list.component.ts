import { Component, inject } from '@angular/core';
import type { Webhook } from '@models/enterprise.model';
import { WebhookService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import { formatEnterpriseBool } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-webhooks-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
        />
    `,
})
export class WebhooksListComponent {
    private readonly webhookService = inject(WebhookService);

    readonly config: EnterpriseListConfig<Webhook> = {
        title: 'Webhooks',
        description: 'Outbound event notifications',
        entityLabel: 'webhook',
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

    readonly listFn = (filters: Parameters<WebhookService['list']>[0]) =>
        this.webhookService.list(filters);

    readonly createFn = () =>
        this.webhookService.create({
            url: 'https://example.com/webhooks/crm',
            events: ['deal.created'],
            secret: 'changeme12345678',
        });

    readonly deleteFn = (id: string) => this.webhookService.delete(id);
}
