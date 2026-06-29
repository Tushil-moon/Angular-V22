import { Component, inject } from '@angular/core';
import type { Campaign } from '@models/enterprise.model';
import { CampaignService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import {
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';
import { formatEnterpriseCurrency } from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-campaigns-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [defaultView]="'cards'"
            listTitle="Campaign programs"
        />
    `,
})
export class CampaignsListComponent {
    private readonly campaignService = inject(CampaignService);

    readonly config: EnterpriseListConfig<Campaign> = {
        title: 'Campaigns',
        description: 'Email, event, and nurture marketing programs',
        entityLabel: 'campaign',
        cardTitle: (c) => c.name,
        cardSubtitle: (c) =>
            `${formatEnterpriseStatus(c.type)} · ${c.budget != null ? formatEnterpriseCurrency(c.budget) : 'No budget'}`,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Completed', value: 'COMPLETED' },
        ],
        detailStatus: (c) => ({
            text: formatEnterpriseStatus(c.status),
            variant: enterpriseStatusBadge(c.status),
        }),
        detailFields: (c) => [
            { label: 'Type', value: formatEnterpriseStatus(c.type) },
            {
                label: 'Budget',
                value: c.budget != null ? formatEnterpriseCurrency(c.budget) : '—',
            },
        ],
        columns: [
            { key: 'name', label: 'Name', cell: (c) => c.name },
            { key: 'type', label: 'Type', cell: (c) => formatEnterpriseStatus(c.type) },
            {
                key: 'status',
                label: 'Status',
                cell: (c) => formatEnterpriseStatus(c.status),
                badge: (c) => ({
                    text: formatEnterpriseStatus(c.status),
                    variant: enterpriseStatusBadge(c.status),
                }),
            },
            {
                key: 'budget',
                label: 'Budget',
                cell: (c) => (c.budget != null ? formatEnterpriseCurrency(c.budget) : '—'),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<CampaignService['list']>[0]) =>
        this.campaignService.list(filters);

    readonly createFn = () =>
        this.campaignService.create({
            name: `Campaign ${new Date().toLocaleDateString()}`,
            type: 'EMAIL',
            status: 'DRAFT',
        });

    readonly deleteFn = (id: string) => this.campaignService.delete(id);
}
