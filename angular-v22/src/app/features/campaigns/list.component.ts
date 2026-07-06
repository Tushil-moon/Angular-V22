import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Campaign } from '@models/enterprise.model';
import { CampaignService, DialogService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import { formatEnterpriseCurrency } from '../enterprise/enterprise-list.util';
import {
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-campaigns-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            [defaultView]="'cards'"
            listTitle="Campaign programs"
        />
    `,
})
export class CampaignsListComponent {
    private readonly campaignService = inject(CampaignService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<Campaign>>('shell');

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
            { label: 'Sent', value: String(c.sentCount ?? 0) },
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
            {
                key: 'sentCount',
                label: 'Sent',
                cell: (c) => String(c.sentCount ?? 0),
                hideBelow: 'lg',
            },
        ],
    };

    readonly listFn = (filters: Parameters<CampaignService['list']>[0]) =>
        this.campaignService.list(filters);

    readonly createFn = async () => {
        await this.openCampaignDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.campaignService.delete(id);

    readonly openDetailFn = (item: Campaign) => this.openCampaignDialog(item.id);

    private async openCampaignDialog(campaignId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./campaign-detail-dialog.component').CampaignDetailDialogComponent,
            import('./campaign-detail-dialog.component').CampaignDetailDialogData,
            import('./campaign-detail-dialog.component').CampaignDetailDialogResult
        >(
            () =>
                import('./campaign-detail-dialog.component').then(
                    (m) => m.CampaignDetailDialogComponent,
                ),
            { data: { campaignId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}
