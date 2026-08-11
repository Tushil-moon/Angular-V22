/**
 * Payment API — read-only Observable client for /payments
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudGet, crudList } from '../../shared/crud-api.util';
import { toNumber } from '../../shared/format.util';
import { readFilter } from '../../shared/list-params.util';
import type { ApiPaymentPayload, Payment, PaymentStatus } from '../models/payment.model';

export function mapApiPayment(payload: ApiPaymentPayload): Payment {
    return {
        id: payload.id,
        orderId: payload.order_id ?? null,
        orderNumber: payload.order?.order_number ?? null,
        orderEmail: payload.order?.customer_email ?? null,
        providerId: payload.provider_id ?? null,
        status: (payload.status as PaymentStatus) ?? 'PENDING',
        amount: toNumber(payload.amount),
        currencyCode: payload.currency_code ?? 'USD',
        providerReference: payload.provider_reference ?? null,
        authorizedAt: payload.authorized_at ?? null,
        capturedAt: payload.captured_at ?? null,
        failedAt: payload.failed_at ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<Payment>> {
        return crudList(this.http, '/payments', mapApiPayment, filters, {
            status: readFilter(filters, 'status'),
            orderId: readFilter(filters, 'orderId'),
        });
    }

    getById(id: string): Observable<Payment | null> {
        return crudGet(this.http, `/payments/${id}`, mapApiPayment);
    }
}
