/**
 * Coupon list — enterprise CRUD with proper create dialog fields
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { COUPON_STATUS_TABS, listTotalCount } from '@features/shared/admin-list.util';
import {
    openRecordFormDialog,
    optionalValue,
} from '@features/shared/record-form-dialog.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type BadgeVariant,
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { forkJoin, Observable, of, switchMap } from 'rxjs';

import { formatDateTime } from '../../shared/format.util';
import type { Coupon, CouponStatus } from '../models/coupon.model';
import { CouponApiService } from '../services/coupon-api.service';

function toCouponCode(value: string): string {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
}

function statusBadge(status: CouponStatus): { text: string; variant: BadgeVariant } {
    const variant: BadgeVariant =
        status === 'ACTIVE' ? 'success' : status === 'EXPIRED' ? 'destructive' : 'secondary';
    return { text: status, variant };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-coupon-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Coupon list"
        />
    `,
})
export class CouponListComponent {
    private readonly couponApi = inject(CouponApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Coupon> = {
        title: 'Coupons',
        description: 'Create discount codes and manage redemption rules',
        entityLabel: 'coupon',
        managePermission: Permissions.ManageCoupons,
        statusTabs: COUPON_STATUS_TABS,
        columns: [
            { key: 'code', label: 'Code', cell: (item) => item.code },
            {
                key: 'usage',
                label: 'Redemptions',
                cell: (item) => `${item.usageCount} / ${item.usageLimit ?? '∞'}`,
                hideBelow: 'sm',
            },
            {
                key: 'endsAt',
                label: 'Expires',
                cell: (item) => formatDateTime(item.endsAt),
                hideBelow: 'md',
            },
            {
                key: 'status',
                label: 'Status',
                cell: (item) => item.status,
                badge: (item) => statusBadge(item.status),
            },
        ],
        cardTitle: (item) => item.code,
        cardSubtitle: (item) => `${item.usageCount} redemptions`,
        detailStatus: (item) => statusBadge(item.status),
        detailFields: (item) => [
            { label: 'Redemptions', value: `${item.usageCount} / ${item.usageLimit ?? '∞'}` },
            { label: 'Per customer limit', value: String(item.perCustomerLimit ?? '∞') },
            { label: 'Starts', value: formatDateTime(item.startsAt) },
            { label: 'Ends', value: formatDateTime(item.endsAt) },
            { label: 'Created', value: formatDateTime(item.createdAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, active: 0, expired: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.couponApi.listForShell(f), status);
            return forkJoin({
                total: count(),
                active: count('ACTIVE'),
                expired: count('EXPIRED'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, active: 0, expired: 0 };
        return [
            { label: 'Total coupons', value: String(s.total), detail: 'All codes', icon: 'ticket' },
            { label: 'Active', value: String(s.active), detail: 'Redeemable now', icon: 'check' },
            { label: 'Expired', value: String(s.expired), detail: 'Past end date', icon: 'alert-circle' },
        ];
    });

    readonly listFn = (filters: FilterOptions): Observable<PaginatedResponse<Coupon>> =>
        this.couponApi.listForShell(filters);

    readonly createFn = (): Observable<Coupon | null> =>
        openRecordFormDialog(this.dialog, {
            title: 'New coupon',
            description: 'Issue a redeemable discount code for checkout.',
            submitLabel: 'Create coupon',
            fields: [
                {
                    key: 'code',
                    label: 'Coupon code',
                    required: true,
                    placeholder: 'SAVE20',
                    hint: 'Letters and numbers only; stored uppercase',
                },
                {
                    key: 'status',
                    label: 'Status',
                    type: 'select',
                    required: true,
                    value: 'ACTIVE',
                    options: [
                        { value: 'ACTIVE', label: 'Active' },
                        { value: 'INACTIVE', label: 'Inactive' },
                    ],
                },
            ],
        }).pipe(
            switchMap((result) => {
                const code = result ? toCouponCode(result['code'] ?? '') : '';
                if (!code) return of(null);
                return this.couponApi.create({
                    code,
                    status: (optionalValue(result!, 'status') as CouponStatus) ?? 'ACTIVE',
                });
            }),
        );

    readonly deleteFn = (id: string): Observable<void> => this.couponApi.delete(id);
}
