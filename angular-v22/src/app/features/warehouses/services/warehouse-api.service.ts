/**
 * Warehouse API — Observable client for /warehouses
 */

import { inject, Injectable } from '@angular/core';
import { buildListParams } from '@features/shared/admin-list.util';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import {
    ApiWarehousePayload,
    CreateWarehouseRequest,
    UpdateWarehouseRequest,
    Warehouse,
} from '../models/warehouse.model';

export function mapApiWarehouse(payload: ApiWarehousePayload): Warehouse {
    return {
        id: payload.id,
        name: payload.name,
        code: payload.code,
        isDefault: Boolean(payload.is_default),
        addressLine1: payload.address_line1 ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        postalCode: payload.postal_code ?? null,
        countryCode: payload.country_code ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class WarehouseApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<Warehouse>> {
        return this.http
            .get<ApiPaginatedPayload<ApiWarehousePayload>>('/warehouses', {
                params: buildListParams(filters),
            })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiWarehouse)));
    }

    getById(id: string): Observable<Warehouse | null> {
        return this.http
            .get<ApiWarehousePayload>(`/warehouses/${id}`)
            .pipe(map((response) => (response.data ? mapApiWarehouse(response.data) : null)));
    }

    create(payload: CreateWarehouseRequest): Observable<Warehouse | null> {
        return this.http
            .post<ApiWarehousePayload>('/warehouses', {
                name: payload.name,
                code: payload.code,
                isDefault: payload.isDefault ?? false,
            })
            .pipe(map((response) => (response.data ? mapApiWarehouse(response.data) : null)));
    }

    update(id: string, payload: UpdateWarehouseRequest): Observable<Warehouse | null> {
        return this.http
            .patch<ApiWarehousePayload>(`/warehouses/${id}`, payload)
            .pipe(map((response) => (response.data ? mapApiWarehouse(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/warehouses/${id}`).pipe(map(() => undefined));
    }
}
