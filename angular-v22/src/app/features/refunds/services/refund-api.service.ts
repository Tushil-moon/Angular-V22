import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { toNumber } from '../../shared/format.util';
import { crudGet, crudList, crudPatch, noopDelete } from '../../shared/crud-api.util';
import { readFilter } from '../../shared/list-params.util';
import type { ApiRefundPayload, Refund, RefundStatus } from '../models/refund.model';

export function mapApiRefund(payload: ApiRefundPayload): Refund {
    return {
        id: payload.id,
        orderId: payload.order_id ?? payload.order?.id ?? '',
        orderNumber: payload.order?.order_number ?? null,
        status: (payload.status as RefundStatus) ?? 'REQUESTED',
        amount: toNumber(payload.amount),
        currencyCode: payload.currency_code ?? 'USD',
        reason: payload.reason ?? null,
        note: payload.note ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class RefundApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<Refund>> {
        return crudList(this.http, '/refunds', mapApiRefund, filters, {
            status: readFilter(filters, 'status'),
        });
    }

    getById(id: string): Observable<Refund | null> {
        return crudGet(this.http, `/refunds/${id}`, mapApiRefund);
    }

    updateStatus(id: string, status: RefundStatus): Observable<Refund | null> {
        return crudPatch(this.http, `/refunds/${id}`, { status }, mapApiRefund);
    }

    delete = noopDelete;
}
