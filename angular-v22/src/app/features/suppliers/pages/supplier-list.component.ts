/**
 * Suppliers — enterprise CRUD list backed by /suppliers
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    codify,
    formatDateTime,
    listTotalCount,
    openNameSlugDialog,
    orDash,
} from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { map, type Observable, of, switchMap } from 'rxjs';

import type { Supplier } from '../models/supplier.model';
import { SupplierApiService } from '../services/supplier-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-supplier-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            listTitle="Supplier list"
            [config]="config"
            [listFn]="listSuppliers"
            [createFn]="createSupplier"
            [deleteFn]="deleteSupplier"
            [kpis]="kpiCards()"
        />
    `,
})
export class SupplierListComponent {
    private readonly supplierApi = inject(SupplierApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<Supplier> = {
        title: 'Suppliers',
        description: 'Maintain supplier contacts, codes and purchasing terms.',
        entityLabel: 'supplier',
        managePermission: Permissions.ManageSuppliers,
        columns: [
            { key: 'name', label: 'Name', cell: (item) => item.name },
            { key: 'code', label: 'Code', cell: (item) => orDash(item.code), hideBelow: 'md' },
            { key: 'contact', label: 'Contact', cell: (item) => orDash(item.contactName), hideBelow: 'lg' },
            { key: 'email', label: 'Email', cell: (item) => orDash(item.email), hideBelow: 'sm' },
        ],
        cardTitle: (item) => item.name,
        cardSubtitle: (item) => orDash(item.email),
        detailFields: (item) => [
            { label: 'Code', value: orDash(item.code) },
            { label: 'Contact', value: orDash(item.contactName) },
            { label: 'Email', value: orDash(item.email) },
            { label: 'Phone', value: orDash(item.phone) },
            { label: 'Website', value: orDash(item.website) },
            { label: 'Notes', value: orDash(item.notes) },
            { label: 'Created', value: formatDateTime(item.createdAt) },
            { label: 'Updated', value: formatDateTime(item.updatedAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0 });
            return listTotalCount((f) => this.supplierApi.list(f)).pipe(map((total) => ({ total })));
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0 };
        return [
            { label: 'Total suppliers', value: String(s.total), detail: 'Vendor accounts', icon: 'truck' },
        ];
    });

    readonly listSuppliers = (filters: FilterOptions): Observable<PaginatedResponse<Supplier>> =>
        this.supplierApi.list(filters);

    readonly createSupplier = (): Observable<Supplier | null> =>
        openNameSlugDialog(this.dialog, {
            title: 'Create supplier',
            submitLabel: 'Create supplier',
            showSlug: false,
            showCode: true,
            codeLabel: 'Supplier code',
        }).pipe(
            switchMap((result) =>
                result
                    ? this.supplierApi.create({
                          name: result.name,
                          code: result.code || codify(result.name),
                      })
                    : of(null),
            ),
        );

    readonly deleteSupplier = (id: string): Observable<void> => this.supplierApi.delete(id);
}
