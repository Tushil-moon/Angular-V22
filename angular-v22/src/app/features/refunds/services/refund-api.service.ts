import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { toNumber } from '../../shared/format.util';
import { crudCreate, crudGet, crudList, crudPatch, noopDelete } from '../../shared/crud-api.util';
import { readFilter } from '../../shared/list-params.util';
import type {
    ApiRefundItemPayload,
    ApiRefundPayload,
    CreateRefundRequest,
    Refund,
    RefundItem,
    RefundListFilters,
    RefundStatus,
    UpdateRefundRequest,
} from '../models/refund.model';

function mapApiRefundItem(payload: ApiRefundItemPayload): RefundItem {
    return {
        id: payload.id,
        orderItemId: payload.order_item_id ?? '',
        quantity: payload.quantity ?? 0,
        amount: toNumber(payload.amount),
        restock: Boolean(payload.restock),
        productName: payload.order_item?.product_name ?? null,
        sku: payload.order_item?.sku ?? null,
    };
}

export function mapApiRefund(payload: ApiRefundPayload): Refund {
    return {
        id: payload.id,
        orderId: payload.order_id ?? payload.order?.id ?? '',
        orderNumber: payload.order?.order_number ?? null,
        paymentId: payload.payment_id ?? payload.payment?.id ?? null,
        status: (payload.status as RefundStatus) ?? 'REQUESTED',
        amount: toNumber(payload.amount),
        currencyCode: payload.currency_code ?? payload.order?.currency_code ?? 'USD',
        reason: payload.reason ?? null,
        note: payload.note ?? null,
        processedAt: payload.processed_at ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
        items: (payload.items ?? []).map(mapApiRefundItem),
    };
}

@Injectable({ providedIn: 'root' })
export class RefundApiService {
    private readonly http = inject(HttpClientService);

    list(filters: RefundListFilters = {}): Observable<PaginatedResponse<Refund>> {
        return crudList(
            this.http,
            '/refunds',
            mapApiRefund,
            filters as FilterOptions,
            {
                status: readFilter(filters as FilterOptions, 'status') ?? filters.status,
                orderId: filters.orderId || undefined,
            },
        );
    }

    getById(id: string): Observable<Refund | null> {
        return crudGet(this.http, `/refunds/${id}`, mapApiRefund);
    }

    create(payload: CreateRefundRequest): Observable<Refund | null> {
        return crudCreate(this.http, '/refunds', payload, mapApiRefund);
    }

    updateStatus(id: string, payload: UpdateRefundRequest): Observable<Refund | null> {
        return crudPatch(this.http, `/refunds/${id}`, payload, mapApiRefund);
    }

    delete = noopDelete;
}
