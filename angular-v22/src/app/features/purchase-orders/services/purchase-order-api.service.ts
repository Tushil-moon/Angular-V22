/**
 * Purchase order API — Observable client for /purchase-orders
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudCreate, crudDelete, crudGet, crudList, crudPatch } from '../../shared/crud-api.util';
import { toNumber } from '../../shared/format.util';
import { readFilter } from '../../shared/list-params.util';
import type {
    ApiPurchaseOrderPayload,
    CreatePurchaseOrderRequest,
    PurchaseOrder,
    PurchaseOrderStatus,
    UpdatePurchaseOrderRequest,
} from '../models/purchase-order.model';

export function mapApiPurchaseOrder(payload: ApiPurchaseOrderPayload): PurchaseOrder {
    return {
        id: payload.id,
        poNumber: payload.po_number,
        warehouseId: payload.warehouse_id,
        supplierId: payload.supplier_id,
        status: (payload.status as PurchaseOrderStatus) ?? 'DRAFT',
        currencyCode: payload.currency_code ?? 'USD',
        subtotal: toNumber(payload.subtotal),
        taxTotal: toNumber(payload.tax_total),
        shippingTotal: toNumber(payload.shipping_total),
        grandTotal: toNumber(payload.grand_total),
        orderedAt: payload.ordered_at ?? null,
        expectedAt: payload.expected_at ?? null,
        receivedAt: payload.received_at ?? null,
        note: payload.note ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrderApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<PurchaseOrder>> {
        return crudList(this.http, '/purchase-orders', mapApiPurchaseOrder, filters, {
            status: readFilter(filters, 'status'),
        });
    }

    getById(id: string): Observable<PurchaseOrder | null> {
        return crudGet(this.http, `/purchase-orders/${id}`, mapApiPurchaseOrder);
    }

    create(payload: CreatePurchaseOrderRequest): Observable<PurchaseOrder | null> {
        return crudCreate(this.http, '/purchase-orders', payload, mapApiPurchaseOrder);
    }

    update(id: string, payload: UpdatePurchaseOrderRequest): Observable<PurchaseOrder | null> {
        return crudPatch(this.http, `/purchase-orders/${id}`, payload, mapApiPurchaseOrder);
    }

    delete(id: string): Observable<void> {
        return crudDelete(this.http, `/purchase-orders/${id}`);
    }
}
