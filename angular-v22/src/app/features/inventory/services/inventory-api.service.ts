/**
 * Inventory API — Observable client for /inventory
 */

import { inject, Injectable } from '@angular/core';
import type { PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import {
    AdjustInventoryRequest,
    ApiInventoryItemPayload,
    InventoryItem,
    InventoryListFilters,
} from '../models/inventory.model';

export function mapApiInventoryItem(payload: ApiInventoryItemPayload): InventoryItem {
    return {
        id: payload.id,
        warehouseId: payload.warehouse_id,
        warehouseName: payload.warehouse?.name ?? '—',
        warehouseCode: payload.warehouse?.code ?? '',
        variantId: payload.variant_id,
        sku: payload.variant?.sku ?? '—',
        variantTitle: payload.variant?.title ?? '',
        productName: payload.variant?.product?.name ?? '—',
        onHand: payload.quantity_on_hand ?? 0,
        reserved: payload.quantity_reserved ?? 0,
        available: payload.quantity_available ?? 0,
        reorderPoint: payload.reorder_point ?? null,
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class InventoryApiService {
    private readonly http = inject(HttpClientService);

    list(filters: InventoryListFilters = {}): Observable<PaginatedResponse<InventoryItem>> {
        const params: Record<string, string | number | boolean | undefined> = {
            page: filters.page ?? 1,
            page_size: filters.pageSize ?? 10,
            search: filters.search?.trim() || undefined,
            warehouseId: filters.warehouseId || undefined,
        };

        return this.http
            .get<ApiPaginatedPayload<ApiInventoryItemPayload>>('/inventory', { params })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiInventoryItem)));
    }

    lowStock(filters: InventoryListFilters = {}): Observable<PaginatedResponse<InventoryItem>> {
        const params: Record<string, string | number | boolean | undefined> = {
            page: filters.page ?? 1,
            page_size: filters.pageSize ?? 10,
            warehouseId: filters.warehouseId || undefined,
        };

        return this.http
            .get<ApiPaginatedPayload<ApiInventoryItemPayload>>('/inventory/low-stock', { params })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiInventoryItem)));
    }

    adjust(payload: AdjustInventoryRequest): Observable<InventoryItem | null> {
        return this.http
            .post<ApiInventoryItemPayload>('/inventory/adjust', {
                warehouseId: payload.warehouseId,
                variantId: payload.variantId,
                quantityDelta: payload.quantityDelta,
                note: payload.note || undefined,
            })
            .pipe(map((response) => (response.data ? mapApiInventoryItem(response.data) : null)));
    }
}
