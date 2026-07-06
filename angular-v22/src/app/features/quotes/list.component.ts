import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Quote } from '@models/enterprise.model';
import { DialogService, QuoteService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
} from '@shared/components/enterprise-list-shell.component';

import {
    formatEnterpriseCurrency,
    formatEnterpriseDate,
} from '../enterprise/enterprise-list.util';
import {
    enterpriseStatusBadge,
    formatEnterpriseStatus,
} from '../enterprise/enterprise-ui.util';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-quotes-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            #shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [openDetailFn]="openDetailFn"
            listTitle="Proposals"
        />
    `,
})
export class QuotesListComponent {
    private readonly quoteService = inject(QuoteService);
    private readonly dialogService = inject(DialogService);
    private readonly shell = viewChild<EnterpriseListShellComponent<Quote>>('shell');

    readonly config: EnterpriseListConfig<Quote> = {
        title: 'Quotes',
        description: 'CPQ proposals with product catalog line items',
        entityLabel: 'quote',
        cardTitle: (q) => (q.quoteNumber ? `${q.quoteNumber} — ${q.title}` : q.title),
        cardSubtitle: (q) => formatEnterpriseCurrency(q.total, q.currency),
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Sent', value: 'SENT' },
            { label: 'Accepted', value: 'ACCEPTED' },
            { label: 'Rejected', value: 'REJECTED' },
        ],
        detailStatus: (q) => ({
            text: formatEnterpriseStatus(q.status),
            variant: enterpriseStatusBadge(q.status),
        }),
        detailFields: (q) => [
            { label: 'Quote #', value: q.quoteNumber ?? '—' },
            { label: 'Total', value: formatEnterpriseCurrency(q.total, q.currency) },
            { label: 'Valid until', value: formatEnterpriseDate(q.validUntil) },
            { label: 'Deal', value: q.deal?.title ?? '—' },
            { label: 'Contact', value: q.contact?.fullName ?? '—' },
            { label: 'Line items', value: String(q.lineItems?.length ?? 0) },
        ],
        columns: [
            {
                key: 'quoteNumber',
                label: 'Quote #',
                cell: (q) => q.quoteNumber ?? '—',
            },
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

    readonly createFn = async () => {
        await this.openQuoteDialog();
        return null;
    };

    readonly deleteFn = (id: string) => this.quoteService.delete(id);

    readonly openDetailFn = (item: Quote) => this.openQuoteDialog(item.id);

    private async openQuoteDialog(quoteId?: string): Promise<void> {
        const ref = await this.dialogService.openLazy<
            import('./quote-detail-dialog.component').QuoteDetailDialogComponent,
            import('./quote-detail-dialog.component').QuoteDetailDialogData,
            import('./quote-detail-dialog.component').QuoteDetailDialogResult
        >(
            () =>
                import('./quote-detail-dialog.component').then(
                    (m) => m.QuoteDetailDialogComponent,
                ),
            { data: { quoteId } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.shell()?.reload();
        });
    }
}
