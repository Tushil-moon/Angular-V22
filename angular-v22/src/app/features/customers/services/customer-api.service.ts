/**
 * Customer API — Observable client for /customers
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { toNumber } from '../../shared/format.util';
import { buildListParams, readFilter } from '../../shared/list-params.util';
import type {
    ApiCustomerAddressPayload,
    ApiCustomerDetailPayload,
    ApiCustomerOrderPayload,
    ApiCustomerPayload,
    CreateCustomerRequest,
    Customer,
    CustomerAddress,
    CustomerDetail,
    CustomerListFilters,
    CustomerOrderSummary,
    CustomerStatus,
} from '../models/customer.model';

export function mapApiCustomer(payload: ApiCustomerPayload): Customer {
    const firstName = payload.first_name ?? null;
    const lastName = payload.last_name ?? null;
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    return {
        id: payload.id,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        firstName,
        lastName,
        fullName: fullName || (payload.email ?? 'Unnamed customer'),
        status: (payload.status as CustomerStatus) ?? 'ACTIVE',
        acceptsMarketing: Boolean(payload.accepts_marketing),
        notes: payload.notes ?? null,
        totalOrders: payload.total_orders ?? 0,
        totalSpent: toNumber(payload.total_spent),
        averageOrderValue: toNumber(payload.average_order_value),
        lifetimeValue: toNumber(payload.lifetime_value),
        lastOrderAt: payload.last_order_at ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

function mapApiCustomerAddress(payload: ApiCustomerAddressPayload): CustomerAddress {
    return {
        id: payload.id,
        type: payload.type ?? 'SHIPPING',
        label: payload.label ?? null,
        name: [payload.first_name, payload.last_name].filter(Boolean).join(' '),
        addressLine1: payload.address_line1 ?? '',
        addressLine2: payload.address_line2 ?? null,
        city: payload.city ?? '',
        state: payload.state ?? null,
        postalCode: payload.postal_code ?? null,
        countryCode: payload.country_code ?? '',
        phone: payload.phone ?? null,
        isDefault: Boolean(payload.is_default),
    };
}

export function mapApiCustomerDetail(payload: ApiCustomerDetailPayload): CustomerDetail {
    return {
        ...mapApiCustomer(payload),
        addresses: (payload.addresses ?? []).map(mapApiCustomerAddress),
    };
}

export function mapApiCustomerOrder(payload: ApiCustomerOrderPayload): CustomerOrderSummary {
    return {
        id: payload.id,
        orderNumber: payload.order_number,
        status: payload.status ?? 'PENDING',
        grandTotal: toNumber(payload.grand_total),
        currencyCode: payload.currency_code ?? 'USD',
        placedAt: payload.placed_at ?? null,
        createdAt: payload.created_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class CustomerApiService {
    private readonly http = inject(HttpClientService);

    list(filters: CustomerListFilters = {}): Observable<PaginatedResponse<Customer>> {
        const params = buildListParams(filters, { status: filters.status || undefined });

        return this.http
            .get<ApiPaginatedPayload<ApiCustomerPayload>>('/customers', { params })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiCustomer)));
    }

    /** Adapter for `EnterpriseListShellComponent`, which passes generic filters. */
    listForShell(filters: FilterOptions): Observable<PaginatedResponse<Customer>> {
        return this.list({
            page: filters.page,
            pageSize: filters.pageSize,
            search: filters.search,
            status: readFilter(filters, 'status') as CustomerStatus | undefined,
        });
    }

    getById(id: string): Observable<CustomerDetail | null> {
        return this.http
            .get<ApiCustomerDetailPayload>(`/customers/${id}`)
            .pipe(map((response) => (response.data ? mapApiCustomerDetail(response.data) : null)));
    }

    listOrders(
        id: string,
        filters: { page?: number; pageSize?: number } = {},
    ): Observable<PaginatedResponse<CustomerOrderSummary>> {
        return this.http
            .get<ApiPaginatedPayload<ApiCustomerOrderPayload>>(`/customers/${id}/orders`, {
                params: buildListParams(filters),
            })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiCustomerOrder)));
    }

    create(payload: CreateCustomerRequest): Observable<Customer | null> {
        return this.http
            .post<ApiCustomerPayload>('/customers', {
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
                phone: payload.phone,
                status: 'ACTIVE',
            })
            .pipe(map((response) => (response.data ? mapApiCustomer(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/customers/${id}`).pipe(map(() => undefined));
    }
}
