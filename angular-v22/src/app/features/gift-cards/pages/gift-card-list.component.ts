/**
 * Gift cards — issue with code + balance
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    COUPON_STATUS_TABS,
    catalogStatusVariant,
    formatMoney,
    listTotalCount,
} from '@features/shared/admin-list.util';
import {
    openRecordFormDialog,
    optionalNumber,
    optionalValue,
} from '@features/shared/record-form-dialog.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { forkJoin, Observable, of, switchMap } from 'rxjs';

import type { GiftCard } from '../models/gift-card.model';
import { GiftCardApiService } from '../services/gift-card-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-gift-card-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Gift card list"
        />
    `,
})
export class GiftCardListComponent {
    private readonly api = inject(GiftCardApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<GiftCard> = {
        title: 'Gift Cards',
        description: 'Issue and manage gift card balances',
        entityLabel: 'gift card',
        managePermission: Permissions.ManageGiftCards,
        hideDelete: true,
        statusTabs: COUPON_STATUS_TABS,
        columns: [
            { key: 'code', label: 'Code', cell: (i) => i.code },
            {
                key: 'balance',
                label: 'Balance',
                cell: (i) => formatMoney(i.balance, i.currencyCode),
            },
            {
                key: 'initial',
                label: 'Initial',
                cell: (i) => formatMoney(i.initialBalance, i.currencyCode),
                hideBelow: 'md',
            },
            {
                key: 'status',
                label: 'Status',
                cell: (i) => i.status,
                badge: (i) => ({ text: i.status, variant: catalogStatusVariant(i.status) }),
            },
        ],
        cardTitle: (i) => i.code,
        cardSubtitle: (i) => formatMoney(i.balance, i.currencyCode),
        detailFields: (i) => [
            { label: 'Balance', value: formatMoney(i.balance, i.currencyCode) },
            { label: 'Initial', value: formatMoney(i.initialBalance, i.currencyCode) },
            { label: 'Status', value: i.status },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, active: 0 });
            const count = (status?: string) => listTotalCount((f) => this.api.list(f), status);
            return forkJoin({
                total: count(),
                active: count('ACTIVE'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, active: 0 };
        return [
            { label: 'Total gift cards', value: String(s.total), detail: 'All issued cards', icon: 'gift' },
            { label: 'Active', value: String(s.active), detail: 'Ready to redeem', icon: 'check' },
        ];
    });

    readonly listFn = (filters: FilterOptions): Observable<PaginatedResponse<GiftCard>> =>
        this.api.list(filters);

    readonly createFn = (): Observable<GiftCard | null> =>
        openRecordFormDialog(this.dialog, {
            title: 'Issue gift card',
            description: 'Create a gift card code with an opening balance.',
            submitLabel: 'Issue card',
            fields: [
                {
                    key: 'code',
                    label: 'Code',
                    required: true,
                    placeholder: 'GIFT-100',
                },
                {
                    key: 'initialBalance',
                    label: 'Initial balance',
                    type: 'number',
                    required: true,
                    value: '50',
                    placeholder: '50',
                },
                {
                    key: 'currencyCode',
                    label: 'Currency',
                    type: 'select',
                    required: true,
                    value: 'USD',
                    options: [
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                        { value: 'GBP', label: 'GBP' },
                        { value: 'INR', label: 'INR' },
                    ],
                },
            ],
        }).pipe(
            switchMap((result) => {
                const code = optionalValue(result ?? {}, 'code');
                const initialBalance = optionalNumber(result ?? {}, 'initialBalance');
                if (!code || initialBalance == null || initialBalance <= 0) return of(null);
                const currencyCode = optionalValue(result!, 'currencyCode') ?? 'USD';
                return this.api.create({
                    code,
                    initialBalance,
                    balance: initialBalance,
                    currencyCode,
                    status: 'ACTIVE',
                });
            }),
        );

    readonly deleteFn = (): Observable<void> => this.api.delete();
}
