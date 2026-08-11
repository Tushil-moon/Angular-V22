/**
 * Warehouse list — enterprise shell CRUD over /warehouses
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { codify, formatDateTime, listTotalCount, openNameSlugDialog } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { map, Observable, of, switchMap } from 'rxjs';

import type { Warehouse } from '../models/warehouse.model';
import { WarehouseApiService } from '../services/warehouse-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-warehouse-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            listTitle="Warehouse list"
            [config]="config"
            [listFn]="listWarehouses"
            [createFn]="createWarehouse"
            [deleteFn]="deleteWarehouse"
            [kpis]="kpiCards()"
        />
    `,
})
export class WarehouseListComponent {
    private readonly warehouseApi = inject(WarehouseApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Warehouse> = {
        title: 'Warehouses',
        description: 'Stocking locations that fulfil your orders.',
        entityLabel: 'warehouse',
        managePermission: Permissions.ManageWarehouses,
        columns: [
            { key: 'name', label: 'Name', cell: (item) => item.name },
            { key: 'code', label: 'Code', cell: (item) => item.code, hideBelow: 'sm' },
            { key: 'city', label: 'City', cell: (item) => item.city ?? '—', hideBelow: 'lg' },
            {
                key: 'isDefault',
                label: 'Default',
                cell: (item) => (item.isDefault ? 'Default' : '—'),
                badge: (item) =>
                    item.isDefault
                        ? { text: 'Default', variant: 'success' }
                        : { text: 'Secondary', variant: 'outline' },
            },
        ],
        cardTitle: (item) => item.name,
        cardSubtitle: (item) => item.code,
        detailFields: (item) => [
            { label: 'Code', value: item.code },
            { label: 'Default', value: item.isDefault ? 'Yes' : 'No' },
            { label: 'Address', value: item.addressLine1 ?? '—' },
            {
                label: 'Location',
                value: [item.city, item.state, item.countryCode].filter(Boolean).join(', ') || '—',
            },
            { label: 'Postal code', value: item.postalCode ?? '—' },
            { label: 'Created', value: formatDateTime(item.createdAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0 });
            return listTotalCount((f) => this.warehouseApi.list(f)).pipe(map((total) => ({ total })));
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0 };
        return [
            { label: 'Total warehouses', value: String(s.total), detail: 'Stocking locations', icon: 'warehouse' },
        ];
    });

    readonly listWarehouses = (filters: FilterOptions): Observable<PaginatedResponse<Warehouse>> =>
        this.warehouseApi.list(filters);

    readonly createWarehouse = (): Observable<Warehouse | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'Create warehouse',
            submitLabel: 'Create warehouse',
            showSlug: false,
            showCode: true,
            codeLabel: 'Code',
        }).pipe(
            switchMap((result) =>
                result
                    ? this.warehouseApi.create({
                          name: result.name,
                          code: result.code || codify(result.name),
                      })
                    : of(null),
            ),
        );

    readonly deleteWarehouse = (id: string): Observable<void> => this.warehouseApi.delete(id);
}
