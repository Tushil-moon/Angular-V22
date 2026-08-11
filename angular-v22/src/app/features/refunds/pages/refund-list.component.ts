import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    catalogStatusVariant,
    formatDateTime,
    formatMoney,
    listTotalCount,
    orDash,
} from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { forkJoin, Observable, of } from 'rxjs';

import type { Refund } from '../models/refund.model';
import { RefundApiService } from '../services/refund-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-refund-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Refund list"
        />
    `,
})
export class RefundListComponent {
    private readonly api = inject(RefundApiService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Refund> = {
        title: 'Refunds',
        description: 'Process and audit customer refunds.',
        entityLabel: 'refund',
        managePermission: Permissions.ManageRefunds,
        hideCreate: true,
        hideDelete: true,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Requested', value: 'REQUESTED' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Rejected', value: 'REJECTED' },
        ],
        columns: [
            { key: 'order', label: 'Order', cell: (i) => i.orderNumber ?? i.orderId },
            { key: 'amount', label: 'Amount', cell: (i) => formatMoney(i.amount, i.currencyCode) },
            {
                key: 'status',
                label: 'Status',
                cell: (i) => i.status,
                badge: (i) => ({ text: i.status, variant: catalogStatusVariant(i.status) }),
            },
            {
                key: 'reason',
                label: 'Reason',
                cell: (i) => orDash(i.reason),
                hideBelow: 'md',
            },
            {
                key: 'created',
                label: 'Created',
                cell: (i) => formatDateTime(i.createdAt),
                hideBelow: 'lg',
            },
        ],
        cardTitle: (i) => i.orderNumber ?? i.id,
        cardSubtitle: (i) => formatMoney(i.amount, i.currencyCode),
        detailFields: (i) => [
            { label: 'Order', value: i.orderNumber ?? i.orderId },
            { label: 'Amount', value: formatMoney(i.amount, i.currencyCode) },
            { label: 'Reason', value: orDash(i.reason) },
            { label: 'Note', value: orDash(i.note) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, requested: 0, completed: 0 });
            const count = (status?: string) => listTotalCount((f) => this.api.list(f), status);
            return forkJoin({
                total: count(),
                requested: count('REQUESTED'),
                completed: count('COMPLETED'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, requested: 0, completed: 0 };
        return [
            { label: 'Total refunds', value: String(s.total), detail: 'All requests', icon: 'undo-2' },
            { label: 'Requested', value: String(s.requested), detail: 'Awaiting action', icon: 'activity' },
            { label: 'Completed', value: String(s.completed), detail: 'Fully processed', icon: 'check' },
        ];
    });

    readonly listFn = (f: FilterOptions): Observable<PaginatedResponse<Refund>> => this.api.list(f);
    readonly createFn = (): Observable<Refund | null> => of(null);
    readonly deleteFn = (): Observable<void> => this.api.delete();
}
