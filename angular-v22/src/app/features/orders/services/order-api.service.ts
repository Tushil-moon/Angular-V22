/**
 * Order API — Observable client for /orders
 */

import { inject, Injectable } from '@angular/core';
import type { PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { toNumber } from '../../shared/format.util';
import { buildListParams } from '../../shared/list-params.util';
import type {
    ApiOrderAddressPayload,
    ApiOrderDetailPayload,
    ApiOrderItemPayload,
    ApiOrderListItemPayload,
    ApiOrderPayload,
    ApiOrderStatusHistoryPayload,
    Order,
    OrderAddress,
    OrderDetail,
    OrderItem,
    OrderListFilters,
    OrderPrimaryItem,
    OrderStatus,
    OrderStatusHistoryEntry,
} from '../models/order.model';

function mapPrimaryItem(payload: ApiOrderListItemPayload | undefined): OrderPrimaryItem | null {
    if (!payload?.product_name) return null;
    const image = payload.variant?.product?.images?.[0];
    return {
        productName: payload.product_name,
        variantTitle: payload.variant_title ?? null,
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt_text ?? null,
    };
}

export function mapApiOrder(payload: ApiOrderPayload): Order {
    return {
        id: payload.id,
        orderNumber: payload.order_number,
        status: (payload.status as OrderStatus) ?? 'PENDING',
        fulfillmentStatus: payload.fulfillment_status ?? 'UNFULFILLED',
        paymentStatus: payload.payment_status ?? 'PENDING',
        currencyCode: payload.currency_code ?? 'USD',
        subtotal: toNumber(payload.subtotal),
        discountTotal: toNumber(payload.discount_total),
        taxTotal: toNumber(payload.tax_total),
        shippingTotal: toNumber(payload.shipping_total),
        grandTotal: toNumber(payload.grand_total),
        amountRefunded: toNumber(payload.amount_refunded),
        customerId: payload.customer_id ?? null,
        customerEmail: payload.customer_email ?? '',
        customerPhone: payload.customer_phone ?? null,
        note: payload.note ?? null,
        placedAt: payload.placed_at ?? null,
        cancelledAt: payload.cancelled_at ?? null,
        completedAt: payload.completed_at ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
        primaryItem: mapPrimaryItem(payload.items?.[0]),
        itemCount: payload._count?.items ?? payload.items?.length ?? 0,
    };
}

function mapApiOrderItem(payload: ApiOrderItemPayload): OrderItem {
    return {
        id: payload.id,
        productName: payload.product_name ?? '',
        variantTitle: payload.variant_title ?? null,
        sku: payload.sku ?? null,
        quantity: payload.quantity ?? 0,
        unitPrice: toNumber(payload.unit_price),
        lineTotal: toNumber(payload.line_total),
    };
}

function mapApiOrderAddress(payload: ApiOrderAddressPayload): OrderAddress {
    const name = [payload.first_name, payload.last_name].filter(Boolean).join(' ');
    return {
        id: payload.id,
        type: payload.type ?? 'SHIPPING',
        name,
        addressLine1: payload.address_line1 ?? '',
        addressLine2: payload.address_line2 ?? null,
        city: payload.city ?? '',
        state: payload.state ?? null,
        postalCode: payload.postal_code ?? null,
        countryCode: payload.country_code ?? '',
        phone: payload.phone ?? null,
    };
}

function mapApiOrderStatusHistory(
    payload: ApiOrderStatusHistoryPayload,
): OrderStatusHistoryEntry {
    return {
        id: payload.id,
        fromStatus: payload.from_status ?? null,
        toStatus: payload.to_status ?? '',
        note: payload.note ?? null,
        createdAt: payload.created_at ?? '',
    };
}

export function mapApiOrderDetail(payload: ApiOrderDetailPayload): OrderDetail {
    return {
        ...mapApiOrder(payload),
        items: (payload.items ?? []).map(mapApiOrderItem),
        addresses: (payload.addresses ?? []).map(mapApiOrderAddress),
        statusHistory: (payload.status_history ?? []).map(mapApiOrderStatusHistory),
    };
}

@Injectable({
    providedIn: 'root',
})
export class OrderApiService {
    private readonly http = inject(HttpClientService);

    list(filters: OrderListFilters = {}): Observable<PaginatedResponse<Order>> {
        const params = buildListParams(filters, { status: filters.status || undefined });

        return this.http
            .get<ApiPaginatedPayload<ApiOrderPayload>>('/orders', { params })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiOrder)));
    }

    getById(id: string): Observable<OrderDetail | null> {
        return this.http
            .get<ApiOrderDetailPayload>(`/orders/${id}`)
            .pipe(map((response) => (response.data ? mapApiOrderDetail(response.data) : null)));
    }

    confirm(id: string): Observable<OrderDetail | null> {
        return this.runAction(id, 'confirm');
    }

    cancel(id: string): Observable<OrderDetail | null> {
        return this.runAction(id, 'cancel');
    }

    ship(id: string): Observable<OrderDetail | null> {
        return this.runAction(id, 'ship');
    }

    complete(id: string): Observable<OrderDetail | null> {
        return this.runAction(id, 'complete');
    }

    private runAction(
        id: string,
        action: 'confirm' | 'cancel' | 'ship' | 'complete',
    ): Observable<OrderDetail | null> {
        return this.http
            .post<ApiOrderDetailPayload>(`/orders/${id}/${action}`, {})
            .pipe(map((response) => (response.data ? mapApiOrderDetail(response.data) : null)));
    }
}
