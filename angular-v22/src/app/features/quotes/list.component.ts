import { Component, inject } from '@angular/core';
import type { Quote } from '@models/enterprise.model';
import { QuoteService } from '@services/index';
import {
    EnterpriseListShellComponent,
    type EnterpriseListConfig,
} from '@shared/components/enterprise-list-shell.component';
import {
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';
import {
    formatEnterpriseCurrency,
    formatEnterpriseDate,
} from '../enterprise/enterprise-list.util';

@Component({
    selector: 'app-quotes-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            listTitle="Proposals"
        />
    `,
})
export class QuotesListComponent {
    private readonly quoteService = inject(QuoteService);

    readonly config: EnterpriseListConfig<Quote> = {
        title: 'Quotes',
        description: 'CPQ proposals linked to deals',
        entityLabel: 'quote',
        cardTitle: (q) => q.title,
        cardSubtitle: (q) => formatEnterpriseCurrency(q.total, q.currency),
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Sent', value: 'SENT' },
            { label: 'Accepted', value: 'ACCEPTED' },
        ],
        detailStatus: (q) => ({
            text: formatEnterpriseStatus(q.status),
            variant: enterpriseStatusBadge(q.status),
        }),
        detailFields: (q) => [
            { label: 'Total', value: formatEnterpriseCurrency(q.total, q.currency) },
            { label: 'Valid until', value: formatEnterpriseDate(q.validUntil) },
            { label: 'Deal', value: q.dealId ?? '—' },
        ],
        columns: [
            { key: 'title', label: 'Title', cell: (q) => q.title },
            {
                key: 'status',
                label: 'Status',
                cell: (q) => formatEnterpriseStatus(q.status),
                badge: (q) => ({
                    text: formatEnterpriseStatus(q.status),
                    variant: enterpriseStatusBadge(q.status),
                }),
            },
            {
                key: 'total',
                label: 'Total',
                cell: (q) => formatEnterpriseCurrency(q.total, q.currency),
            },
            {
                key: 'validUntil',
                label: 'Valid until',
                cell: (q) => formatEnterpriseDate(q.validUntil),
                hideBelow: 'md',
            },
        ],
    };

    readonly listFn = (filters: Parameters<QuoteService['list']>[0]) => this.quoteService.list(filters);

    readonly createFn = () =>
        this.quoteService.create({
            title: `Quote ${new Date().toLocaleDateString()}`,
            total: 0,
            currency: 'USD',
            status: 'DRAFT',
        });

    readonly deleteFn = (id: string) => this.quoteService.delete(id);
}
