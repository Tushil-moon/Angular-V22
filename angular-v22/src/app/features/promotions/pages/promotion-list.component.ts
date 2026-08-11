/**
 * Promotion list — create with name, code, type, and value
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { listFilteredCount, listTotalCount } from '@features/shared/admin-list.util';
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

import { formatDateTime, orDash, titleCase } from '../../shared/format.util';
import type { Promotion, PromotionType } from '../models/promotion.model';
import { PromotionApiService } from '../services/promotion-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-promotion-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            [config]="config"
            [listFn]="listFn"
            [createFn]="createFn"
            [deleteFn]="deleteFn"
            [kpis]="kpiCards()"
            listTitle="Promotion list"
        />
    `,
})
export class PromotionListComponent {
    private readonly promotionApi = inject(PromotionApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Promotion> = {
        title: 'Promotions',
        description: 'Configure storefront promotions and discount campaigns',
        entityLabel: 'promotion',
        managePermission: Permissions.ManagePromotions,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Enabled', value: 'true', filterKey: 'enabled' },
            { label: 'Disabled', value: 'false', filterKey: 'enabled' },
        ],
        columns: [
            { key: 'name', label: 'Name', cell: (item) => item.name },
            { key: 'code', label: 'Code', cell: (item) => orDash(item.code), hideBelow: 'md' },
            { key: 'type', label: 'Type', cell: (item) => titleCase(item.type), hideBelow: 'sm' },
            { key: 'value', label: 'Value', cell: (item) => this.valueLabel(item) },
            {
                key: 'status',
                label: 'Status',
                cell: (item) => (item.enabled ? 'Enabled' : 'Disabled'),
                badge: (item) => ({
                    text: item.enabled ? 'Enabled' : 'Disabled',
                    variant: item.enabled ? 'success' : 'secondary',
                }),
            },
        ],
        cardTitle: (item) => item.name,
        cardSubtitle: (item) => titleCase(item.type),
        detailStatus: (item) => ({
            text: item.enabled ? 'Enabled' : 'Disabled',
            variant: item.enabled ? 'success' : 'secondary',
        }),
        detailFields: (item) => [
            { label: 'Code', value: orDash(item.code) },
            { label: 'Type', value: titleCase(item.type) },
            { label: 'Value', value: this.valueLabel(item) },
            { label: 'Redemptions', value: `${item.usageCount} / ${item.usageLimit ?? '∞'}` },
            { label: 'Starts', value: formatDateTime(item.startsAt) },
            { label: 'Ends', value: formatDateTime(item.endsAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, enabled: 0, disabled: 0 });
            const list = (f: FilterOptions) => this.promotionApi.list(f);
            return forkJoin({
                total: listTotalCount(list),
                enabled: listFilteredCount(list, { enabled: true }),
                disabled: listFilteredCount(list, { enabled: false }),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, enabled: 0, disabled: 0 };
        return [
            { label: 'Total promotions', value: String(s.total), detail: 'All campaigns', icon: 'megaphone' },
            { label: 'Enabled', value: String(s.enabled), detail: 'Live on storefront', icon: 'check' },
            { label: 'Disabled', value: String(s.disabled), detail: 'Not active', icon: 'file-text' },
        ];
    });

    readonly listFn = (filters: FilterOptions): Observable<PaginatedResponse<Promotion>> =>
        this.promotionApi.listForShell(filters);

    readonly createFn = (): Observable<Promotion | null> =>
        openRecordFormDialog(this.dialog, {
            title: 'New promotion',
            description: 'Set the discount type and value for this campaign.',
            submitLabel: 'Create promotion',
            fields: [
                {
                    key: 'name',
                    label: 'Name',
                    required: true,
                    placeholder: 'Spring sale',
                },
                {
                    key: 'code',
                    label: 'Code',
                    placeholder: 'SPRING10',
                    hint: 'Optional public code customers can enter',
                },
                {
                    key: 'type',
                    label: 'Type',
                    type: 'select',
                    required: true,
                    value: 'PERCENTAGE',
                    options: [
                        { value: 'PERCENTAGE', label: 'Percentage' },
                        { value: 'FIXED_AMOUNT', label: 'Fixed amount' },
                        { value: 'FREE_SHIPPING', label: 'Free shipping' },
                    ],
                },
                {
                    key: 'value',
                    label: 'Value',
                    type: 'number',
                    required: true,
                    value: '10',
                    placeholder: '10',
                    hint: 'Percent or currency amount depending on type',
                },
            ],
        }).pipe(
            switchMap((result) => {
                if (!result?.['name']) return of(null);
                const type = (optionalValue(result, 'type') as PromotionType) ?? 'PERCENTAGE';
                const value =
                    type === 'FREE_SHIPPING' ? 0 : (optionalNumber(result, 'value') ?? 10);
                return this.promotionApi.create({
                    name: result['name'],
                    code: optionalValue(result, 'code'),
                    type,
                    value,
                    enabled: true,
                });
            }),
        );

    readonly deleteFn = (id: string): Observable<void> => this.promotionApi.delete(id);

    private valueLabel(item: Promotion): string {
        if (item.type === 'PERCENTAGE') return `${item.value}%`;
        if (item.type === 'FREE_SHIPPING') return 'Free shipping';
        return String(item.value);
    }
}
