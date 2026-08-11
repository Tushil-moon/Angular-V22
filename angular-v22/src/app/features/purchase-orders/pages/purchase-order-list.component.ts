/**
 * Purchase orders — enterprise CRUD list backed by /purchase-orders
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
    catalogStatusVariant,
    codify,
    formatDate,
    formatDateTime,
    formatMoney,
    listTotalCount,
    orDash,
    titleCase,
} from '@features/shared/admin-list.util';
import { openRecordFormDialog, optionalValue } from '@features/shared/record-form-dialog.util';
import { SupplierApiService } from '@features/suppliers/services/supplier-api.service';
import { WarehouseApiService } from '@features/warehouses/services/warehouse-api.service';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { DialogService } from '@services/dialog.service';
import { AuthService } from '@services/index';
import {
    type EnterpriseListConfig,
    EnterpriseListShellComponent,
    type SelectOption,
    type WorkspaceKpi,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { forkJoin, map, type Observable, of, switchMap } from 'rxjs';

import type { PurchaseOrder } from '../models/purchase-order.model';
import { PurchaseOrderApiService } from '../services/purchase-order-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-purchase-order-list',
    imports: [EnterpriseListShellComponent],
    template: `
        <app-enterprise-list-shell
            listTitle="Purchase order list"
            [config]="config"
            [listFn]="listPurchaseOrders"
            [createFn]="createPurchaseOrder"
            [deleteFn]="deletePurchaseOrder"
            [kpis]="kpiCards()"
        />
    `,
})
export class PurchaseOrderListComponent {
    private readonly purchaseOrderApi = inject(PurchaseOrderApiService);
    private readonly supplierApi = inject(SupplierApiService);
    private readonly warehouseApi = inject(WarehouseApiService);
    private readonly dialog = inject(DialogService);
    private readonly auth = inject(AuthService);

    readonly config: EnterpriseListConfig<PurchaseOrder> = {
        title: 'Purchase Orders',
        description: 'Create and track replenishment orders sent to suppliers.',
        entityLabel: 'purchase order',
        managePermission: Permissions.ManagePurchaseOrders,
        statusTabs: [
            { label: 'All', value: 'ALL' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Ordered', value: 'ORDERED' },
            { label: 'Partially received', value: 'PARTIALLY_RECEIVED' },
            { label: 'Received', value: 'RECEIVED' },
            { label: 'Cancelled', value: 'CANCELLED' },
        ],
        columns: [
            { key: 'poNumber', label: 'PO number', cell: (item) => item.poNumber },
            {
                key: 'total',
                label: 'Total',
                cell: (item) => formatMoney(item.grandTotal, item.currencyCode),
                hideBelow: 'sm',
            },
            {
                key: 'expected',
                label: 'Expected',
                cell: (item) => formatDate(item.expectedAt),
                hideBelow: 'lg',
            },
            {
                key: 'ordered',
                label: 'Ordered',
                cell: (item) => formatDate(item.orderedAt),
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
        cardTitle: (item) => item.poNumber,
        cardSubtitle: (item) => formatMoney(item.grandTotal, item.currencyCode),
        detailStatus: (item) => ({
            text: titleCase(item.status),
            variant: catalogStatusVariant(item.status),
        }),
        detailFields: (item) => [
            { label: 'Subtotal', value: formatMoney(item.subtotal, item.currencyCode) },
            { label: 'Tax', value: formatMoney(item.taxTotal, item.currencyCode) },
            { label: 'Shipping', value: formatMoney(item.shippingTotal, item.currencyCode) },
            { label: 'Grand total', value: formatMoney(item.grandTotal, item.currencyCode) },
            { label: 'Ordered at', value: formatDateTime(item.orderedAt) },
            { label: 'Expected at', value: formatDateTime(item.expectedAt) },
            { label: 'Received at', value: formatDateTime(item.receivedAt) },
            { label: 'Note', value: orDash(item.note) },
            { label: 'Created', value: formatDateTime(item.createdAt) },
        ],
    };

    readonly summaryResource = rxResource({
        params: () => (this.auth.isAuthenticated() ? true : undefined),
        stream: ({ params }) => {
            if (!params) return of({ total: 0, draft: 0, ordered: 0, received: 0 });
            const count = (status?: string) =>
                listTotalCount((f) => this.purchaseOrderApi.list(f), status);
            return forkJoin({
                total: count(),
                draft: count('DRAFT'),
                ordered: count('ORDERED'),
                received: count('RECEIVED'),
            });
        },
    });

    readonly kpiCards = computed((): WorkspaceKpi[] => {
        const s = this.summaryResource.value() ?? { total: 0, draft: 0, ordered: 0, received: 0 };
        return [
            { label: 'Total POs', value: String(s.total), detail: 'All purchase orders', icon: 'clipboard-list' },
            { label: 'Draft', value: String(s.draft), detail: 'Not yet sent', icon: 'file-text' },
            { label: 'Ordered', value: String(s.ordered), detail: 'Awaiting receipt', icon: 'truck' },
            { label: 'Received', value: String(s.received), detail: 'Fully received', icon: 'check' },
        ];
    });

    readonly listPurchaseOrders = (
        filters: FilterOptions,
    ): Observable<PaginatedResponse<PurchaseOrder>> => this.purchaseOrderApi.list(filters);

    readonly createPurchaseOrder = (): Observable<PurchaseOrder | null> =>
        forkJoin({
            warehouses: this.warehouseApi.list({ pageSize: 100 }),
            suppliers: this.supplierApi.list({ pageSize: 100 }),
        }).pipe(
            map(({ warehouses, suppliers }) => ({
                warehouseOptions: warehouses.data.map(
                    (warehouse): SelectOption => ({
                        value: warehouse.id,
                        label: `${warehouse.name} (${warehouse.code})`,
                    }),
                ),
                supplierOptions: suppliers.data.map(
                    (supplier): SelectOption => ({ value: supplier.id, label: supplier.name }),
                ),
            })),
            switchMap(({ warehouseOptions, supplierOptions }) =>
                openRecordFormDialog(this.dialog, {
                    title: 'Create purchase order',
                    description: 'Pick the destination warehouse and the supplier to order from.',
                    submitLabel: 'Create purchase order',
                    fields: [
                        {
                            key: 'poNumber',
                            label: 'PO number',
                            required: true,
                            placeholder: 'PO-1001',
                        },
                        {
                            key: 'warehouseId',
                            label: 'Warehouse',
                            type: 'select',
                            required: true,
                            options: warehouseOptions,
                        },
                        {
                            key: 'supplierId',
                            label: 'Supplier',
                            type: 'select',
                            required: true,
                            options: supplierOptions,
                        },
                        { key: 'note', label: 'Note', type: 'textarea' },
                    ],
                }),
            ),
            switchMap((result) => {
                if (!result) return of(null);
                return this.purchaseOrderApi.create({
                    poNumber: result['poNumber'] || codify('PO', 12),
                    warehouseId: result['warehouseId'],
                    supplierId: result['supplierId'],
                    status: 'DRAFT',
                    note: optionalValue(result, 'note') ?? null,
                });
            }),
        );

    readonly deletePurchaseOrder = (id: string): Observable<void> =>
        this.purchaseOrderApi.delete(id);
}
