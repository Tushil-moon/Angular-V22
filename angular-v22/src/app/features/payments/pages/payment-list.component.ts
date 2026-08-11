/**
 * Transactions — Figma kit Transaction / payments screen
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    catalogStatusVariant,
    formatDateTime,
    formatMoney,
    listTotalCount,
    orDash,
    titleCase,
} from '@features/shared/admin-list.util';
import { noopDelete } from '@features/shared/crud-api.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { forkJoin, type Observable, of } from 'rxjs';

import type { Payment } from '../models/payment.model';
import { PaymentApiService } from '../services/payment-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-payment-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            listTitle="Transaction list"
            [config]="config"
            [listFn]="listPayments"
            [createFn]="createPayment"
            [deleteFn]="deletePayment"
            [kpis]="kpiCards()"
        />
    `,
})
export class PaymentListComponent {
    private readonly paymentApi = inject(PaymentApiService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Payment> = {
        title: 'Transactions',
        description: 'Payment authorizations, captures, and settlement status',
        entityLabel: 'transaction',
        managePermission: Permissions.ManagePayments,
        hideCreate: true,
        hideDelete: true,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Authorized', value: 'AUTHORIZED' },
            { label: 'Captured', value: 'CAPTURED' },
            { label: 'Failed', value: 'FAILED' },
            { label: 'Refunded', value: 'REFUNDED' },
        ],
        columns: [
            { key: 'order', label: 'Order', cell: (item) => orDash(item.orderNumber) },
            {
                key: 'amount',
                label: 'Amount',
                cell: (item) => formatMoney(item.amount, item.currencyCode),
            },
            { key: 'email', label: 'Customer', cell: (item) => orDash(item.orderEmail), hideBelow: 'lg' },
            {
                key: 'created',
                label: 'Created',
                cell: (item) => formatDateTime(item.createdAt),
                hideBelow: 'md',
            },
            {
                key: 'status',
                label: 'Status',
                cell: (item) => titleCase(item.status),
                badge: (item) => ({
                    text: titleCase(item.status),
                    variant: catalogStatusVariant(item.status),
                }),
            },
        ],
        cardTitle: (item) => orDash(item.orderNumber),
        cardSubtitle: (item) => formatMoney(item.amount, item.currencyCode),
        detailStatus: (item) => ({
            text: titleCase(item.status),
            variant: catalogStatusVariant(item.status),
        }),
        detailFields: (item) => [
            { label: 'Order', value: orDash(item.orderNumber) },
            { label: 'Customer', value: orDash(item.orderEmail) },
            { label: 'Amount', value: formatMoney(item.amount, item.currencyCode) },
            { label: 'Provider reference', value: orDash(item.providerReference) },
            { label: 'Authorized at', value: formatDateTime(item.authorizedAt) },
            { label: 'Captured at', value: formatDateTime(item.capturedAt) },
            { label: 'Failed at', value: formatDateTime(item.failedAt) },
            { label: 'Created', value: formatDateTime(item.createdAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, captured: 0, pending: 0, failed: 0 });
            const count = (status?: string) => listTotalCount((f) => this.paymentApi.list(f), status);
            return forkJoin({
                total: count(),
                captured: count('CAPTURED'),
                pending: count('PENDING'),
                failed: count('FAILED'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, captured: 0, pending: 0, failed: 0 };
        return [
            { label: 'Total transactions', value: String(s.total), detail: 'All payments', icon: 'credit-card' },
            { label: 'Captured', value: String(s.captured), detail: 'Settled successfully', icon: 'check' },
            { label: 'Pending', value: String(s.pending), detail: 'Awaiting capture', icon: 'activity' },
            { label: 'Failed', value: String(s.failed), detail: 'Needs attention', icon: 'alert-circle' },
        ];
    });

    readonly listPayments = (filters: FilterOptions): Observable<PaginatedResponse<Payment>> =>
        this.paymentApi.list(filters);

    readonly createPayment = (): Observable<Payment | null> => of(null);

    readonly deletePayment = (): Observable<void> => noopDelete();
}
